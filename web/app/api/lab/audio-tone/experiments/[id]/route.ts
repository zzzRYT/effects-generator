import { hasAdminSession } from "@/lib/admin/require-admin";
import { toPublicExperiment } from "@/lib/audio-experiment/blind";
import type { ToneExperimentRow } from "@/lib/audio-experiment/contracts";
import { sbSelect } from "@/lib/supabase/rest";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!(await hasAdminSession())) {
    return Response.json({ error: "인증 필요" }, { status: 401 });
  }
  const { id } = await params;
  let rows: ToneExperimentRow[];
  try {
    rows = await sbSelect<ToneExperimentRow>(
      "tone_experiments",
      `id=eq.${encodeURIComponent(id)}&select=*&limit=1`,
      true,
    );
  } catch {
    return Response.json({ error: "실험 조회 실패" }, { status: 500 });
  }
  const row = rows[0];
  if (!row) return Response.json({ error: "실험 없음" }, { status: 404 });
  return Response.json(toPublicExperiment(row, row.status === "evaluated"));
}
