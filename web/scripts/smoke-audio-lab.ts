// 오디오 톤 랩 라이브 스모크 — 실 Gemini + 리모트 tone_experiments로 실험 전 구간을 돌린다.
// 실행: web/ 에서 `npx tsx --env-file=.env.local scripts/smoke-audio-lab.ts`
// 검증 항목: ① unexpected_segment 재발 여부(구간 echo 제거 후) ② 503/500 재시도 흡수
// ③ 실험 종결 상태(ready 또는 정당한 실패 코드). 무료 티어 RPM을 고려해 케이스는 순차 실행.
// 주의: Gemini 실호출·리모트 DB 쓰기가 있는 개발용 스크립트다 — CI 대상 아님.

import { runToneExperiment } from "../lib/audio-experiment/runner";
import { validateExperimentInput } from "../lib/audio-experiment/validate";
import { PROJECTOR_VERSION } from "../lib/pipeline/projector";
import { resolveRequest } from "../lib/pipeline/resolver";
import { sbInsert, sbSelect } from "../lib/supabase/rest";

const PROMPT_VERSION = "audio-tone-v1";

const CASES = [
  {
    artist: "Oasis",
    title: "Don't Look Back in Anger",
    youtubeUrl: "https://www.youtube.com/watch?v=r8OipmKFDeM",
    durationMs: 288_000,
    segment: { startMs: 175_000, endMs: 205_000 },
  },
  {
    artist: "Radiohead",
    title: "Creep",
    youtubeUrl: "https://www.youtube.com/watch?v=XFkzRNyygfk",
    durationMs: 236_000,
    segment: { startMs: 50_000, endMs: 80_000 },
  },
  {
    artist: "Nirvana",
    title: "Smells Like Teen Spirit",
    youtubeUrl: "https://www.youtube.com/watch?v=hTWKbfoikeg",
    durationMs: 278_000,
    segment: { startMs: 0, endMs: 25_000 },
  },
];

async function runCase(input: (typeof CASES)[number]): Promise<void> {
  console.log(`\n=== ${input.artist} — ${input.title} [${input.segment.startMs / 1000}s~${input.segment.endMs / 1000}s] ===`);
  const normalized = validateExperimentInput({
    ...input,
    guitar: "Cort G250",
    processor: "Valeton GP-150",
  });

  let resolution = await resolveRequest({
    artist: normalized.artist,
    title: normalized.title,
    guitar: normalized.guitar,
    processor: normalized.processor,
  });
  if (!resolution.ok) {
    resolution = await resolveRequest({
      artist: normalized.artist,
      title: normalized.title,
      guitar: normalized.guitar,
      processor: "Valeton GP150",
    });
  }
  if (!resolution.ok) {
    console.error("Resolver 실패:", JSON.stringify(resolution.unresolved));
    return;
  }

  const [experiment] = await sbInsert<{ id: string }>(
    "tone_experiments",
    {
      request: normalized,
      youtube_url: normalized.youtubeUrl,
      video_id: normalized.videoId,
      segment: { start_ms: normalized.segment.startMs, end_ms: normalized.segment.endMs },
      model_used: process.env.LLM_MODEL ?? "gemini-2.5-flash",
      prompt_version: PROMPT_VERSION,
      projector_version: PROJECTOR_VERSION,
      status: "queued",
      progress: { stage: "queued" },
    },
    { admin: true },
  );
  if (!experiment) {
    console.error("실험 행 생성 실패");
    return;
  }

  const startedAt = Date.now();
  await runToneExperiment(experiment.id, normalized, resolution.resolved);
  const elapsedS = ((Date.now() - startedAt) / 1000).toFixed(1);

  const [row] = await sbSelect<{
    status: string;
    failure_code: string | null;
    failure_detail: string | null;
  }>(
    "tone_experiments",
    `id=eq.${encodeURIComponent(experiment.id)}&select=status,failure_code,failure_detail`,
    true,
  );
  console.log(`   id=${experiment.id} · ${elapsedS}s`);
  console.log(`   status=${row?.status}${row?.failure_code ? ` · failure_code=${row.failure_code} · detail=${row.failure_detail}` : ""}`);
}

async function main() {
  for (const input of CASES) {
    await runCase(input);
  }
}

main().catch((e) => {
  console.error("스모크 실패:", e);
  process.exit(1);
});
