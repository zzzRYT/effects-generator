// 투영 오케스트레이션(설계 §2 ④, §5) — 캐논(AI 생성, base_gear 어휘) → 기기 signal_chain 결정적 변환.
// ToneProjector는 순수 스크립트(AI 없음): 캐논 + processors.effects_catalog(base_gear 역인덱스) → role별 signal_chain.
// 순수 코어(projectChain, deriveOutputTarget)와 DB 래퍼(projectSong)를 분리 — 코어는 목 없이 테스트 가능.
// 미매핑(base_gear ↔ base_gear 룩업 실패)은 자동 수리 없음(헌법 "생성 품질 게이트") — 어드민이 gear KB 보완.

import { validateProjection, type GateIssue } from "./gate";
import { CANON_ROLES, type CanonRole } from "./generate";
import type { CanonBlock } from "./types";
import type { CatalogEntry } from "../parser/catalog";
import { slugify } from "../data/slugify";
import { sbInsert, sbSelect } from "../supabase/rest";
import type { Block } from "../types";

export const PROJECTOR_VERSION = "1";

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
  const boundaryMatches: CatalogEntry[] = [];
  for (const key of index.keys) {
    const candidates = index.entries[key]!;
    for (const entry of candidates) {
      if (entry.kind !== expectedKind) continue;
      // 경계 포함 조건: q === e || e.startsWith(q+"-") || e.endsWith("-"+q) || q.startsWith(e+"-") || q.endsWith("-"+e)
      if (
        querySlug === key ||
        key.startsWith(querySlug + "-") ||
        key.endsWith("-" + querySlug) ||
        querySlug.startsWith(key + "-") ||
        querySlug.endsWith("-" + key)
      ) {
        boundaryMatches.push(entry);
      }
    }
  }

  if (boundaryMatches.length > 0) {
    // 중복 제거(한 entry가 여러 경계 조건에 매칭될 수 있음) + 문서 순서 보존
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

  // 미매핑
  return { entries: [], approximateMatch: false };
}

// 캐논 체인 → 기기 signal_chain 투영. 모든 블록이 매핑되어야 성공(부분 산출 금지).
// kind 필터링: AMP↔"amp", CAB↔"cab", 기타 type↔"effect".
export function projectChain(
  chain: CanonBlock[],
  index: ReverseIndex,
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

  const entries = (catalog.entries as CatalogEntry[]) ?? [];
  const index = buildReverseIndex(entries);
  const modelCatalog = extractModelCatalog(entries); // role별 루프 밖에서 1회 계산.

  const rows: Record<string, unknown>[] = [];
  const outcomes: ProjectRoleOutcome[] = [];
  const roleResults = new Map<CanonRole, { canonicalId: string; chain: Block[] }>();

  // 3-role 투영: DB 순서 무시, 나중에 CANON_ROLES 우선순위로 정렬.
  for (const toneSrc of canonicalTones) {
    const role = toneSrc.role as CanonRole;

    // chain null → null_reason 승계.
    if (!Array.isArray(toneSrc.chain)) {
      const reason = typeof toneSrc.null_reason === "string" ? toneSrc.null_reason : "캐논에서 해당 파트 없음";
      rows.push(tonalRow(input, toneSrc.id, role, null, reason));
      outcomes.push({ role, status: "null" });
      continue;
    }

    // 캐논 블록 타입 어시션(CanonBlock[]).
    const canonChain = toneSrc.chain as CanonBlock[];

    // 투영 시도.
    const projOutcome = projectChain(canonChain, index);
    if (!projOutcome.ok) {
      outcomes.push({
        role,
        status: "skipped",
        issues: projOutcome.unmapped?.map((u) => ({
          path: `chain[${u.blockIndex}].base_gear`,
          message: `실기 "${u.name}"(${u.category || "unknown"})를 카탈로그에서 찾을 수 없음`,
        })) ?? [],
      });
      continue;
    }

    // 투영 성공 → 게이트 검증(모델 실존 + 노브 범위).
    const projectedChain = projOutcome.chain!;
    const gateResult = validateProjection(projectedChain, modelCatalog);
    if (!gateResult.ok) {
      outcomes.push({ role, status: "skipped", issues: gateResult.issues });
      continue;
    }

    // 게이트 통과 → 적재 + 대표 파트 후보 저장.
    rows.push(tonalRow(input, toneSrc.id, role, projectedChain, null));
    outcomes.push({ role, status: "persisted" });
    roleResults.set(role, { canonicalId: toneSrc.id, chain: projectedChain });
  }

  // 대표 파트 선택: CANON_ROLES 우선순위(lead→backing→solo)로 첫 성공.
  let representativeTone: { canonicalId: string; chain: Block[]; role: CanonRole } | null = null;
  for (const role of CANON_ROLES) {
    const result = roleResults.get(role);
    if (result) {
      representativeTone = { ...result, role };
      break;
    }
  }

  // 대표 파트 파생(real_amp/phone).
  if (representativeTone) {
    const realAmpChain = deriveOutputTarget(representativeTone.chain, "real_amp");
    const phoneChain = deriveOutputTarget(representativeTone.chain, "phone");

    const gateRealAmp = validateProjection(realAmpChain, modelCatalog);
    const gatePhone = validateProjection(phoneChain, modelCatalog);

    // real_amp: 게이트 통과 시만 적재, 실패 시 적재 보류(skipped 정책 일관성).
    if (gateRealAmp.ok) {
      rows.push(tonalRow(input, representativeTone.canonicalId, "real_amp", realAmpChain, null, `real_amp 파생(${representativeTone.role})`));
      outcomes.push({ role: "real_amp", status: "persisted" });
    } else {
      outcomes.push({ role: "real_amp", status: "skipped", issues: gateRealAmp.issues });
    }

    // phone: 게이트 통과 시만 적재.
    if (gatePhone.ok) {
      rows.push(tonalRow(input, representativeTone.canonicalId, "phone", phoneChain, null, `phone 파생(${representativeTone.role})`));
      outcomes.push({ role: "phone", status: "persisted" });
    } else {
      outcomes.push({ role: "phone", status: "skipped", issues: gatePhone.issues });
    }
  } else {
    // 대표 파트 없음 → real_amp/phone 모두 skipped.
    outcomes.push({
      role: "real_amp",
      status: "skipped",
      issues: [{ path: "chain", message: "파생할 파트 톤 없음 — lead/backing/solo 모두 미매핑 또는 미생성" }],
    });
    outcomes.push({
      role: "phone",
      status: "skipped",
      issues: [{ path: "chain", message: "파생할 파트 톤 없음 — lead/backing/solo 모두 미매핑 또는 미생성" }],
    });
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

// 엔트리 배열로부터 모델 카탈로그(exact/prefixes) 구성.
function extractModelCatalog(entries: CatalogEntry[]): { exact: Set<string>; prefixes: string[] } {
  const exact = new Set<string>();
  const prefixes: string[] = [];

  for (const entry of entries) {
    exact.add(entry.model);
    // 범위형(예: "User IR 1-20" → "User IR ")은 여기서 처리하지 않음 — extractCatalogEntries에서 제외됨.
  }

  return { exact, prefixes };
}
