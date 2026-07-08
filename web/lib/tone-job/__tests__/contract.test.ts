import { describe, it, expect } from 'vitest';
import {
  TONE_JOB_STATUS_LABELS,
  TONE_JOB_FAILURE_MESSAGES,
  getToneJobStatusLabel,
  getToneJobFailureMessage,
} from '../contract';

describe('tone-job/contract', () => {
  describe('TONE_JOB_STATUS_LABELS', () => {
    it('should have all 7 statuses', () => {
      expect(Object.keys(TONE_JOB_STATUS_LABELS)).toHaveLength(7);
    });

    it('should have user-friendly labels for each status', () => {
      expect(TONE_JOB_STATUS_LABELS.queued).toBe('대기 중...');
      expect(TONE_JOB_STATUS_LABELS.resolving).toBe('곡 정보 확인 중...');
      expect(TONE_JOB_STATUS_LABELS.generating_canon).toBe('AI가 톤 분석 중...');
      expect(TONE_JOB_STATUS_LABELS.projecting).toBe('기기 세팅 변환 중...');
      expect(TONE_JOB_STATUS_LABELS.validating).toBe('검증 중...');
      expect(TONE_JOB_STATUS_LABELS.done).toBe('완료!');
      expect(TONE_JOB_STATUS_LABELS.failed).toBe('생성 실패');
    });
  });

  describe('TONE_JOB_FAILURE_MESSAGES', () => {
    it('should have user-friendly messages for each failure reason', () => {
      expect(TONE_JOB_FAILURE_MESSAGES['resolver:unresolved']).toBe(
        '입력 기어를 인식하지 못했어요 — 지원 준비중입니다.'
      );
      expect(TONE_JOB_FAILURE_MESSAGES['llm:timeout']).toBe(
        'AI 응답 시간 초과 — 잠시 후 다시 시도하세요'
      );
      expect(TONE_JOB_FAILURE_MESSAGES['canon:null_all_roles']).toBe(
        '이 곡의 톤 정보를 찾을 수 없었어요'
      );
      expect(TONE_JOB_FAILURE_MESSAGES['projector:no_mapping']).toBe(
        '이 기기로 출력할 수 없었어요 — 기어 추가 요청을 부탁합니다'
      );
      expect(TONE_JOB_FAILURE_MESSAGES['insert:failed']).toBe('결과 저장 실패 — 다시 시도하세요');
      expect(TONE_JOB_FAILURE_MESSAGES['internal:unknown']).toBe(
        '알 수 없는 오류 — 관리자에게 문의하세요'
      );
    });
  });

  describe('getToneJobStatusLabel', () => {
    it('should return correct label for valid status', () => {
      expect(getToneJobStatusLabel('queued')).toBe('대기 중...');
      expect(getToneJobStatusLabel('done')).toBe('완료!');
    });

    it('should return fallback for unknown status', () => {
      expect(getToneJobStatusLabel('unknown' as unknown as typeof TONE_JOB_STATUS_LABELS['queued'])).toBe(
        '알 수 없음'
      );
    });
  });

  describe('getToneJobFailureMessage', () => {
    it('should return correct message for known failure reason', () => {
      expect(getToneJobFailureMessage('resolver:unresolved')).toBe(
        '입력 기어를 인식하지 못했어요 — 지원 준비중입니다.'
      );
    });

    it('should return fallback for unknown failure reason', () => {
      expect(getToneJobFailureMessage('unknown:reason')).toBe(
        '알 수 없는 오류 — 관리자에게 문의하세요'
      );
    });

    it('should return fallback for null/undefined', () => {
      expect(getToneJobFailureMessage(null)).toBe('알 수 없는 오류 — 관리자에게 문의하세요');
      expect(getToneJobFailureMessage(undefined)).toBe('알 수 없는 오류 — 관리자에게 문의하세요');
    });
  });
});
