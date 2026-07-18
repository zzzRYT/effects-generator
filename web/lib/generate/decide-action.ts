// 생성 API 응답 → 다음 행동 결정 로직 (순수).
// GenerateForm·GenProgress에서 호출. 테스트 분리용 모듈.
// 권위: docs/trd/r4-web-rewire.md §2 C2~C4

import { getToneJobStatusLabel, getToneJobFailureMessage, type ToneJobStatus } from '@/lib/tone-job/contract';

/** 캐시 히트 시 연출 모드 유지 시간 (밀리초) */
export const MIN_STAGED_MS = 20_000;

/** POST /api/generate 응답 타입 */
export interface GenerateApiResponse {
  status: 'queued' | 'ready' | 'unresolved';
  jobId?: string;
  slug?: string;
  unresolved?: Array<{ kind: string; query: string }>;
}

/** GET /api/jobs/[id] 응답 타입 */
export interface JobStatusResponse {
  status: ToneJobStatus;
  songSlug?: string;
  failureReason?: string | null;
}

/** 다음 행동 의사결정 결과 */
export interface NextAction {
  type: 'poll' | 'stage' | 'navigate' | 'unresolved' | 'error';
  /** type=poll: jobId */
  jobId?: string;
  /** type=navigate: slug (songSlug) */
  slug?: string;
  /** type=unresolved: 미등록 기어 배열 */
  unresolved?: Array<{ kind: string; query: string }>;
  /** type=error: 사용자 메시지 */
  message?: string;
  /** type=stage: 단계 문구 배열(순환용, 스크린리더 미제외) */
  labels?: string[];
}

/**
 * POST /api/generate 응답 → 다음 행동 (A1, A3, C3 분기)
 * - queued → poll 시작
 * - ready → stage 모드(MIN_STAGED_MS 유지) + 타이밍 후 navigate
 * - unresolved → unresolved 분기(폼으로 돌아가거나 요청 폼 프리필 링크 표시)
 */
export function decideAction(response: GenerateApiResponse): NextAction {
  if (response.status === 'unresolved') {
    return {
      type: 'unresolved',
      unresolved: response.unresolved || [],
    };
  }

  if (response.status === 'queued' && response.jobId) {
    return {
      type: 'poll',
      jobId: response.jobId,
    };
  }

  if (response.status === 'ready' && response.slug) {
    // 캐시 히트 → 연출 모드: 실시간 폴링 없이 단계 문구 순환 표시
    const stageLabels = [
      '대기 중...',
      '곡 정보 확인 중...',
      '기기 세팅 변환 중...',
      '검증 중...',
    ];
    return {
      type: 'stage',
      slug: response.slug,
      labels: stageLabels,
    };
  }

  return {
    type: 'error',
    message: '알 수 없는 응답이에요',
  };
}

/**
 * GET /api/jobs/[id] 응답 → 다음 행동 (B1, C2, C4)
 * - done → navigate (slug는 API가 보장)
 * - failed → error (UI에서 재시도 버튼 제공)
 * - queued/resolving/... → poll 계속 (레이블은 contract에서 가져옴)
 */
export function decideJobAction(response: JobStatusResponse): NextAction {
  if (response.status === 'done') {
    return {
      type: 'navigate',
      slug: response.songSlug,
    };
  }

  if (response.status === 'failed') {
    const message = getToneJobFailureMessage(response.failureReason);
    return {
      type: 'error',
      message,
    };
  }

  // queued/resolving/generating_canon/projecting/validating: 계속 폴링
  // 단계별 레이블을 클라에서 선택 사용
  const label = getToneJobStatusLabel(response.status);
  return {
    type: 'poll',
    labels: [label],
  };
}

/**
 * 캐시 히트(ready) 모드에서 MIN_STAGED_MS 경과 후 네비게이션 여부 판정
 * @param elapsedMs 시작 후 경과 시간(밀리초)
 * @returns 네비게이션할지 여부
 */
export function shouldNavigateFromStaged(elapsedMs: number): boolean {
  return elapsedMs >= MIN_STAGED_MS;
}
