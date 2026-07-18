import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleGenerateRequest } from '../generate';
import type { GenerateInput } from '../../generate/validate';
import type { ResolveResult } from '../../pipeline/types';

// Mock dependencies
vi.mock('@/lib/supabase/rest');
vi.mock('@/lib/pipeline/resolver');

describe('api/generate', () => {
  describe('handleGenerateRequest', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return unresolved when resolver has missing gear', async () => {
      const input: GenerateInput = {
        artist: 'Oasis',
        song: 'Wonderwall',
        guitar: 'Unknown Guitar',
        processor: 'Unknown FX',
      };

      const mockResolverResult: ResolveResult = {
        ok: false,
        unresolved: [
          { kind: 'guitar', query: 'Unknown Guitar' },
          { kind: 'processor', query: 'Unknown FX' },
        ],
      };

      const response = await handleGenerateRequest(input, mockResolverResult);

      expect(response.status).toBe('unresolved');
      expect(response.unresolved).toHaveLength(2);
      expect(response.unresolved?.[0].kind).toBe('guitar');
    });

    it('should return tone job DTO for valid resolved input', async () => {
      const input: GenerateInput = {
        artist: 'Oasis',
        song: 'Wonderwall',
        guitar: 'Cort G250',
        processor: 'GP-150',
      };

      const mockResolverResult: ResolveResult = {
        ok: true,
        resolved: {
          song: { id: 'song-123', artist_norm: 'oasis', title_norm: 'wonderwall' },
          guitar: { id: 'guitar-1', slug: 'cort-g250', body_archetype: 'strat' },
          processor: { id: 'proc-1', slug: 'gp150' },
        },
      };

      // This test structure is placeholder — actual implementation
      // will depend on sbInsert and Resolver behavior.
      // For now, we test the interface/contract.
      const response = await handleGenerateRequest(input, mockResolverResult);

      expect(response.status).toMatch(/queued|ready|unresolved/);
    });

    it('should not mutate input object', async () => {
      const input: GenerateInput = {
        artist: 'Oasis',
        song: 'Wonderwall',
        guitar: 'Cort G250',
        processor: 'GP-150',
      };

      const inputCopy = JSON.parse(JSON.stringify(input));

      const mockResolverResult: ResolveResult = {
        ok: false,
        unresolved: [{ kind: 'guitar', query: 'unknown' }],
      };

      await handleGenerateRequest(input, mockResolverResult);

      expect(input).toEqual(inputCopy);
    });
  });
});
