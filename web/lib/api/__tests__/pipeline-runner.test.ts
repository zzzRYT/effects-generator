import { describe, it, expect, vi } from 'vitest';
import { runToneJobPipeline } from '../pipeline-runner';
import type { SbOptions } from '@/lib/supabase/rest';
import type { ResolveResult } from '@/lib/pipeline/types';

describe('pipeline-runner', () => {
  const mockJobId = 'job-test-1';
  const mockRequest = {
    artist: 'Oasis',
    title: 'Wonderwall',
    guitar: 'Cort G250',
    processor: 'GP-150',
  };
  const mockResolved: ResolveResult = {
    ok: true,
    resolved: {
      song: { id: 'song-123', artist_norm: 'oasis', title_norm: 'wonderwall' },
      guitar: { id: 'guitar-1', slug: 'cort-g250', body_archetype: 'strat' },
      processor: { id: 'proc-1', slug: 'gp150' },
    },
  };

  describe('runToneJobPipeline', () => {
    it('should execute normal path with correct state transitions: resolving→generating_canon→projecting→validating→done', async () => {
      const updateCalls: string[] = [];

      const mockSbFetch = vi.fn(async (path: string, opts: SbOptions) => {
        if (path.includes('tone_jobs') && opts.method === 'PATCH') {
          updateCalls.push((opts.body as Record<string, unknown>).status as string);
        }
        return new Response('{}');
      });

      const mockSbSelect = vi.fn(async (table: string) => {
        if (table === 'canonical_tones') {
          return []; // Cache miss
        }
        return [];
      });

      const mockGenerateCanon = vi.fn(async () => ({
        songId: 'song-123',
        roles: [
          { role: 'lead', status: 'ok' },
          { role: 'backing', status: 'ok' },
          { role: 'solo', status: 'ok' },
        ],
      }));

      const mockProjectSong = vi.fn(async () => ({
        roles: [
          { role: 'lead', status: 'ok' },
          { role: 'backing', status: 'ok' },
          { role: 'solo', status: 'ok' },
          { role: 'real_amp', status: 'ok' },
          { role: 'phone', status: 'ok' },
        ],
      }));

      await runToneJobPipeline(mockJobId, mockRequest, mockResolved, {
        sbSelect: mockSbSelect,
        sbFetch: mockSbFetch,
        generateCanon: mockGenerateCanon,
        projectSong: mockProjectSong,
      });

      // Assert state transition order
      expect(updateCalls).toEqual([
        'resolving',
        'generating_canon',
        'projecting',
        'validating',
        'done',
      ]);
    });

    it('should skip generating_canon when canon cache hit', async () => {
      const updateCalls: string[] = [];

      const mockSbFetch = vi.fn(async (path: string, opts: SbOptions) => {
        if (path.includes('tone_jobs') && opts.method === 'PATCH') {
          updateCalls.push((opts.body as Record<string, unknown>).status as string);
        }
        return new Response('{}');
      });

      const mockSbSelect = vi.fn(async (table: string) => {
        if (table === 'canonical_tones') {
          return [{ id: 'canon-1' }]; // Cache HIT
        }
        return [];
      });

      const mockGenerateCanon = vi.fn(); // Should not be called
      const mockProjectSong = vi.fn(async () => ({
        roles: [{ role: 'lead', status: 'ok' }],
      }));

      await runToneJobPipeline(mockJobId, mockRequest, mockResolved, {
        sbSelect: mockSbSelect,
        sbFetch: mockSbFetch,
        generateCanon: mockGenerateCanon,
        projectSong: mockProjectSong,
      });

      // Assert: generating_canon is skipped
      expect(updateCalls).toEqual([
        'resolving',
        'projecting', // Skip generating_canon
        'validating',
        'done',
      ]);
      expect(mockGenerateCanon).not.toHaveBeenCalled();
    });

    it('should handle generateCanon error with separate failure_reason and failure_detail', async () => {
      let failedUpdate: Record<string, unknown> | null = null;

      const mockSbFetch = vi.fn(async (path: string, opts: SbOptions) => {
        if (path.includes('tone_jobs') && opts.method === 'PATCH' && opts.body.status === 'failed') {
          failedUpdate = opts.body as Record<string, unknown>;
        }
        return new Response('{}');
      });

      const mockSbSelect = vi.fn(async (table: string) => {
        if (table === 'canonical_tones') return [];
        return [];
      });

      const mockGenerateCanon = vi.fn(async () => {
        throw new Error('LLM request timeout');
      });

      const mockProjectSong = vi.fn();

      await runToneJobPipeline(mockJobId, mockRequest, mockResolved, {
        sbSelect: mockSbSelect,
        sbFetch: mockSbFetch,
        generateCanon: mockGenerateCanon,
        projectSong: mockProjectSong,
      });

      // Assert: failure separated into user message + internal detail
      expect(failedUpdate).toBeDefined();
      expect(failedUpdate.status).toBe('failed');
      expect(failedUpdate.failure_reason).toBe('llm:timeout'); // User message from contract
      expect(failedUpdate.failure_detail).toContain('timeout'); // Original error
      expect(mockProjectSong).not.toHaveBeenCalled();
    });

    it('should populate song_id, body_archetype, processor_id in done state', async () => {
      let doneUpdate: Record<string, unknown> | null = null;

      const mockSbFetch = vi.fn(async (path: string, opts: SbOptions) => {
        if (path.includes('tone_jobs') && opts.method === 'PATCH' && opts.body.status === 'done') {
          doneUpdate = opts.body as Record<string, unknown>;
        }
        return new Response('{}');
      });

      const mockSbSelect = vi.fn(async (table: string) => {
        if (table === 'canonical_tones') return [];
        return [];
      });

      const mockGenerateCanon = vi.fn(async () => ({
        songId: 'song-123',
        roles: [{ role: 'lead', status: 'ok' }],
      }));

      const mockProjectSong = vi.fn(async () => ({
        roles: [{ role: 'lead', status: 'ok' }],
      }));

      await runToneJobPipeline(mockJobId, mockRequest, mockResolved, {
        sbSelect: mockSbSelect,
        sbFetch: mockSbFetch,
        generateCanon: mockGenerateCanon,
        projectSong: mockProjectSong,
      });

      // Assert: done update contains resolved values
      expect(doneUpdate).toBeDefined();
      expect(doneUpdate.status).toBe('done');
      expect(doneUpdate.song_id).toBe('song-123');
      expect(doneUpdate.body_archetype).toBe('strat');
      expect(doneUpdate.processor_id).toBe('proc-1');
    });

    it('should handle projectSong error gracefully', async () => {
      let failedUpdate: Record<string, unknown> | null = null;

      const mockSbFetch = vi.fn(async (path: string, opts: SbOptions) => {
        if (path.includes('tone_jobs') && opts.method === 'PATCH' && opts.body.status === 'failed') {
          failedUpdate = opts.body as Record<string, unknown>;
        }
        return new Response('{}');
      });

      const mockSbSelect = vi.fn(async () => []);

      const mockGenerateCanon = vi.fn(async () => ({
        songId: 'song-123',
        roles: [{ role: 'lead', status: 'ok' }],
      }));

      const mockProjectSong = vi.fn(async () => {
        throw new Error('Projector mapping failed for this config');
      });

      await runToneJobPipeline(mockJobId, mockRequest, mockResolved, {
        sbSelect: mockSbSelect,
        sbFetch: mockSbFetch,
        generateCanon: mockGenerateCanon,
        projectSong: mockProjectSong,
      });

      expect(failedUpdate).toBeDefined();
      expect(failedUpdate.status).toBe('failed');
      // projectSong 은 미매핑을 throw 하지 않는다(skipped 리포트) — throw 는 infra 오류뿐이라
      // 보수적 분류(internal:unknown)가 맞다. 원문은 failure_detail 에 보존.
      expect(failedUpdate.failure_reason).toBe('internal:unknown');
      expect(String(failedUpdate.failure_detail)).toContain('Projector mapping failed');
    });
  });
});
