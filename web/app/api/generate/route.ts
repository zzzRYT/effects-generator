// 톤 생성 API v2 — tone_jobs 큐 + after() 파이프라인.
// 권위: docs/trd/r4-web-rewire.md §2 데이터 흐름

import { after } from 'next/server';
import { validateGenerate } from '@/lib/generate/validate';
import { rateLimit } from '@/lib/generate/rateLimit';
import { resolveRequest } from '@/lib/pipeline/resolver';
import { handleGenerateRequest, buildGenerateJobResponse } from '@/lib/api/generate';
import { sbInsert } from '@/lib/supabase/rest';
import { runToneJobPipeline } from '@/lib/api/pipeline-runner';
import type { GenerateInput } from '@/lib/generate/validate';
import type { ToneJobInsertData } from '@/lib/api/generate';
import type { ToneJob } from '@/lib/api/jobs';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // TRD (a): Vercel Pro/Enterprise 최대

export async function POST(req: Request): Promise<Response> {
  // ① JSON 파싱
  let body: {
    artist?: unknown;
    song?: unknown;
    guitar?: unknown;
    processor?: unknown;
    botcheck?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: '잘못된 요청' }, { status: 400 });
  }

  // ② 허니팟 확인
  if (typeof body.botcheck === 'string' && body.botcheck.trim()) {
    return Response.json({ error: '요청이 거부되었어요' }, { status: 400 });
  }

  // ③ 입력 추출 & 검증 (4필드)
  const input: GenerateInput = {
    artist: String(body.artist ?? ''),
    song: String(body.song ?? ''),
    guitar: String(body.guitar ?? ''),
    processor: String(body.processor ?? ''),
  };

  const errors = validateGenerate(input);
  if (Object.keys(errors).length > 0) {
    return Response.json({ errors }, { status: 400 });
  }

  // ④ Rate limit (캐시 미스 시만, 일단 모든 요청에 적용 — TRD Phase 3 최적화).
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = rateLimit(ip);
  if (!rl.ok) {
    return Response.json(
      { error: `요청이 너무 잦아요 — ${rl.retryAfter ?? 60}초 후 다시 시도하세요` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter ?? 60) } }
    );
  }

  // ⑤ Resolver 호출 (곡·기타·이펙터 정규화)
  let resolveResult;
  try {
    // GenerateInput.song → ToneRequest.title 변환
    resolveResult = await resolveRequest({
      artist: input.artist,
      title: input.song,
      guitar: input.guitar,
      processor: input.processor,
    });
  } catch {
    return Response.json({ error: '기어 조회 실패' }, { status: 500 });
  }

  // ⑥ 로직 처리: unresolved/ready/queued
  const response = await handleGenerateRequest(input, resolveResult);

  if (response.status === 'unresolved') {
    return Response.json(response, { status: 200 });
  }

  if (response.status === 'ready') {
    // 캐시 히트 — 클라가 연출된 진행을 보여준 뒤 이동.
    return Response.json(response, { status: 200 });
  }

  // ⑦ tone_jobs INSERT (queued 상태)
  const jobData: ToneJobInsertData = {
    request: {
      artist: input.artist,
      title: input.song, // GenerateInput.song → request.title
      guitar: input.guitar,
      processor: input.processor,
    },
    song_id: resolveResult.ok ? resolveResult.resolved.song.id : null,
    body_archetype: resolveResult.ok ? resolveResult.resolved.guitar.body_archetype : null,
    processor_id: resolveResult.ok ? resolveResult.resolved.processor.id : null,
    status: 'queued',
    progress: {},
    failure_reason: null,
    failure_detail: null,
  };

  let insertedJob: ToneJob;
  try {
    const insertedRows = await sbInsert<ToneJob>('tone_jobs', jobData, { admin: true });
    insertedJob = insertedRows[0];
  } catch {
    return Response.json({ error: '작업 생성 실패' }, { status: 500 });
  }

  // ⑧ 즉시 202 응답 반환
  const jobResponse = buildGenerateJobResponse(insertedJob.id);

  // ⑨ after() 콜백: 파이프라인 백그라운드 실행 (응답 후)
  after(async () => {
    try {
      await runToneJobPipeline(insertedJob.id, input, resolveResult);
    } catch (error) {
      // 파이프라인 오류는 after() 실패로 취급 — 로깅만 (응답이 이미 전송됨)
      console.error(`[tone-job] Pipeline failed for job ${insertedJob.id}:`, error);
    }
  });

  return Response.json(jobResponse, { status: 202 });
}
