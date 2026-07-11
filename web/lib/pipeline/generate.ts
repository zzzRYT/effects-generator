// 운영 캐논 생성 래퍼 — 곡·리서치 캐시를 확보한 뒤 순수 초안을 생성하고 통과분만 적재한다.

import type { LlmClient } from "../llm/client";
import { sbInsert, sbSelect } from "../supabase/rest";
import {
  generateCanonDraft,
  type CanonRole,
  type CanonDraftRole,
} from "./canon-draft";
import { loadGrounding } from "./grounding";
import { researchSong } from "./research";
import type { GateIssue } from "./gate";
import type { ResolvedRequest, ToneRequest } from "./types";

export { CANON_ROLES, type CanonRole } from "./canon-draft";

export interface CanonRoleOutcome {
  role: CanonRole;
  status: "persisted" | "null" | "skipped";
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
  model?: string;
}

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
  const draft = await generateCanonDraft(
    {
      artist: req.artist,
      title: req.title,
      research: research.notes,
      grounding: context,
    },
    { llm: deps.llm, model: modelUsed },
  );

  const rows = draft.roles
    .filter((role) => role.status !== "skipped")
    .map((role) => canonRow(songId, role, draft.sources, draft.modelUsed));
  if (rows.length > 0) {
    await insert("canonical_tones", rows, {
      onConflict: "song_id,role",
    });
  }

  return {
    songId,
    researchCached: research.cached,
    roles: draft.roles.map((role) => ({
      role: role.role,
      status:
        role.status === "valid"
          ? "persisted"
          : role.status === "null"
            ? "null"
            : "skipped",
      ...(role.issues ? { issues: role.issues } : {}),
    })),
  };
}

/** songs 행 확보(idempotent upsert) → id. 실험은 이 캐시 쓰기만 재사용할 수 있다. */
export async function ensureSong(
  req: ToneRequest,
  resolved: ResolvedRequest,
  insert: typeof sbInsert = sbInsert,
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
  role: CanonDraftRole,
  sources: unknown[],
  modelUsed: string,
): Record<string, unknown> {
  return {
    song_id: songId,
    role: role.role,
    chain: role.chain,
    null_reason: role.nullReason,
    confidence: role.confidence,
    sources,
    model_used: modelUsed,
  };
}
