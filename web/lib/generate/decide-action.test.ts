import { describe, it, expect } from 'vitest';
import {
  decideAction,
  decideJobAction,
  shouldNavigateFromStaged,
  MIN_STAGED_MS,
  type GenerateApiResponse,
  type JobStatusResponse,
} from './decide-action';

describe('decideAction', () => {
  describe('queued 응답', () => {
    it('jobId가 있으면 poll 타입 반환', () => {
      const response: GenerateApiResponse = {
        status: 'queued',
        jobId: 'job-123',
      };
      const action = decideAction(response);
      expect(action.type).toBe('poll');
      expect(action.jobId).toBe('job-123');
    });
  });

  describe('ready 응답 (캐시 히트)', () => {
    it('slug가 있으면 stage 타입 반환 + labels 배열 포함', () => {
      const response: GenerateApiResponse = {
        status: 'ready',
        slug: 'oasis-dont-look-back',
      };
      const action = decideAction(response);
      expect(action.type).toBe('stage');
      expect(action.slug).toBe('oasis-dont-look-back');
      expect(Array.isArray(action.labels)).toBe(true);
      expect(action.labels!.length).toBeGreaterThan(0);
    });
  });

  describe('unresolved 응답', () => {
    it('미등록 기어 배열을 포함해 unresolved 타입 반환', () => {
      const response: GenerateApiResponse = {
        status: 'unresolved',
        unresolved: [
          { kind: 'guitar', query: 'fender custom' },
          { kind: 'processor', query: 'kemper profiler' },
        ],
      };
      const action = decideAction(response);
      expect(action.type).toBe('unresolved');
      expect(action.unresolved).toEqual(response.unresolved);
    });

    it('unresolved 배열이 없으면 빈 배열로 대체', () => {
      const response: GenerateApiResponse = {
        status: 'unresolved',
      };
      const action = decideAction(response);
      expect(action.type).toBe('unresolved');
      expect(action.unresolved).toEqual([]);
    });
  });

  describe('invalid 응답', () => {
    it('queued이지만 jobId가 없으면 error 타입', () => {
      const response: GenerateApiResponse = {
        status: 'queued',
      };
      const action = decideAction(response);
      expect(action.type).toBe('error');
    });

    it('ready이지만 slug가 없으면 error 타입', () => {
      const response: GenerateApiResponse = {
        status: 'ready',
      };
      const action = decideAction(response);
      expect(action.type).toBe('error');
    });
  });
});

describe('decideJobAction', () => {
  describe('done 상태', () => {
    it('songSlug가 있으면 navigate 타입 반환', () => {
      const response: JobStatusResponse = {
        status: 'done',
        songSlug: 'oasis-dont-look-back',
      };
      const action = decideJobAction(response);
      expect(action.type).toBe('navigate');
      expect(action.slug).toBe('oasis-dont-look-back');
    });

    it('songSlug가 없어도 navigate 타입 반환 (API 계약 보장)', () => {
      const response: JobStatusResponse = {
        status: 'done',
      };
      const action = decideJobAction(response);
      // done이면 무조건 navigate — API는 항상 songSlug를 포함해야 함
      expect(action.type).toBe('navigate');
      expect(action.slug).toBeUndefined();
    });
  });

  describe('failed 상태', () => {
    it('failureReason이 있으면 error 메시지와 함께 반환', () => {
      const response: JobStatusResponse = {
        status: 'failed',
        failureReason: 'resolver:unresolved',
      };
      const action = decideJobAction(response);
      expect(action.type).toBe('error');
      expect(action.message).toBe('입력 기어를 인식하지 못했어요 — 지원 준비중입니다.');
    });

    it('failureReason이 없으면 기본 메시지 반환', () => {
      const response: JobStatusResponse = {
        status: 'failed',
      };
      const action = decideJobAction(response);
      expect(action.type).toBe('error');
      expect(action.message).toContain('알 수 없는 오류');
    });

    it('알 수 없는 failureReason이면 기본 메시지 반환', () => {
      const response: JobStatusResponse = {
        status: 'failed',
        failureReason: 'unknown:foo:bar',
      };
      const action = decideJobAction(response);
      expect(action.type).toBe('error');
      expect(action.message).toContain('알 수 없는 오류');
    });
  });

  describe('진행 중 상태 (queued/resolving/...)', () => {
    it('queued이면 poll 타입 + 단계 레이블 반환', () => {
      const response: JobStatusResponse = {
        status: 'queued',
      };
      const action = decideJobAction(response);
      expect(action.type).toBe('poll');
      expect(Array.isArray(action.labels)).toBe(true);
      expect(action.labels!.length).toBe(1);
      expect(action.labels![0]).toBe('대기 중...');
    });

    it('generating_canon이면 poll 타입 + "AI가 톤 분석 중..." 레이블', () => {
      const response: JobStatusResponse = {
        status: 'generating_canon',
      };
      const action = decideJobAction(response);
      expect(action.type).toBe('poll');
      expect(action.labels![0]).toBe('AI가 톤 분석 중...');
    });

    it('validating이면 poll 타입 + "검증 중..." 레이블', () => {
      const response: JobStatusResponse = {
        status: 'validating',
      };
      const action = decideJobAction(response);
      expect(action.type).toBe('poll');
      expect(action.labels![0]).toBe('검증 중...');
    });
  });
});

describe('shouldNavigateFromStaged', () => {
  it('MIN_STAGED_MS 미만이면 false', () => {
    expect(shouldNavigateFromStaged(MIN_STAGED_MS - 1)).toBe(false);
    expect(shouldNavigateFromStaged(0)).toBe(false);
  });

  it('MIN_STAGED_MS 이상이면 true', () => {
    expect(shouldNavigateFromStaged(MIN_STAGED_MS)).toBe(true);
    expect(shouldNavigateFromStaged(MIN_STAGED_MS + 1)).toBe(true);
    expect(shouldNavigateFromStaged(100_000)).toBe(true);
  });

  it('MIN_STAGED_MS는 20초 상수', () => {
    expect(MIN_STAGED_MS).toBe(20_000);
  });
});
