// 투영 오케스트레이션(설계 §2 ④, §5) — 캐논(AI 생성, base_gear 어휘) → 기기 signal_chain 결정적 변환.
// ToneProjector는 순수 스크립트(AI 없음): 캐논 + processors.effects_catalog(base_gear 역인덱스) → role별 signal_chain.
// 순수 코어(projectChain, deriveOutputTarget)와 DB 래퍼(projectSong)를 분리 — 코어는 목 없이 테스트 가능.
// 미매핑(base_gear ↔ base_gear 룩업 실패)은 자동 수리 없음(헌법 "생성 품질 게이트") — 어드민이 gear KB 보완.

import type { GateIssue } from "./gate";
import type { CanonRole } from "./canon-draft";
import { projectCanonDraft } from "./project-draft";
import type { CanonBlock } from "./types";
import type { CatalogEntry } from "../parser/catalog";
import { slugify } from "../data/slugify";
import { sbInsert, sbSelect } from "../supabase/rest";
import type { Block } from "../types";

export const PROJECTOR_VERSION = "1";

// 기능 모듈 타입(미매핑 시 디폴트 폴백 대상). 톤 정체성 모듈은 제외.
const FUNCTIONAL_TYPES = new Set(["NR", "EQ", "DLY", "RVB", "VOL"]);

export interface ProjectOutcome {
  ok: boolean;
  unmapped?: Array<{ name: string; category?: string; blockIndex: number }>;
  notes?: string;
}

export interface ProjectRoleOutcome {
  role: CanonRole | "real_amp" | "phone";
  status: "persisted" | "null" | "skipped";
  /** status="skipped" 일 때 게이트 이슈. */
  issues?: GateIssue[];
}

export interface ProjectResult {
  songId: string;
  roles: ProjectRoleOutcome[];
}

export interface ProjectorDeps {
  /** 테스트·대체 조회 주입(기본 sbSelect). */
  select?: typeof sbSelect;
  /** 테스트·대체 삽입 주입(기본 sbInsert). */
  insert?: typeof sbInsert;
}


// 캐탈로그 엔트리들로부터 역인덱스 빌드 — base_gear 이름 → 매핑 엔트리 목록.
// ReverseIndex는 삽입 순서 보존 (문서 순서)을 위해 keys 배열 포함.
export interface ReverseIndex {
  /** base_gear slug(slugify 규칙) → 그 base_gear를 가진 CatalogEntry[]. 문서 순서 보존. */
  readonly entries: Readonly<Record<string, CatalogEntry[]>>;
  /** entries 키들의 삽입 순서(문서 순서). Record 순회가 삽입순 보존을 못할 수 있으므로 명시. */
  readonly keys: readonly string[];
  /** 기능 모듈 디폴트 폴백(예: DLY/"Digital Delay S", RVB/"Room"). */
  readonly defaults?: Readonly<Partial<Record<string, string>>>;
}

export function buildReverseIndex(entries: CatalogEntry[]): ReverseIndex {
  const idx: Record<string, CatalogEntry[]> = {};
  const keys: string[] = [];
  for (const entry of entries) {
    if (!entry.base_gear) continue; // base_gear 없으면 역인덱스 대상 아님.
    const key = slugify(entry.base_gear);
    if (!idx[key]) {
      idx[key] = [];
      keys.push(key);
    }
    idx[key]!.push(entry);
  }
  return { entries: idx, keys };
}

// 2단 룩업: 정확 일치 실패 시 경계 포함 매칭(q === e || e.startsWith(q+"-") || e.endsWith("-"+q) || q.startsWith(e+"-") || q.endsWith("-"+e)).
// kind 필터링은 두 단 모두 적용. 2단 매칭 성공 시 notes에 기록.
export function matchEntries(
  querySlug: string,
  index: ReverseIndex,
  expectedKind: "amp" | "cab" | "effect",
): {
  entries: CatalogEntry[];
  approximateMatch: boolean;
} {
  // 1단: 정확 일치
  const exact = index.entries[querySlug];
  if (exact) {
    const filtered = exact.filter((e) => e.kind === expectedKind);
    if (filtered.length > 0) return { entries: filtered, approximateMatch: false };
  }

  // 2단: 경계 포함 매칭 (정확 후보 0일 때만)
  // 접미 방향은 다토큰 쿼리에만 허용 — 단일 제네릭 토큰("reverb"/"delay"/"chorus")이
  // "…-reverb"로 끝나는 온갖 실기에 붙는 오탐 방지. 접두 방향("klon"→"klon-centaur")은 단일 토큰도 유의미.
  const multiToken = querySlug.includes("-");
  const boundaryMatches: CatalogEntry[] = [];
  for (const key of index.keys) {
    const candidates = index.entries[key]!;
    for (const entry of candidates) {
      if (entry.kind !== expectedKind) continue;
      const prefixHit = key.startsWith(querySlug + "-") || querySlug.startsWith(key + "-");
      const suffixHit = multiToken && (key.endsWith("-" + querySlug) || querySlug.endsWith("-" + key));
      if (querySlug === key || prefixHit || suffixHit) {
        boundaryMatches.push(entry);
      }
    }
  }

  if (boundaryMatches.length > 0) {
    const seen = new Set<CatalogEntry>();
    const unique: CatalogEntry[] = [];
    for (const entry of boundaryMatches) {
      if (!seen.has(entry)) {
        seen.add(entry);
        unique.push(entry);
      }
    }
    return { entries: unique, approximateMatch: true };
  }

  // 3단: 토큰 부분수열 매칭 (2단 후보 0일 때만)
  const queryTokens = querySlug.split("-");
  if (queryTokens.length >= 2) {
    const tokenMatches: CatalogEntry[] = [];
    for (const key of index.keys) {
      const candidates = index.entries[key]!;
      const keyTokens = key.split("-");
      if (keyTokens.length < 2) continue;

      // 부분수열 검사: q가 e의 부분수열 또는 e가 q의 부분수열
      const isSubsequence = (short: string[], long: string[]): boolean => {
        let j = 0;
        for (let i = 0; i < long.length && j < short.length; i++) {
          if (long[i] === short[j]) j++;
        }
        return j === short.length;
      };

      const matches =
        isSubsequence(queryTokens, keyTokens) ||
        isSubsequence(keyTokens, queryTokens);

      if (matches) {
        for (const entry of candidates) {
          if (entry.kind === expectedKind) {
            tokenMatches.push(entry);
          }
        }
      }
    }

    if (tokenMatches.length > 0) {
      const seen = new Set<CatalogEntry>();
      const unique: CatalogEntry[] = [];
      for (const entry of tokenMatches) {
        if (!seen.has(entry)) {
          seen.add(entry);
          unique.push(entry);
        }
      }
      return { entries: unique, approximateMatch: true };
    }
  }

  // 미매핑
  return { entries: [], approximateMatch: false };
}

// 캐논 체인 → 기기 signal_chain 투영. 모든 블록이 매핑되어야 성공(부분 산출 금지).
// kind 필터링: AMP↔"amp", CAB↔"cab", 기타 type↔"effect".
export function projectChain(
  chain: CanonBlock[],
  index: ReverseIndex,
  defaults?: Partial<Record<string, string>>,
): ProjectOutcome & { chain?: Block[] } {
  const projected: Block[] = [];
  const unmapped: Array<{ name: string; category?: string; blockIndex: number }> = [];
  const notes: string[] = [];

  for (let i = 0; i < chain.length; i++) {
    const block = chain[i]!;
    const key = slugify(block.base_gear.name);

    // kind 필터링: type에 따라 기대하는 kind 결정.
    let expectedKind: "amp" | "cab" | "effect";
    if (block.type === "AMP") expectedKind = "amp";
    else if (block.type === "CAB") expectedKind = "cab";
    else expectedKind = "effect";

    // 2단 룩업: 정확 → 경계 포함 매칭
    const result = matchEntries(key, index, expectedKind);

    if (result.entries.length === 0) {
      // 기능 모듈 폴백: DLY/RVB/EQ/NR/VOL이 미매핑이면 디폴트 사용
      if (FUNCTIONAL_TYPES.has(block.type) && defaults?.[block.type]) {
        const defaultModel = defaults[block.type]!;
        notes.push(`기능 폴백 @ chain[${i}] — "${block.base_gear.name}" → "${defaultModel}"`);
        const fallbackBlock: Block = {
          type: block.type,
          category: block.category,
          model: defaultModel,
          base_gear: block.base_gear.name,
          enabled: block.enabled,
          footswitch: block.footswitch,
          knobs: block.knobs,
        };
        projected.push(fallbackBlock);
        continue;
      }
      unmapped.push({ name: block.base_gear.name, category: block.base_gear.category, blockIndex: i });
      continue;
    }

    // 첫 항목 채택(문서 순서).
    const chosen = result.entries[0]!;

    // 근사 매칭 notes (경계 포함 매칭일 때)
    if (result.approximateMatch) {
      notes.push(`근사 매칭 @ chain[${i}] — "${block.base_gear.name}" ≈ "${chosen.base_gear}" → "${chosen.model}"`);
    }

    // 1:N 디스앰비 notes
    if (result.entries.length > 1) {
      const otherModels = result.entries.slice(1).map((e) => e.model).join(", ");
      notes.push(
        `1:N 디스앰비 @ chain[${i}] — 문서 순서 첫 항목 채택: "${chosen.model}" (후보: ${otherModels})`,
      );
    }

    // 투영 블록 생성(knobs는 캐논에서 그대로 복사).
    const projectedBlock: Block = {
      type: block.type,
      category: block.category,
      model: chosen.model,
      base_gear: block.base_gear.name,
      enabled: block.enabled,
      footswitch: block.footswitch,
      knobs: block.knobs,
    };
    projected.push(projectedBlock);
  }

  if (unmapped.length > 0) {
    return { ok: false, unmapped };
  }

  return { ok: true, chain: projected, notes: notes.length > 0 ? notes.join("; ") : undefined };
}

// 출력 대상 파생: real_amp(CAB off) / phone(CAB on).
// 캐논의 투영 결과(Block[] with model)를 입력으로 하여, CAB 블록의 enabled를 조작.
// 불변성 — 새 배열/객체 반환. 입력 미변형.
export function deriveOutputTarget(chain: Block[], target: "real_amp" | "phone"): Block[] {
  return chain.map((block) => {
    if (block.type === "CAB") {
      return {
        ...block,
        enabled: target === "phone",
      };
    }
    return block;
  });
}

export interface ProjectSongInput {
  songId: string;
  bodyArchetype: string;
  processorId: string;
}

// 곡의 캐논 3-role → 기기별 signal_chain 투영 end-to-end.
// 대표 파트(lead→backing→solo 우선순위 폴백)의 real_amp/phone 파생.
// 미매핑 역할은 적재 보류 + 사유 리포트(자동 수리 없음).
export async function projectSong(
  input: ProjectSongInput,
  deps: ProjectorDeps = {},
): Promise<ProjectResult> {
  const select = deps.select ?? sbSelect;
  const insert = deps.insert ?? sbInsert;

  // canonical_tones 조회: song_id의 3-role(lead/backing/solo).
  const enc = encodeURIComponent;
  const canonicalTones = await select<{
    id: string;
    role: string;
    chain: unknown;
    null_reason: string | null;
  }>(
    "canonical_tones",
    `song_id=eq.${enc(input.songId)}&select=id,role,chain,null_reason`,
    true, // admin: canonical_tones는 비공개 테이블
  );

  // processors 행 조회: effects_catalog 취득.
  const procs = await select<{ effects_catalog: unknown }>(
    "processors",
    `id=eq.${enc(input.processorId)}&select=effects_catalog`,
    false, // anon 키로 충분
  );
  const proc = procs[0];
  if (!proc) throw new Error(`processors id=${input.processorId} 를 찾을 수 없음`);

  const catalog = proc.effects_catalog as Record<string, unknown> | unknown;
  if (!isObject(catalog) || !Array.isArray(catalog.entries)) {
    throw new Error(`카탈로그에 entries 없음 — 시드 갱신 필요. 프로세서 ID: ${input.processorId}`);
  }

  const entries = catalog.entries as CatalogEntry[];
  const defaults = catalog.defaults as Record<string, string> | undefined;
  const draft = projectCanonDraft(
    canonicalTones.map((tone) => ({
      id: tone.id,
      role: tone.role as CanonRole,
      chain: Array.isArray(tone.chain) ? (tone.chain as CanonBlock[]) : null,
      nullReason: tone.null_reason,
    })),
    { entries, defaults },
  );
  const rows: Record<string, unknown>[] = [];
  const outcomes: ProjectRoleOutcome[] = draft.roles.map((role) => ({
    role: role.role,
    status:
      role.status === "projected"
        ? "persisted"
        : role.status === "null"
          ? "null"
          : "skipped",
    ...(role.issues ? { issues: role.issues } : {}),
  }));

  for (const role of draft.roles) {
    if (
      (role.status === "projected" || role.status === "null") &&
      role.canonicalId
    ) {
      rows.push(
        tonalRow(
          input,
          role.canonicalId,
          role.role,
          role.chain,
          role.nullReason,
          role.sourceRole ? `${role.role} 파생(${role.sourceRole})` : null,
        ),
      );
    }
  }

  // 적재.
  if (rows.length > 0) {
    await insert("tones", rows, {
      onConflict: "song_id,body_archetype,processor_id,role,version",
    });
  }

  return { songId: input.songId, roles: outcomes };
}

// ── 헬퍼 ──────────────────────────────────────────────

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function tonalRow(
  input: ProjectSongInput,
  canonicalToneId: string,
  role: string,
  signalChain: unknown,
  nullReason: string | null,
  label?: string | null,
): Record<string, unknown> {
  return {
    canonical_tone_id: canonicalToneId,
    song_id: input.songId,
    body_archetype: input.bodyArchetype,
    processor_id: input.processorId,
    role,
    signal_chain: signalChain,
    null_reason: nullReason,
    label: label ?? null,
    version: 1,
    projector_version: PROJECTOR_VERSION,
  };
}
