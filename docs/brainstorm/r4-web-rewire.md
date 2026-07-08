# Brainstorm — r4-web-rewire (캐논·투영 부활 R4)

> 트랙 2 루프 step 0 산출물. 고른 방향 + 버린 대안 + 이월 질문.
> 권위 설계: `docs/plans/2026-07-06-canon-projection-revival-design.md` §2·§6 R4 · 루프: `docs/web-harness.md`.
> 사용자 결정(2026-07-08): **1사이클 통째** + **tone_jobs 큐+폴링**.

## 무엇

피벗 시절 웹 표면(생성 폼·카탈로그·곡 상세)을 **캐논·투영 파이프라인(R1~R3, 라이브 검증됨)에 재배선**한다.
생성 폼(기어 입력 확장) → `tone_jobs` 큐 → 연출된 진행 → **role 5탭 결과 뷰**(`tones.signal_chain` 렌더) → 카탈로그(생성 누적).

**시급성:** 현 페이지·API는 R0에서 drop된 `patches`/`generation_jobs`를 읽는다 — **런타임에서 깨진 상태**(카탈로그 조회·생성 API 모두 실패). R4는 기능 추가이기 전에 복구다.

## 자산 인벤토리 (2026-07-08 탐색)

- **그대로 재사용**: 시그널 체인 렌더러 3종(`components/signal-chain/` — `Block[]` 입력, `tones.signal_chain`과 동일 모양이라 마운트만 하면 됨) · 토큰/blockType 색상 시스템 · `GenerateForm` 폼 구조 · `StrumLoader`+`GenProgress` 진행 UX · 폴링 패턴(`/api/jobs/[id]`, 2.5s) · 문의 폼 이중모드(native+island) · `SongFilterClient`.
- **재배선**: `/api/generate`(n8n 웹훅 잔재 → 파이프라인 직접 호출) · `/api/jobs/[id]`(generation_jobs → tone_jobs) · 데이터 어댑터(`adaptPatch` → tones 기반) · `/tones`·`/songs/[slug]` 조회 계층.
- **신규**: 폼의 기어 입력(기타·이펙터) · role 5탭 결과 뷰 · 미등록 기어 안내(문의 유도) · skipped/null role 상태 표시.

## 고른 방향

### 실행 모델 — tone_jobs 큐 + 폴링 (사용자 확정)
- `POST /api/generate` = 검증 + Resolver + 캐논 캐시 판정 → `tone_jobs` INSERT(queued) + 즉시 `{jobId}` 응답 → **`after()`(Next.js)에서 파이프라인 실행**: research→canon(§캐시 미스 시)→project, 단계마다 `tone_jobs.status`(`resolving/generating_canon/projecting/validating/done/failed`) 갱신.
- 클라 = 기존 GenProgress 폴링(2.5s) 재사용, `GET /api/jobs/[id]`가 tone_jobs를 읽음. done → 결과 페이지 이동.
- 실측 30~42s(신곡) — 캐시 히트여도 **연출된 진행**(헌법: 20~40초 신뢰성 연출)은 유지하되, 파이프라인이 실제로 도는 시간과 자연 정합.
- 미등록 기어: Resolver가 unresolved 반환 → job을 만들지 않고 즉시 `{status:"unresolved", unresolved:[…]}` → 폼이 "지원 준비중" + 문의 폼 유도(프리필).

### 폼 — 기어 입력은 "셀렉트 + 직접 입력" 하이브리드
- 기타·이펙터 각각: approved 목록 셀렉트(현재 cort-g250/xt-450 × valeton-gp150) + "직접 입력" 선택 시 자유 텍스트.
- 비전(곡+아티스트+내 기타+내 이펙터 4입력)을 지키면서, 개인용 v1에서 오입력을 줄인다. 자유 텍스트는 Resolver의 slugVariants가 흡수, 미등록이면 문의 유도.

### 결과 뷰 — role 5탭, 상태 3종
- URL: `/songs/[slug]?guitar=<slug>&proc=<slug>` (쿼리 생략 시 곡의 최신 tones 조합). 기존 `VariationTabs` 패턴을 role 탭으로 재매핑.
- 탭 상태: **성공**(signal_chain 렌더 — 기존 렌더러 그대로, 폴백/근사 매칭 notes는 v1 비표시·데이터만 보존) · **null**(`null_reason` 표시: "이 곡엔 이 파트 없음 — <사유>") · **미적재(skipped)**("이 기기로 낼 수 없음" + 미매핑 실기 목록 + 기어 추가 요청 유도). skipped는 tones에 행이 없으므로 **캐논 role 대비 tones 부재**로 판정.
- real_amp/phone 탭은 파생 소스 표기(label의 "real_amp 파생(lead)" 활용).

### 카탈로그 — tones 기반 재배선
- `/tones` 목록·`/songs/[slug]` 상세를 `songs`+`tones`(+`canonical_tones` null_reason) 조회로 교체. 어댑터는 tones 행들 → 렌더러 입력 모양으로 얇게 변환(렌더러 무수정).
- RLS: tones·songs는 공개 읽기(익명 키) — 현행 유지.

### 문의 폼 — 유형 확장은 R6로, 링크만 이번에
- "기타·이펙터 추가 요청" 전용 유형·필드는 백로그 `request-form-v2`(R6) 스코프 유지. R4는 미등록 기어 안내에서 기존 폼으로 **프리필 링크**(메모에 기어명 주입)만 건다.

## 버린 대안

- **동기 Route Handler**: 구현 최단이나 30~60s 동기 대기 = Vercel 타임아웃·연결 끊김·이중 제출 리스크. 스키마의 tone_jobs가 이미 있는데 안 쓰는 것도 어색. → 기각.
- **Supabase Realtime 구독**: 폴링보다 즉각적이나 클라 구독 코드·번들 추가. 개인용 v1 과잉 — 폴링 패턴이 이미 검증돼 있음. 필요 시 후속 교체. → 보류.
- **2~3사이클 분할**: 하네스 "피처 1개" 규칙엔 더 맞으나, 카탈로그·생성이 같은 어댑터·조회 계층을 공유하고 현재 둘 다 깨져 있어 반쪽 복구가 됨. 사용자 결정으로 1사이클. → 기각.
- **렌더러 재작성/redesign**: `Block[]` 계약이 동일해 불필요. 디자인 개편은 별도 사이클. → 기각.

## 이월 질문 (PRD/TRD에서 확정)

1. **tone_jobs 상태 전이·에러 계약** — status enum 6종을 진행 UX 문구에 어떻게 매핑하나. failed 시 `failure_reason` 사용자 문구/내부 상세 분리(07-04 §7).
2. **Vercel `after()` 실행 시간 한도** — 플랜별 백그라운드 한도 확인, 초과 리스크 시 단계 분할(research/canon/project 을 잡 재진입으로) 여부. TRD에서 확정.
3. **기타 세팅(GuitarSetting) 표시** — 캐논엔 기타 본체 세팅이 없음(피벗 patches 전용 데이터). v1 결과 뷰에서 생략할지, 픽업 가이드(guitars.selector_positions)로 대체할지.
4. **곡 slug 규칙** — 구 `patches` 기반 slug와 신 `songs` 정규화의 매핑(songSlug(artist,title) 재사용 예상).
5. **카탈로그 빈 상태** — canonical_tones/tones 적재 곡이 아직 2곡뿐 — 목록 빈약함의 표시 전략(생성 유도 CTA).

## 게이트 판정

- 방향 1개 확정: ✅ (실행 모델·폼·결과 뷰·카탈로그·문의 링크)
- 열린 질문: 5건 전부 PRD/TRD 단계로 이월 명시 ✅
