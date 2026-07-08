# TRD — R4 웹 재배선: 캐논·투영 셀프서브 UI

- **Feature slug**: r4-web-rewire
- **PRD**: docs/prd/r4-web-rewire.md
- **설계 권위**: docs/plans/2026-07-06-canon-projection-revival-design.md
- **스키마**: supabase/migrations/20260706114215_r0_canon_projection_schema.sql

## 설계 요약

피벗 시절 깨진 웹 표면(R0에서 drop된 `patches`/`generation_jobs` 참조)을 파이프라인(R1~R3)에 재배선한다.
생성 폼(기타·이펙터 입력 추가) → `tone_jobs` 큐 → Next.js `after()` 백그라운드 파이프라인 → 진행 폴링 → **role 5탭 결과** (`tones.signal_chain` 렌더) → 카탈로그 재배선.

핵심 아키텍처:
- **API v2** (`POST /api/generate`): 요청 검증 → Resolver → tone_jobs INSERT(queued) + 즉시 `{jobId}` 응답
- **파이프라인**: `after()` 콜백에서 research→canon(캐시 미스)→project 실행, 각 단계마다 tone_jobs.status 갱신
- **폴링**: 클라가 `GET /api/jobs/[id]` 2.5s마다 호출, tone_jobs 상태 추적, done→곡 상세로 이동
- **UI 재배선**: GenerateForm(기어 입력 추가) → GenProgress 폴링 재사용 → `/songs/[slug]` role 5탭 + `/tones` 카탈로그

## 파일 목록 (생성/수정/삭제)

| 파일 | 역할 | 우선순위 | 수용기준 |
|------|------|---------|---------|
| **web/app/api/generate/route.ts** | 생성 API v2 재배선(tone_jobs INSERT + after 파이프라인) | P0 | A1–A6 |
| **web/app/api/jobs/[id]/route.ts** | 잡 폴링 API v2 (tone_jobs 조회) | P0 | B1–B2 |
| **web/lib/api/generate.ts** (신규) | 생성 API 비즈니스 로직 추상화 (요청→tone_jobs INSERT·tone_job 폴링 DTO) | P0 | A1–A6 |
| **web/lib/api/jobs.ts** (신규) | 폴링 응답 생성 (status→진행 문구, 실패 메시지) | P0 | B1–B2, C4 |
| **web/lib/tone-job/contract.ts** (신규) | tone_jobs 상태 매핑 (status enum ↔ 진행 문구 ↔ failure_reason 카탈로그) | P0 | C4 |
| **web/lib/data/catalog.ts** (수정) | 카탈로그 재배선: songs + tones 조회로 교체 (패치 참조 제거) | P0 | E1–E3 |
| **web/lib/data/adapt.ts** (삭제 또는 격리) | adaptPatch → tones 기반 Song 어댑터로 교체, 기존 패치 변환 로직 이월 | P0 | D1–D2 |
| **web/components/generate/GenerateForm.tsx** (수정) | 기타·이펙터 입력 필드 추가, unresolved 응답 처리 (문의 폼 프리필 유도) | P1 | C1–C4 |
| **web/components/generate/GenProgress.tsx** (수정) | tone_jobs status 폴링 (기존 패치 폴링 로직→tone_jobs 폴링) | P1 | C2–C3 |
| **web/app/songs/[slug]/page.tsx** (수정) | 조회 계층 재배선: getSongBySlug() 신 구현 (tones 기반 role 5탭) | P1 | D1–D6 |
| **web/components/song-detail/SongDetail.tsx** (수정 가능) | role 5탭 뷰 추가 (기존 패치 variation → tones role 탭) | P1 | D1–D6 |
| **web/app/tones/page.tsx** (신규 또는 수정) | 카탈로그 페이지 재배선 (tones 기반 목록) | P1 | E1–E3 |
| **web/lib/generate/validate.ts** (수정) | 검증 확장: 기타·이펙터 필드 추가 | P1 | A5, C1 |
| **web/lib/supabase/client.ts** (수정 가능) | rate limit: tone_jobs 만들기는 rate limit, 캐시 히트는 제외 | P0 | A5 |
| (삭제) `lib/patches.generated.ts` 참조 (PATCHES 싱글톤) | adaptPatch 제거 시 불필요 | P2 | A6 |
| (삭제) 모든 n8n 참조 (`N8N_GENERATE_WEBHOOK_URL` env) | 코드·env 전수 제거 | P0 | A6 |

## 데이터 흐름

```
[사용자 입력]
  artist + title + guitar(선택: 드롭다운 또는 자유텍스트)
  + processor(선택: 드롭다운 또는 자유텍스트)
  ↓
[POST /api/generate v2]
  1) 요청 검증 (validateGenerate 확장: 4필드)
  2) honeypot 확인
  3) rate limit 체크 (캐시 미스 시만)
  4) Resolver 호출:
     - 미등록 기어 → 200 { status:"unresolved", unresolved:[{kind,query}] } (여기서 종료)
     - OK → 진행
  5) tone_jobs INSERT:
     {
       request: {artist, title, guitar, processor},
       song_id: resolved.song.id,
       body_archetype: resolved.guitar.body_archetype,
       processor_id: resolved.processor.id,
       status: 'queued',
       progress: {},
       failure_reason: null,
       failure_detail: null,
       created_at: now(),
       updated_at: now()
     }
  6) 즉시 응답: 202 { jobId }
  7) after() 콜백:
     → research(곡 리서치·캐시)
     → tone_jobs.status='resolving'
     → generateCanon (캐시 미스면, 아니면 생략)
     → tone_jobs.status='generating_canon'
     → projectSong
     → tone_jobs.status='projecting'
     → validateCanon + validateTones
     → tone_jobs.status='validating'
     → sbInsert(canonical_tones, tones)
     → tone_jobs.status='done'
     ☒ 오류 발생 시 → tone_jobs.status='failed', failure_reason(사용자 메시지), failure_detail(내부)
  ↓
[클라 폴링: GET /api/jobs/[jobId] 2.5s]
  응답: { status, songSlug?, failureReason? }
  상태별:
  - queued/resolving/generating_canon/projecting/validating: 진행 문구 표시
  - done: 곡 상세 URL 구성 (slugFromSongId 또는 tone_jobs.request 캐싱)
  - failed: 사용자 메시지 표시 + 재시도
  ↓
[결과: /songs/[slug] role 5탭]
  tones 조회: song_id + (선택) body_archetype·processor_id로 filtering
  역할별 렌더:
  - lead/backing/solo/real_amp/phone
  - signal_chain 있으면 SignalChain 렌더러 재사용
  - signal_chain null 이면 null_reason 표시 ("이 곡엔 이 파트 없음" 등)
  - 미적재(canonical_tones는 있는데 tones 없음): "이 기기로 낼 수 없음" + 기어 추가 요청 링크
```

## 이월 질문 해소안

### (a) Next.js `after()` 실행 한도

**확정**: maxDuration 사용, 기본값 Vercel ~5분(플랜 의존)

근거: `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/after.md`:
> `after` will run for the platform's default or configured max duration of your route. If your platform supports it, you can configure the timeout limit using the [`maxDuration`](/docs/app/api-reference/file-conventions/route-segment-config/maxDuration) route segment config.

**구현**:
```typescript
// web/app/api/generate/route.ts
export const maxDuration = 60; // 초 — Vercel Pro/Enterprise은 최대 900(15분)
```

**초과 리스크 vs 분할**:
- 파이프라인 실측: 신곡 30~42s (Gemini 실호출 포함), 캐시 히트 <5s
- tone_jobs.progress에 `{resolving_at, generating_canon_at, ...}` 기록 — 클라가 단계별 타임스탬프 보임
- 60s는 신곡 2배 마진 — 리스크 낮음. 정말 초과 시 → 2단 분할(research까지만 동기, project는 재진입)은 R4 비목표, R4+에서 필요 시 구현

### (b) tone_jobs 상태 전이 + 문구 매핑

**정의**: `tone_job_status` enum 6종 + 사용자 문구 매핑

상태 흐름:
```
queued → resolving → generating_canon → projecting → validating → done
                                                                  → failed
```

캐논 캐시 히트 시 생략 가능 (resolving → projecting).

**진행 문구 카탈로그** (web/lib/tone-job/contract.ts):
```typescript
export const TONE_JOB_STATUS_LABELS: Record<ToneJobStatus, string> = {
  queued: '대기 중...',
  resolving: '곡 정보 확인 중...',
  generating_canon: 'AI가 톤 분석 중...',
  projecting: '기기 세팅 변환 중...',
  validating: '검증 중...',
  done: '완료!',
  failed: '생성 실패',
};

export const TONE_JOB_FAILURE_MESSAGES: Record<string, string> = {
  'resolver:unresolved': '입력 기어를 인식하지 못했어요 — 지원 준비중입니다.',
  'llm:timeout': 'AI 응답 시간 초과 — 잠시 후 다시 시도하세요',
  'canon:null_all_roles': '이 곡의 톤 정보를 찾을 수 없었어요',
  'projector:no_mapping': '이 기기로 출력할 수 없었어요 — 기어 추가 요청을 부탁합니다',
  'insert:failed': '결과 저장 실패 — 다시 시도하세요',
  'internal:unknown': '알 수 없는 오류 — 관리자에게 문의하세요',
};
```

failure_reason (사용자): 위 카탈로그에서 매핑
failure_detail (내부): 원본 Error.message, stack (로깅 전용, 응답에 미노출)

### (c) 곡 slug 규칙

**확정**: 마이그레이션 불필요 — `songSlug(artist,title)` 재사용

이유:
- songs 테이블은 artist_norm·title_norm로 유니크 보장
- 기존 `lib/data/slugify.ts`의 `songSlug()` 재사용 (정규화 동일)
- slug 컬럼 추가는 선택적(인덱스 성능용) — R4 불필요

구현:
```typescript
// web/lib/data/catalog.ts — getSongBySlug(slug) 재구현
export async function getSongBySlug(slug: string): Promise<SongDetail | null> {
  // ① 입력 slug 정규화 (URL param은 NFD)
  const target = decodeSlugParam(slug);
  
  // ② songs 전체 조회해서 songSlug 계산 비교
  const songs = await sbSelect<DbSong>("songs", "select=*");
  const song = songs.find((s) => songSlug(s.artist, s.title) === target);
  if (!song) return null;
  
  // ③ tone_jobs 상태 확인 (진행 중인 잡이 있으면 표시)
  // ④ tones 조회: song_id + (선택) guitar/processor 필터
  // ⑤ canonical_tones 조회: null_reason 위해
  // ⑥ SongDetail 어댑터로 변환
}

// 타입
interface SongDetail {
  song: { artist: string; title: string };
  tones: {
    role: ToneRole;
    signal_chain: Block[] | null;
    null_reason: string | null;
    label?: string; // real_amp/phone의 파생 표기
  }[];
  ongoingJob?: { status: ToneJobStatus };
}
```

### (d) 구 코드 제거 범위

**grep 결과** (2026-07-06 재검사 필요하지만 예상 대상):

제거:
```
web/app/api/generate/route.ts     — n8n 웹훅, generation_jobs 참조
web/app/api/jobs/[id]/route.ts    — generation_jobs 참조
web/lib/data/catalog.ts            — patches 참조
web/lib/data/adapt.ts              — DbPatch, adaptPatch
lib/patches.generated.ts (참조만)  — PATCHES 싱글톤 (생성 불필요하면 유지 가능)
env: N8N_GENERATE_WEBHOOK_URL      — .env.local 제거
```

유지 또는 격리:
```
web/lib/generate/validate.ts       — 확장(4필드), 기존 로직 유지
web/lib/generate/rateLimit.ts      — 유지 (tone_jobs INSERT에만 적용)
web/components/generate/*.tsx      — 극소 수정 (폼 필드 + unresolved 처리)
web/components/song-detail/        — role 탭 추가, 기존 variation 뷰 유지 가능(선택)
```

## 타입 계약

### tone_jobs 행 (신 스키마)

```typescript
interface ToneJob {
  id: string; // uuid, pk
  request: {
    artist: string;
    title: string;
    guitar: string;
    processor: string;
  };
  song_id: string | null; // 신곡이면 null → 캐논 생성 후 채움
  body_archetype: BodyArchetype | null; // Resolver 성공하면 채움
  processor_id: string | null; // 위와 동일
  status: ToneJobStatus; // enum: queued | resolving | generating_canon | projecting | validating | done | failed
  progress: {
    resolving_at?: string; // ISO timestamp
    generating_canon_at?: string;
    projecting_at?: string;
    validating_at?: string;
  };
  failure_reason: string | null; // 사용자 메시지 (TONE_JOB_FAILURE_MESSAGES에서 키)
  failure_detail: string | null; // 내부 Error.message (응답에 미노출)
  created_at: string; // ISO timestamp
  updated_at: string; // trigger set_updated_at()
}
```

### API 응답 (신)

```typescript
// POST /api/generate 성공 케이스 3가지
type GenerateResponse =
  | { status: 'queued'; jobId: string } // 202, 새 잡
  | { status: 'ready'; slug: string } // 200, 캐시 히트
  | { status: 'unresolved'; unresolved: UnresolvedGear[] }; // 200, 미등록 기어

// GET /api/jobs/[id]
interface JobStatusResponse {
  status: ToneJobStatus;
  songSlug?: string; // done 시에만
  failureReason?: string; // failed 시에만
  progressLabels?: Record<ToneJobStatus, boolean>; // UI 연출용 (선택)
}
```

### 곡 상세 조회 (신)

```typescript
// GET /songs/[slug]
interface SongDetailPageProps {
  song: {
    id: string;
    artist: string;
    title: string;
    genre?: string;
  };
  tones: ToneDetailView[]; // role 5종, null/skip 포함
  ongoingJob?: {
    status: ToneJobStatus;
    progress: ToneJob['progress'];
  };
}

interface ToneDetailView {
  role: ToneRole; // lead | backing | solo | real_amp | phone
  signalChain: Block[] | null; // lib/types.ts Block (model 포함)
  nullReason?: string; // chain === null 시
  sourceRole?: ToneRole; // real_amp/phone의 파생 원본 (예: 'lead')
  enabled: boolean;
}
```

## 테스트 계획

| 수용기준 | 테스트 유형 | 파일 | 케이스 |
|---------|-----------|------|--------|
| **A1** | 유닛 (Vitest) | web/lib/api/generate.test.ts | 유효 입력 → tone_jobs INSERT 결과 DTO |
| **A1** | E2E (Playwright) | web/e2e/generate.spec.ts | 폼 제출 → 202 { jobId } (캐시 미스) |
| **A2** | 통합 (Node) | web/scripts/smoke-pipeline.ts (재사용) | 실제 after() 콜백 실행 확인 (라이브) |
| **A3** | 유닛 | web/lib/api/generate.test.ts | unresolved 응답 DTO (미등록 기어) |
| **A3** | E2E | web/e2e/generate.spec.ts | 미등록 기어 입력 → 200 { status: 'unresolved' } |
| **A4** | 유닛 | web/lib/api/jobs.test.ts | failure_reason 매핑 (실패 상태 DTO) |
| **A5** | 유닛 | web/lib/generate/validate.test.ts | 4필드 검증 (기존 + 기타·이펙터) |
| **A5** | 유닛 | web/lib/generate/rateLimit.test.ts | 생성 전용 제한 (캐시 미스) |
| **A6** | 정적 분석 | grep | n8n, generation_jobs, patches 참조 0건 |
| **B1** | 유닛 | web/lib/api/jobs.test.ts | tone_jobs 조회 → status 응답 |
| **B2** | 유닛 | web/lib/api/jobs.test.ts | 404 (존재하지 않는 jobId) |
| **C1** | E2E | web/e2e/generate.spec.ts | 폼에 기타·이펙터 입력 필드 존재 |
| **C2** | E2E | web/e2e/generate.spec.ts | 제출 → GenProgress 진행 표시 → done → 곡 상세 |
| **C3** | E2E | web/e2e/generate.spec.ts | unresolved 응답 → "지원 준비중" + 문의 폼 링크 |
| **C4** | E2E | web/e2e/generate.spec.ts | tone_jobs status 변화에 따라 진행 문구 갱신 |
| **D1** | E2E | web/e2e/song-detail.spec.ts | /songs/[slug] 로드 → tones 조회 성공 |
| **D2** | 컴포넌트 (Vitest) | web/components/song-detail/SongDetail.test.tsx | signal_chain → SignalChain 렌더 (블록 렌더러 무수정) |
| **D3** | E2E | web/e2e/song-detail.spec.ts | null_reason 표시 (null role) |
| **D4** | E2E | web/e2e/song-detail.spec.ts | 미적재 역할 → "이 기기로 낼 수 없음" + 기어 요청 링크 |
| **D5** | E2E | web/e2e/song-detail.spec.ts | real_amp/phone 탭에 파생 소스 표기 (예: "lead 파생") |
| **D6** | 비주얼 (Playwright) | web/e2e/song-detail.visual.spec.ts | 320/768/1024/1440 폭에서 오버플로 없음 (snapshot) |
| **E1** | E2E | web/e2e/catalog.spec.ts | /tones 목록에 tones 있는 곡만 노출 |
| **E2** | E2E | web/e2e/catalog.spec.ts | 목록 항목 클릭 → 곡 상세로 이동 |
| **E3** | E2E | web/e2e/catalog.spec.ts | 빈 상태(곡 2개 미만) → 생성 유도 CTA |
| **F1** | CI | lint & type | eslint·tsc 통과 (커밋 전 훅) |
| **F2** | CI | coverage | 유닛 테스트 커버리지 ≥80% |
| **F3** | 수동 (QA) | 개발 환경 | dev 서버에서 신곡 1건 생성 → 5탭 모두 렌더 확인 |

## 엣지케이스 + 처리

| 케이스 | 현상 | 처리 |
|--------|------|------|
| **이중 제출** | 사용자가 폼을 빠르게 2번 클릭 | 폼 제출 중(submitting) 플래그로 버튼 비활성화 |
| **폴링 중 이탈** | 사용자가 진행 중 뒤로 가기 | 페이지 이탈 시 폴링 cleanup (React.useEffect cleanup) |
| **done인데 tones 0행** | canonical_tones는 있으나 투영 전부 실패 | tone_jobs.status='done' → 곡 상세 이동 → 모든 role에서 "이 기기로 낼 수 없음" 표시 |
| **캐논만 있고 투영 실패** | 특정 role 캐논 있는데 tones 없음(투영 미매핑) | skipped 판정: "이 기기로 낼 수 없음" (D4 처리와 동일) |
| **잡 3분 초과** | after() maxDuration 60초 초과 | tone_jobs.status='failed', failure_reason='시간 초과', 사용자 재시도 가능 |
| **동시 같은 곡 생성** | 잡 A 진행 중 같은 곡 잡 B 시작 | 캐논은 (song_id, role) 유니크 → 충돌 시 ON CONFLICT UPDATE (upsert)로 처리, tones는 version으로 누적 |
| **네트워크 끊김(폴링 중)** | 폴링 실패 (fetch 실패 또는 500) | GenProgress에서 재시도 자동(기하급수 백오프 또는 고정 interval) |
| **Resolver 캐시 미스(신곡)** | 미등록 곡 → canonical_tones 생성 필요 | tone_jobs.status='generating_canon' → Gemini 실호출 → 신곡 리서치 캐시 생성 |
| **기어 드롭다운이 empty** | approved 기어 0개 (초기 상태) | "직접 입력" 선택지만 표시, 입력란 활성화 |

## 새 의존성

0개 (기존 라이브러리 조합)

- 파이프라인: 이미 R1에서 구현 (lib/pipeline/*)
- UI: 기존 컴포넌트 재사용 (GenProgress, SignalChain)
- 폴링: fetch + React.useEffect (표준)

## 구현 순서 (의존성 기반)

### Phase 1 — 타입·계약
1. `web/lib/tone-job/contract.ts` — tone_jobs 상태·문구 매핑
2. `web/lib/api/jobs.ts` — 폴링 DTO 생성

### Phase 2 — 검증·API
3. `web/lib/generate/validate.ts` — 4필드 검증 함수 (유닛 테스트 포함)
4. `web/app/api/generate/route.ts` v2 — 요청 → tone_jobs INSERT + after()
5. `web/app/api/jobs/[id]/route.ts` v2 — tone_jobs 조회 → DTO

### Phase 3 — 데이터 계층
6. `web/lib/data/catalog.ts` — getSongBySlug(sql) 재구현 (tones 기반)
7. `web/lib/data/adapt.ts` — DbTone → SongDetailView 어댑터 (신규)

### Phase 4 — UI
8. `web/components/generate/GenerateForm.tsx` — 기타·이펙터 필드 + unresolved 처리
9. `web/components/generate/GenProgress.tsx` — tone_jobs status 폴링 (기존 폴링 로직 교체)
10. `web/app/songs/[slug]/page.tsx` — 데이터 계층 교체
11. `web/components/song-detail/SongDetail.tsx` — role 5탭 뷰 (신규)

### Phase 5 — 테스트 & 정리
12. 유닛 테스트 (Vitest) — 각 모듈 (validate, contract, jobs, api/generate)
13. E2E 테스트 (Playwright) — 생성·폴링·곡 상세·카탈로그 플로우
14. 비주얼 리그레션 (Playwright screenshots) — D6
15. 구 코드 제거 & 정적 분석

### Phase 6 — 수동 QA
16. dev 서버에서 라이브 테스트 (신곡 1건 5탭 생성)
17. tone_jobs 상태 전이 실제 확인 (DB 모니터링)

---

## 리뷰 보강 (Fable, 2026-07-08 — TRD 게이트 통과 조건)

초안 검토에서 추가 확정한 2건. 구현은 아래를 포함해야 한다.

### 1. 좀비 잡 가드 (lazy timeout)
`after()` 프로세스가 중간에 죽으면(배포·타임아웃·크래시) 잡이 비종결 상태(`resolving`~`validating`)로 영구 잔류한다 — 클라 3분 폴링 타임아웃만으로는 DB에 좀비가 남는다. **`GET /api/jobs/[id]`가 lazy 판정**: 조회한 잡이 비종결 status && `updated_at`이 3분(상수 `JOB_STALE_MS`) 이상 경과 → 그 자리에서 `failed` + `failure_reason="생성 시간 초과 — 다시 시도해 주세요"` + `failure_detail="stale-job guard"`로 UPDATE 후 failed 응답. 크론 없이 결정적, 재시도 경로 자연 연결. (유닛 테스트 필수: 경과/미경과 경계.)

### 2. 캐시 히트에도 연출된 진행 (헌법 §캐시-우선)
`POST /api/generate`가 `{status:"ready", slug}`(투영까지 캐시 존재)를 반환해도 클라는 **즉시 이동하지 않는다** — 헌법의 "연출된 진행(20~40초) 후 반환"(신뢰성 연출, 설계 §0)에 따라 GenProgress를 최소 연출 시간(`MIN_STAGED_MS = 20_000`, 상수로 조정 가능) 동안 보여준 뒤 이동한다. queued 경로는 실제 파이프라인 시간(실측 30~42s)이 자연 연출이 된다. (컴포넌트 테스트: ready 응답 시 즉시 네비게이션이 일어나지 않음.)

### 게이트 판정
- 수용 기준 ↔ 파일·테스트 1:1 매핑: ✅ (본문 표)
- 이월 질문 4건 해소: ✅ (a) maxDuration=60 (b) 문구 매핑표 (c) songSlug 계산 재사용·마이그레이션 없음 (d) 구 코드 전수 목록
- 새 의존성 0: ✅
