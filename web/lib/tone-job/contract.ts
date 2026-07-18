// tone_jobs 상태 매핑 계약.
// 권위: docs/trd/r4-web-rewire.md §(b) tone_jobs 상태 전이 + 문구 매핑

export const TONE_JOB_STATUSES = [
  'queued',
  'resolving',
  'generating_canon',
  'projecting',
  'validating',
  'done',
  'failed',
] as const;

export type ToneJobStatus = (typeof TONE_JOB_STATUSES)[number];

// 진행 문구 카탈로그 (UI 폴링 응답)
export const TONE_JOB_STATUS_LABELS: Record<ToneJobStatus, string> = {
  queued: '대기 중...',
  resolving: '곡 정보 확인 중...',
  generating_canon: 'AI가 톤 분석 중...',
  projecting: '기기 세팅 변환 중...',
  validating: '검증 중...',
  done: '완료!',
  failed: '생성 실패',
};

// 실패 사유 사용자 문구 카탈로그
export const TONE_JOB_FAILURE_MESSAGES: Record<string, string> = {
  'resolver:unresolved': '입력 기어를 인식하지 못했어요 — 지원 준비중입니다.',
  'llm:timeout': 'AI 응답 시간 초과 — 잠시 후 다시 시도하세요',
  'canon:null_all_roles': '이 곡의 톤 정보를 찾을 수 없었어요',
  'projector:no_mapping': '이 기기로 출력할 수 없었어요 — 기어 추가 요청을 부탁합니다',
  'insert:failed': '결과 저장 실패 — 다시 시도하세요',
  'internal:unknown': '알 수 없는 오류 — 관리자에게 문의하세요',
};

export function getToneJobStatusLabel(status: ToneJobStatus): string {
  return TONE_JOB_STATUS_LABELS[status] ?? '알 수 없음';
}

export function getToneJobFailureMessage(failureReason: string | null | undefined): string {
  if (!failureReason) {
    return TONE_JOB_FAILURE_MESSAGES['internal:unknown'];
  }
  return TONE_JOB_FAILURE_MESSAGES[failureReason] ?? TONE_JOB_FAILURE_MESSAGES['internal:unknown'];
}
