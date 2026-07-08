// 생성 API 비즈니스 로직 추상화 — Route Handler와 테스트의 공유 계층.
// 권위: docs/trd/r4-web-rewire.md §2 데이터 흐름

import { sbSelect } from '@/lib/supabase/rest';
import type { GenerateInput } from '@/lib/generate/validate';
import type { ResolveResult, UnresolvedGear } from '@/lib/pipeline/types';
import { songSlug } from '@/lib/data/slugify';

// 요청 응답 타입
export type GenerateResponse =
  | { status: 'queued'; jobId: string }
  | { status: 'ready'; slug: string }
  | { status: 'unresolved'; unresolved: UnresolvedGear[] };

// tone_jobs INSERT 용 DTO
export interface ToneJobInsertData {
  request: {
    artist: string;
    title: string;
    guitar: string;
    processor: string;
  };
  song_id: string | null;
  body_archetype: string | null;
  processor_id: string | null;
  status: 'queued';
  progress: Record<string, never>;
  failure_reason: null;
  failure_detail: null;
}

interface DbTone {
  id: string;
  signal_chain: unknown;
}

/**
 * 생성 요청을 처리한다.
 * 1. Resolver 결과 확인 — 미등록 기어면 unresolved 반환.
 * 2. 투영 캐시 확인 — 있으면 ready 반환.
 * 3. 없으면 queued 응답 반환 (route.ts가 tone_jobs INSERT → jobId 채움).
 */
export async function handleGenerateRequest(
  input: GenerateInput,
  resolveResult: ResolveResult
): Promise<GenerateResponse> {
  // 미등록 기어 → 즉시 unresolved 반환 (job 생성 안 함).
  if (!resolveResult.ok) {
    return {
      status: 'unresolved',
      unresolved: resolveResult.unresolved,
    };
  }

  const resolved = resolveResult.resolved;

  // 투영 캐시 확인: song_id + body_archetype + processor_id 조합으로 tones 존재 여부.
  // role별로 조회해서 최소 1개 있으면 캐시 히트로 판정.
  if (resolved.song.id) {
    try {
      const cachedTones = await sbSelect<DbTone>(
        'tones',
        `select=id&song_id=eq.${resolved.song.id}&body_archetype=eq.${resolved.guitar.body_archetype}&processor_id=eq.${resolved.processor.id}&limit=1`,
        false // public
      );
      if (cachedTones.length > 0) {
        // 캐시 히트 — 투영이 이미 존재.
        return {
          status: 'ready',
          slug: songSlug(input.artist, input.song),
        };
      }
    } catch {
      // 캐시 조회 실패는 무시 — queued로 진행.
    }
  }

  // 투영 캐시 미스 — queued 응답.
  // (route.ts에서 sbInsert 실행 후 buildGenerateJobResponse 호출).
  return {
    status: 'queued',
    jobId: '', // Placeholder — route.ts가 실제 INSERT 후 ID 채움.
  };
}

/**
 * tone_jobs INSERT 후 응답용 DTO.
 * route.ts는 sbInsert 실행 후 생성된 row의 id를 여기 채운다.
 */
export function buildGenerateJobResponse(jobId: string): GenerateResponse {
  return {
    status: 'queued',
    jobId,
  };
}
