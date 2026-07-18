// tone_jobs 폴링 응답 생성.
// 권위: docs/trd/r4-web-rewire.md 데이터 흐름·타입 계약

import { getToneJobFailureMessage } from '@/lib/tone-job/contract';
import { songSlug } from '@/lib/data/slugify';
import type { ToneJobStatus } from '@/lib/tone-job/contract';
import type { BodyArchetype } from '@/lib/pipeline/types';

// DB 행 타입 (tone_jobs 테이블).
export interface ToneJob {
  id: string;
  request: {
    artist: string;
    title: string;
    guitar: string;
    processor: string;
  };
  song_id: string | null;
  body_archetype: BodyArchetype | null;
  processor_id: string | null;
  status: ToneJobStatus;
  progress: Record<string, string>;
  failure_reason: string | null;
  failure_detail: string | null;
  created_at: string;
  updated_at: string;
}

// 클라 응답 타입 (GET /api/jobs/[id]).
export interface JobStatusResponse {
  status: ToneJobStatus;
  songSlug?: string;
  failureReason?: string;
  progressLabels?: Record<string, boolean>;
}

/**
 * tone_jobs 행을 클라 폴링 응답으로 변환.
 * - done 상태면 곡 상세로 이동하기 위해 songSlug 포함.
 * - failed 상태면 사용자 문구 failureReason 포함.
 * - failure_detail은 절대 노출하지 않음(내부 로깅만).
 */
export function buildJobStatusResponse(job: ToneJob): JobStatusResponse {
  const response: JobStatusResponse = {
    status: job.status,
  };

  if (job.status === 'done') {
    // 곡 상세 URL 구성: song_id가 있으면 request에서 정규화된 slug 계산.
    // (song_id가 없으면 request 원본 값으로도 같은 결과 — songSlug 함수는 내부 정규화).
    response.songSlug = songSlug(job.request.artist, job.request.title);
  }

  if (job.status === 'failed') {
    // 사용자 문구로 변환 (실패 사유 카탈로그).
    response.failureReason = getToneJobFailureMessage(job.failure_reason);
  }

  return response;
}
