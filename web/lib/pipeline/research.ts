// 곡 리서치 스텝 — 원곡의 실제 기타 톤을 조사해 구조화 노트로 남긴다(설계 §2 ③, 곡당 1회).
// song_research(unique song_id)로 캐시 — 히트면 LLM 호출 없이 재사용(신곡이 아니면 리서치 비용 0).
// 서버 전용(gear/song_research 는 공개 RLS 정책 없음 → service 키로 조회·적재).

import { getLlmClient, type LlmClient } from "../llm/client";
import { sbInsert, sbSelect } from "../supabase/rest";
import { parseLlmJson } from "./json";
import {
  buildGroundedResearchPrompt,
  buildResearchNormalizationPrompt,
  buildResearchPrompt,
} from "./prompts";

export interface ResearchInput {
  songId: string;
  artist: string;
  title: string;
}

export interface ResearchResult {
  notes: Record<string, unknown>;
  modelUsed: string;
  cached: boolean;
}

export interface ResearchDeps {
  llm?: LlmClient;
  select?: typeof sbSelect;
  insert?: typeof sbInsert;
  /** 기록용 model_used 라벨(기본 LLM_MODEL env 또는 "gemini"). */
  model?: string;
}

const enc = encodeURIComponent;

/** song_research 캐시 조회 → 미스면 LLM 리서치 → 노트 적재. 항상 서버(service 키). */
export async function researchSong(input: ResearchInput, deps: ResearchDeps = {}): Promise<ResearchResult> {
  const select = deps.select ?? sbSelect;
  const cached = await select<{ notes: Record<string, unknown>; model_used: string }>(
    "song_research",
    `song_id=eq.${enc(input.songId)}&select=notes,model_used`,
    true,
  );
  if (cached[0]) {
    return { notes: cached[0].notes, modelUsed: cached[0].model_used, cached: true };
  }

  const llm = deps.llm ?? getLlmClient();
  const notes = llm.capabilities.searchGrounding
    ? await groundedResearch(input, llm)
    : await textOnlyResearch(input, llm);
  const modelUsed = deps.model ?? process.env.LLM_MODEL ?? "gemini";

  const insert = deps.insert ?? sbInsert;
  await insert("song_research", [{ song_id: input.songId, notes, model_used: modelUsed }], {
    onConflict: "song_id",
  });
  return { notes, modelUsed, cached: false };
}

async function groundedResearch(
  input: ResearchInput,
  llm: LlmClient,
): Promise<Record<string, unknown>> {
  const searchPrompt = buildGroundedResearchPrompt(input.artist, input.title);
  const grounded = await llm.groundedSearch(
    [
      { role: "system", content: searchPrompt.system },
      { role: "user", content: searchPrompt.user },
    ],
    { temperature: 0 },
  );
  const normalizationPrompt = buildResearchNormalizationPrompt({
    artist: input.artist,
    title: input.title,
    report: grounded.text,
    sources: grounded.sources,
  });
  const raw = await llm.chat(
    [
      { role: "system", content: normalizationPrompt.system },
      { role: "user", content: normalizationPrompt.user },
    ],
    { json: true, temperature: 0 },
  );
  return { ...parseLlmJson(raw), sources: grounded.sources };
}

async function textOnlyResearch(
  input: ResearchInput,
  llm: LlmClient,
): Promise<Record<string, unknown>> {
  const { system, user } = buildResearchPrompt(input.artist, input.title);
  const raw = await llm.chat(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { json: true },
  );
  return parseLlmJson(raw);
}
