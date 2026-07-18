// 톤 생성 작업 진행 폴링 — tone_jobs 조회 + status 응답.
// 권위: docs/trd/r4-web-rewire.md §2 데이터 흐름 (B1, B2)
// 리뷰 보강: 좀비 잡 가드 (updated_at 3분 경과 + 비종결 status → failed 자동 UPDATE).

import { sbSelect, sbFetch } from '@/lib/supabase/rest';
import { buildJobStatusResponse } from '@/lib/api/jobs';
import type { ToneJob } from '@/lib/api/jobs';

export const dynamic = 'force-dynamic';

// 좀비 잡 가드: updated_at이 이 시간 이상 경과하면 failed로 판정.
const JOB_STALE_MS = 3 * 60 * 1000; // 3분

// 비종결 상태 집합.
const RUNNING_STATUSES = new Set(['queued', 'resolving', 'generating_canon', 'projecting', 'validating']);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;

  // tone_jobs 조회
  let jobs: ToneJob[];
  try {
    jobs = await sbSelect<ToneJob>('tone_jobs', `select=*&id=eq.${id}&limit=1`, true);
  } catch {
    return Response.json({ error: '작업 조회 실패' }, { status: 500 });
  }

  if (jobs.length === 0) {
    return Response.json({ error: '작업 없음' }, { status: 404 });
  }

  let job = jobs[0];

  // 좀비 잡 가드: 비종결 상태 && 3분 이상 갱신 안 됨 → failed로 자동 UPDATE.
  if (RUNNING_STATUSES.has(job.status)) {
    const now = Date.now();
    const updatedTime = new Date(job.updated_at).getTime();
    if (now - updatedTime > JOB_STALE_MS) {
      // 비종결 상태에서 오래됨 — stale-job guard로 failed 표시.
      try {
        const updated = await sbSelect<ToneJob>(
          'tone_jobs',
          `select=*&id=eq.${id}&status=in.(resolving,generating_canon,projecting,validating)&limit=1`,
          true
        );
        if (updated.length > 0) {
          // 여전히 비종결 상태 — UPDATE
          await sbFetch(`tone_jobs?id=eq.${id}`, {
            admin: true,
            method: 'PATCH',
            body: {
              status: 'failed',
              failure_reason: 'internal:stale-job',
              failure_detail: `No update for ${Math.round((now - updatedTime) / 1000)}s`,
            },
          });
          // 갱신된 job 상태로 재조회.
          const refreshed = await sbSelect<ToneJob>(
            'tone_jobs',
            `select=*&id=eq.${id}&limit=1`,
            true
          );
          if (refreshed.length > 0) {
            job = refreshed[0];
          }
        }
      } catch (err) {
        // 가드 업데이트 실패해도 failed 응답은 반환 (로깅만).
        console.error(`[tone-job] Stale guard update failed for ${id}:`, err);
        job = { ...job, status: 'failed', failure_reason: 'internal:stale-job' };
      }
    }
  }

  // 응답 생성 (status, songSlug, failureReason 포함).
  const response = buildJobStatusResponse(job);
  return Response.json(response);
}
