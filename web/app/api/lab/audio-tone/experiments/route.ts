import { after } from "next/server";
import { hasAdminSession } from "@/lib/admin/require-admin";
import { getLlmClient } from "@/lib/llm/client";
import { runToneExperiment } from "@/lib/audio-experiment/runner";
import { validateExperimentInput } from "@/lib/audio-experiment/validate";
import { PROJECTOR_VERSION } from "@/lib/pipeline/projector";
import { resolveRequest } from "@/lib/pipeline/resolver";
import { sbInsert } from "@/lib/supabase/rest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PROMPT_VERSION = "audio-tone-v1";

export async function POST(request: Request): Promise<Response> {
  if (!(await hasAdminSession())) {
    return Response.json({ error: "인증 필요" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "잘못된 JSON" }, { status: 400 });
  }

  let normalized;
  try {
    normalized = validateExperimentInput(raw);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "input:invalid_request" },
      { status: 400 },
    );
  }

  let resolution;
  try {
    resolution = await resolveRequest({
      artist: normalized.artist,
      title: normalized.title,
      guitar: normalized.guitar,
      processor: normalized.processor,
    });
  } catch {
    return Response.json({ error: "기어 조회 실패" }, { status: 500 });
  }
  if (!resolution.ok) {
    return Response.json(
      { error: "지원되지 않는 기어", unresolved: resolution.unresolved },
      { status: 422 },
    );
  }

  let llm;
  try {
    llm = getLlmClient();
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "provider:unavailable" },
      { status: 500 },
    );
  }
  if (!llm.capabilities.videoInput) {
    return Response.json(
      { error: "provider:video_unsupported" },
      { status: 422 },
    );
  }

  const model = process.env.LLM_MODEL ?? "gemini-2.5-flash";
  let experiment: { id: string } | undefined;
  try {
    [experiment] = await sbInsert<{ id: string }>(
      "tone_experiments",
      {
        request: normalized,
        youtube_url: normalized.youtubeUrl,
        video_id: normalized.videoId,
        segments: normalized.segments.map((segment) => ({
          role: segment.role,
          start_ms: segment.startMs,
          end_ms: segment.endMs,
        })),
        model_used: model,
        prompt_version: PROMPT_VERSION,
        projector_version: PROJECTOR_VERSION,
        status: "queued",
        progress: { stage: "queued" },
      },
      { admin: true },
    );
  } catch {
    return Response.json({ error: "실험 생성 실패" }, { status: 500 });
  }
  if (!experiment) {
    return Response.json({ error: "실험 생성 실패" }, { status: 500 });
  }

  const resolved = resolution.resolved;
  after(async () => {
    await runToneExperiment(experiment.id, normalized, resolved);
  });
  return Response.json({ experimentId: experiment.id }, { status: 202 });
}
