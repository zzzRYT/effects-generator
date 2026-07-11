import { hasAdminSession } from "@/lib/admin/require-admin";
import { toPublicExperiment } from "@/lib/audio-experiment/blind";
import type { ToneExperimentRow } from "@/lib/audio-experiment/contracts";
import { validateEvaluation } from "@/lib/audio-experiment/validate";
import { sbFetch, sbSelect } from "@/lib/supabase/rest";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!(await hasAdminSession())) {
    return Response.json({ error: "인증 필요" }, { status: 401 });
  }
  let evaluation;
  try {
    evaluation = validateEvaluation(await request.json());
  } catch {
    return Response.json({ error: "evaluation:invalid" }, { status: 400 });
  }

  const { id } = await params;
  let current: ToneExperimentRow | undefined;
  try {
    [current] = await sbSelect<ToneExperimentRow>(
      "tone_experiments",
      `id=eq.${encodeURIComponent(id)}&select=*&limit=1`,
      true,
    );
  } catch {
    return Response.json({ error: "실험 조회 실패" }, { status: 500 });
  }
  if (!current) return Response.json({ error: "실험 없음" }, { status: 404 });
  if (current.status !== "ready" || !current.blind_assignment) {
    return Response.json({ error: "이미 평가됐거나 준비되지 않음" }, { status: 409 });
  }

  const preferredVariant = current.blind_assignment[evaluation.preference];
  let updated: ToneExperimentRow[];
  try {
    const response = await sbFetch(
      `tone_experiments?id=eq.${encodeURIComponent(id)}&status=eq.ready&select=*`,
      {
        admin: true,
        method: "PATCH",
        body: {
          status: "evaluated",
          evaluation,
          preferred_variant: preferredVariant,
        },
        headers: { Prefer: "return=representation" },
      },
    );
    updated = (await response.json()) as ToneExperimentRow[];
  } catch {
    return Response.json({ error: "평가 저장 실패" }, { status: 500 });
  }
  if (updated.length === 0) {
    return Response.json({ error: "이미 평가됨" }, { status: 409 });
  }
  return Response.json(toPublicExperiment(updated[0], true));
}
