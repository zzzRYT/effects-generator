// 톤 생성 트리거 — 캐시-우선 → 미스면 generation_jobs insert + n8n webhook 발사(ack).
// 동기 60초를 피하려 n8n 응답을 기다리지 않는다(짧은 타임아웃 가드). 진행은 클라가 /api/jobs 폴링.
// 권위: docs/plans/2026-06-26-web-dynamic-catalog-design.md §5.

import { validateGenerate } from "@/lib/generate/validate";
import { findCachedSlug } from "@/lib/data/catalog";
import { sbFetch } from "@/lib/supabase/rest";

export const dynamic = "force-dynamic";

const N8N_URL = process.env.N8N_GENERATE_WEBHOOK_URL;
const TRIGGER_TIMEOUT_MS = 4000;

interface JobRow {
  id: string;
}

export async function POST(req: Request): Promise<Response> {
  let body: { artist?: unknown; song?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const artist = String(body.artist ?? "");
  const song = String(body.song ?? "");

  const errors = validateGenerate({ artist, song });
  if (Object.keys(errors).length > 0) {
    return Response.json({ errors }, { status: 400 });
  }

  // 캐시-우선: 이미 있으면 즉시 그 곡으로(비용 0).
  try {
    const cached = await findCachedSlug(artist, song);
    if (cached) return Response.json({ status: "ready", slug: cached });
  } catch {
    // 캐시 조회 실패는 치명적 아님 — 생성으로 진행.
  }

  if (!N8N_URL) {
    return Response.json(
      { error: "생성 서비스 미설정(N8N_GENERATE_WEBHOOK_URL)" },
      { status: 500 },
    );
  }

  // 진행 추적용 job 행.
  let jobId: string;
  try {
    const res = await sbFetch("generation_jobs", {
      admin: true,
      method: "POST",
      body: {
        artist: artist.trim(),
        title: song.trim(),
        processor_slug: "gp150",
        status: "pending",
      },
      headers: { Prefer: "return=representation" },
    });
    const rows = (await res.json()) as JobRow[];
    jobId = rows[0].id;
  } catch {
    return Response.json({ error: "작업 생성 실패" }, { status: 500 });
  }

  // n8n 발사 — 응답을 기다리지 않는다(타임아웃 가드). 요청은 전송되므로 n8n 은 처리·적재한다.
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TRIGGER_TIMEOUT_MS);
    await fetch(N8N_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        artist: artist.trim(),
        song: song.trim(),
        processor: "gp150",
        job_id: jobId,
      }),
      signal: ctrl.signal,
    }).catch(() => {});
    clearTimeout(t);
  } catch {
    // 발사 실패해도 job 은 남는다 — 폴링이 timeout 으로 처리.
  }

  return Response.json({ status: "pending", jobId });
}
