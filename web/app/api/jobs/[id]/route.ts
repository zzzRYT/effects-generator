// 생성 작업 진행 폴링 — 클라가 2~3초마다 호출. 완료 판정은 둘 중 하나:
//  (1) n8n 이 generation_jobs.status 를 갱신(ready/failed) — Phase 3 #7,
//  (2) 또는 패치가 등장(findCachedSlug) — n8n 이 job 갱신 안 해도 동작.
// 덕분에 동기 n8n(job 미갱신)에서도 happy-path 가 돈다.

import { sbSelect } from "@/lib/supabase/rest";
import { findCachedSlug } from "@/lib/data/catalog";

export const dynamic = "force-dynamic";

interface DbJob {
  id: string;
  artist: string;
  title: string;
  status: string;
  error: string | null;
  song_id: string | null;
  patch_id: string | null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;

  let jobs: DbJob[];
  try {
    jobs = await sbSelect<DbJob>("generation_jobs", `select=*&id=eq.${id}&limit=1`, true);
  } catch {
    return Response.json({ error: "작업 조회 실패" }, { status: 500 });
  }
  if (jobs.length === 0) {
    return Response.json({ error: "작업 없음" }, { status: 404 });
  }
  const job = jobs[0];

  if (job.status === "failed") {
    return Response.json({ status: "failed", error: job.error ?? "생성 실패" });
  }

  // 패치 등장 여부로 완료 판정(job 갱신과 무관하게 동작).
  try {
    const slug = await findCachedSlug(job.artist, job.title);
    if (slug) return Response.json({ status: "ready", slug });
  } catch {
    // 무시 — pending 으로 계속.
  }

  return Response.json({ status: job.status || "pending" });
}
