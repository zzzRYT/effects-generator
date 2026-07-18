import { describe, it, expect } from 'vitest';
import { buildJobStatusResponse } from '../jobs';
import type { ToneJob } from '../jobs';

describe('api/jobs', () => {
  describe('buildJobStatusResponse', () => {
    it('should return status for queued job', () => {
      const job: ToneJob = {
        id: 'test-1',
        request: { artist: 'Oasis', title: 'Wonderwall', guitar: 'Cort G250', processor: 'GP-150' },
        song_id: '123',
        body_archetype: 'strat',
        processor_id: 'proc-1',
        status: 'queued',
        progress: {},
        failure_reason: null,
        failure_detail: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const response = buildJobStatusResponse(job);
      expect(response.status).toBe('queued');
      expect(response.failureReason).toBeUndefined();
      expect(response.songSlug).toBeUndefined();
    });

    it('should return songSlug for done job', () => {
      const now = new Date();
      const job: ToneJob = {
        id: 'test-2',
        request: { artist: 'Oasis', title: 'Wonderwall', guitar: 'Cort G250', processor: 'GP-150' },
        song_id: '123',
        body_archetype: 'strat',
        processor_id: 'proc-1',
        status: 'done',
        progress: {},
        failure_reason: null,
        failure_detail: null,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };

      const response = buildJobStatusResponse(job);
      expect(response.status).toBe('done');
      expect(response.songSlug).toBe('oasis-wonderwall');
      expect(response.failureReason).toBeUndefined();
    });

    it('should return failureReason for failed job', () => {
      const job: ToneJob = {
        id: 'test-3',
        request: { artist: 'Oasis', title: 'Wonderwall', guitar: 'Cort G250', processor: 'GP-150' },
        song_id: null,
        body_archetype: null,
        processor_id: null,
        status: 'failed',
        progress: {},
        failure_reason: 'resolver:unresolved',
        failure_detail: 'Guitar not found',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const response = buildJobStatusResponse(job);
      expect(response.status).toBe('failed');
      expect(response.failureReason).toBe('입력 기어를 인식하지 못했어요 — 지원 준비중입니다.');
      expect(response.songSlug).toBeUndefined();
    });

    it('should have failureReason in label form', () => {
      const job: ToneJob = {
        id: 'test-4',
        request: { artist: 'Oasis', title: 'Wonderwall', guitar: 'Cort G250', processor: 'GP-150' },
        song_id: null,
        body_archetype: null,
        processor_id: null,
        status: 'failed',
        progress: {},
        failure_reason: 'canon:null_all_roles',
        failure_detail: 'No canon tones found',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const response = buildJobStatusResponse(job);
      expect(response.failureReason).toBe('이 곡의 톤 정보를 찾을 수 없었어요');
    });

    it('should not expose failure_detail to client', () => {
      const job: ToneJob = {
        id: 'test-5',
        request: { artist: 'Oasis', title: 'Wonderwall', guitar: 'Cort G250', processor: 'GP-150' },
        song_id: null,
        body_archetype: null,
        processor_id: null,
        status: 'failed',
        progress: {},
        failure_reason: 'insert:failed',
        failure_detail: 'UNIQUE constraint violation on canonical_tones',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const response = buildJobStatusResponse(job);
      expect(response).not.toHaveProperty('failureDetail');
      expect(JSON.stringify(response)).not.toContain('constraint violation');
    });

    it('should map progress timestamps for UI (optional)', () => {
      const job: ToneJob = {
        id: 'test-6',
        request: { artist: 'Oasis', title: 'Wonderwall', guitar: 'Cort G250', processor: 'GP-150' },
        song_id: '123',
        body_archetype: 'strat',
        processor_id: 'proc-1',
        status: 'generating_canon',
        progress: {
          resolving_at: '2026-07-08T12:00:00Z',
        },
        failure_reason: null,
        failure_detail: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const response = buildJobStatusResponse(job);
      expect(response.status).toBe('generating_canon');
    });
  });
});
