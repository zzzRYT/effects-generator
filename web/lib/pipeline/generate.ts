// 캐논 생성 오케스트레이션(설계 §2 ③) — 신곡 1회: 곡 확보 → 리서치 → 그라운딩 → 3-role 캐논 LLM
// → 파싱 → 검증 게이트(스키마+base_gear 모양) → canonical_tones 적재.
// 캐논은 곡 파트 3-role(lead/backing/solo)만. real-amp/phone 은 투영(R3)이 출력 프로파일로 파생.
// 게이트 통과분만 적재(오염 0). chain 이 있는데 게이트 실패한 role 은 적재 보류 + 사유 리포트(자동 수리 없음).

import { getLlmClient, type LlmClient } from "../llm/client";
import { sbInsert, sbSelect } from "../supabase/rest";
import { validateCanon, type GateIssue } from "./gate";
import { loadGrounding } from "./grounding";
import { parseLlmJson } from "./json";
import { buildCanonPrompt } from "./prompts";
import { researchSong } from "./research";
import type { ResolvedRequest, ToneRequest } from "./types";

// 캐논은 곡 파트 3-role 만(TONE_ROLES 5종의 부분집합). real-amp/phone 은 캐논에 없음(설계 §5).
export const CANON_ROLES = ["lead", "backing", "solo"] as const;
export type CanonRole = (typeof CANON_ROLES)[number];

export interface CanonRoleOutcome {
  role: CanonRole;
  status: "persisted" | "null" | "skipped";
  /** status="skipped" 일 때 게이트 이슈. */
  issues?: GateIssue[];
}

export interface GenerateResult {
  songId: string;
  researchCached: boolean;
  roles: CanonRoleOutcome[];
}

export interface GenerateDeps {
  llm?: LlmClient;
  select?: typeof sbSelect;
  insert?: typeof sbInsert;
  /** 기록용 model_used 라벨(기본 LLM_MODEL env 또는 "gemini"). */
  model?: string;
}

interface RolePayload {
  chain: unknown;
  null_reason?: unknown;
  confidence?: unknown;
}

/** 신곡 캐논 생성 end-to-end. 캐시(캐논/리서치)는 호출부 책임 — 여기선 항상 생성·적재한다. */
export async function generateCanon(
  req: ToneRequest,
  resolved: ResolvedRequest,
  deps: GenerateDeps = {},
): Promise<GenerateResult> {
  const select = deps.select ?? sbSelect;
  const insert = deps.insert ?? sbInsert;
  const modelUsed = deps.model ?? process.env.LLM_MODEL ?? "gemini";

  const songId = resolved.song.id ?? (await ensureSong(req, resolved, insert));

  const research = await researchSong(
    { songId, artist: req.artist, title: req.title },
    { llm: deps.llm, select, insert, model: modelUsed },
  );
  const { context } = await loadGrounding({ select });

  const llm = deps.llm ?? getLlmClient();
  const { system, user } = buildCanonPrompt({
    artist: req.artist,
    title: req.title,
    research: research.notes,
    grounding: context,
  });
  const raw = await llm.chat(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { json: true },
  );
  const parsed = parseLlmJson(raw);
  const rolesObj = isObject(parsed.roles) ? parsed.roles : {};
  const sources = Array.isArray(parsed.sources) ? parsed.sources : [];

  const rows: Record<string, unknown>[] = [];
  const outcomes: CanonRoleOutcome[] = [];

  for (const role of CANON_ROLES) {
    const payload = (isObject(rolesObj) ? rolesObj[role] : undefined) as RolePayload | undefined;
    const chain = payload?.chain;

    // chain 이 배열이면 게이트 대상, 아니면 "해당 파트 없음"(null_reason).
    if (Array.isArray(chain)) {
      const gate = validateCanon(chain);
      if (!gate.ok) {
        outcomes.push({ role, status: "skipped", issues: gate.issues });
        continue;
      }
      rows.push(canonRow(songId, role, chain, null, payload, sources, modelUsed));
      outcomes.push({ role, status: "persisted" });
    } else {
      const reason = typeof payload?.null_reason === "string" && payload.null_reason.trim()
        ? payload.null_reason
        : "리서치에서 해당 파트를 확정하지 못함";
      rows.push(canonRow(songId, role, null, reason, payload, sources, modelUsed));
      outcomes.push({ role, status: "null" });
    }
  }

  if (rows.length > 0) {
    await insert("canonical_tones", rows, { onConflict: "song_id,role" });
  }
  return { songId, researchCached: research.cached, roles: outcomes };
}

/** songs 행 확보(idempotent upsert) → id. resolved.song.id 가 null(신곡)일 때만 호출. */
async function ensureSong(
  req: ToneRequest,
  resolved: ResolvedRequest,
  insert: typeof sbInsert,
): Promise<string> {
  const rows = await insert<{ id: string }>(
    "songs",
    [
      {
        artist: req.artist,
        title: req.title,
        artist_norm: resolved.song.artist_norm,
        title_norm: resolved.song.title_norm,
      },
    ],
    { onConflict: "artist_norm,title_norm" },
  );
  const id = rows[0]?.id;
  if (!id) throw new Error("songs upsert 가 id 를 반환하지 않음");
  return id;
}

function canonRow(
  songId: string,
  role: CanonRole,
  chain: unknown,
  nullReason: string | null,
  payload: RolePayload | undefined,
  sources: unknown[],
  modelUsed: string,
): Record<string, unknown> {
  return {
    song_id: songId,
    role,
    chain,
    null_reason: nullReason,
    confidence: typeof payload?.confidence === "number" ? payload.confidence : null,
    sources,
    model_used: modelUsed,
  };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
