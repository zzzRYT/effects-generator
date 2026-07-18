// 파이프라인 오케스트레이션 — after() 콜백의 실체.
// 권위: docs/trd/r4-web-rewire.md Phase 3 + smoke-pipeline.ts 레퍼런스
// 단계: resolving → (캐논 캐시) → generating_canon → projecting → validating → done
// 실패: 어느 단계든 catch → failed + failure_reason(사용자 문구) + failure_detail(내부)

import { sbSelect, sbFetch } from '@/lib/supabase/rest';
import { generateCanon } from '@/lib/pipeline/generate';
import { projectSong } from '@/lib/pipeline/projector';
import type { GenerateInput } from '@/lib/generate/validate';
import type { ResolveResult } from '@/lib/pipeline/types';

// 의존성 주입 인터페이스 (테스트 시 목킹)
export interface PipelineRunnerDeps {
  sbSelect?: typeof sbSelect;
  sbFetch?: typeof sbFetch;
  generateCanon?: typeof generateCanon;
  projectSong?: typeof projectSong;
}

/**
 * tone_jobs 상태를 UPDATE한다.
 * status + progress jsonb + updated_at 갱신.
 */
async function updateJobStatus(
  jobId: string,
  status: string,
  progress: Record<string, string>,
  fetchFn: (path: string, opts: Parameters<typeof sbFetch>[1]) => Promise<Response>
): Promise<Record<string, string>> {
  const now = new Date().toISOString();
  // 단계 타임스탬프 누적 — 호출부가 반환값을 이어받아야 이전 단계 키가 후속 PATCH에서 유실되지 않는다.
  const merged = { ...progress, [`${status}_at`]: now };
  await fetchFn(`tone_jobs?id=eq.${jobId}`, {
    admin: true,
    method: 'PATCH',
    body: {
      status,
      progress: merged,
      updated_at: now,
    },
  });
  return merged;
}

/**
 * 파이프라인 실행: Resolver 결과 → 캐논 생성(또는 캐시) → 투영 → 검증 → 적재.
 * 모든 의존성 주입 가능 (테스트용 목킹).
 */
export async function runToneJobPipeline(
  jobId: string,
  request: GenerateInput,
  resolveResult: ResolveResult,
  deps: PipelineRunnerDeps = {}
): Promise<void> {
  const select = deps.sbSelect ?? sbSelect;
  const fetch = deps.sbFetch ?? sbFetch;
  const genCanon = deps.generateCanon ?? generateCanon;
  const proj = deps.projectSong ?? projectSong;

  if (!resolveResult.ok) {
    // Resolver 실패 (이 경로는 POST /api/generate에서 이미 차단됨 — 안전장치). 사유 없이 failed 로 남기지 않는다.
    await fetch(`tone_jobs?id=eq.${jobId}`, {
      admin: true,
      method: 'PATCH',
      body: {
        status: 'failed',
        failure_reason: 'resolver:unresolved',
        failure_detail: `안전장치 경로 — unresolved: ${JSON.stringify(resolveResult.unresolved)}`,
        updated_at: new Date().toISOString(),
      },
    });
    return;
  }

  const resolved = resolveResult.resolved;
  let progress: Record<string, string> = {};
  let songId = resolved.song.id;

  try {
    // ① resolving: 곡 리서치 캐시 확인
    progress = await updateJobStatus(jobId, 'resolving', progress, fetch);

    // ② 캐논 캐시 확인: song_id 존재 + canonical_tones 행 있으면 생성 생략.
    let canonicalTones: Array<{ id: string }> = [];
    if (songId) {
      try {
        canonicalTones = await select<{ id: string }>(
          'canonical_tones',
          `song_id=eq.${encodeURIComponent(songId)}&select=id&limit=1`,
          true
        );
      } catch {
        // 캐시 조회 오류 무시 — 생성으로 진행.
      }
    }

    if (!canonicalTones.length) {
      // 캐논 캐시 미스 → 생성 필요
      progress = await updateJobStatus(jobId, 'generating_canon', progress, fetch);

      const generated = await genCanon(
        {
          artist: request.artist,
          title: request.song,
          guitar: request.guitar,
          processor: request.processor,
        },
        resolved
      );

      songId = generated.songId;
    }

    // ③ projecting: 투영 실행
    progress = await updateJobStatus(jobId, 'projecting', progress, fetch);

    // 투영 결과(각 role persisted/null/skipped)는 tones 에 적재됨 — 결과 뷰가 role 상태를 표시.
    await proj({
      songId: songId!,
      bodyArchetype: resolved.guitar.body_archetype,
      processorId: resolved.processor.id,
    });

    // ④ validating: 게이트는 generate/project 내부에서 이미 수행 — UX 페이싱용 상태.
    progress = await updateJobStatus(jobId, 'validating', progress, fetch);

    // ⑤ done: tone_jobs에 song_id·body_archetype·processor_id 채우고 완료
    const now = new Date().toISOString();
    await fetch(`tone_jobs?id=eq.${jobId}`, {
      admin: true,
      method: 'PATCH',
      body: {
        status: 'done',
        song_id: songId,
        body_archetype: resolved.guitar.body_archetype,
        processor_id: resolved.processor.id,
        progress: { ...progress, done_at: now },
        updated_at: now,
      },
    });
  } catch (error: unknown) {
    // 파이프라인 오류: failed로 표시
    const errorMessage = error instanceof Error ? error.message : String(error);
    const failureReason = categorizeError(errorMessage);
    const now = new Date().toISOString();

    try {
      await fetch(`tone_jobs?id=eq.${jobId}`, {
        admin: true,
        method: 'PATCH',
        body: {
          status: 'failed',
          failure_reason: failureReason,
          failure_detail: errorMessage,
          updated_at: now,
        },
      });
    } catch (updateError) {
      // 실패 UPDATE도 실패 — 로깅만.
      console.error(`[tone-job] Failed to update job ${jobId} as failed:`, updateError);
    }
  }
}

/**
 * 오류 메시지 → 사용자 문구 분류.
 * TRD contract.ts 카탈로그와 정합.
 */
function categorizeError(message: string): string {
  // 보수적 분류 — 확실한 마커만 매칭하고 나머지는 internal:unknown.
  // 주의: 'null' 같은 범용 토큰 매칭 금지(일반 JS 오류 "Cannot read properties of null"을
  // "곡 톤 정보 없음"으로 오분류한다 — CE 리뷰에서 제거).
  if (message.includes('timeout') || message.includes('LLM 429') || message.includes('LLM 5')) return 'llm:timeout';
  if (message.includes('GEMINI_API_KEY') || message.includes('LLM_PROVIDER')) return 'internal:unknown';
  if (message.includes('Supabase')) return 'insert:failed';
  return 'internal:unknown';
}
