# PRD — R4 웹 재배선: 캐논·투영 셀프서브 UI

- **Feature slug**: r4-web-rewire
- **Brainstorm**: docs/brainstorm/r4-web-rewire.md
- **상태**: APPROVED (사용자 결정 2026-07-08: 1사이클 통째, tone_jobs 큐+폴링)

## 무엇 (What)

깨진 웹 표면(R0에서 drop된 `patches`/`generation_jobs`를 아직 읽음)을 캐논·투영 파이프라인(R1~R3)에 재배선한다. 홈의 생성 폼에 기어 입력(기타·이펙터)을 추가하고, 제출 시 `tone_jobs` 큐로 파이프라인을 백그라운드 실행하며, 완료 시 곡 상세에서 **role 5탭**(lead/backing/solo/real-amp/phone)으로 `tones.signal_chain`을 기존 GP-150 렌더러로 보여준다. 카탈로그(`/tones`)는 생성 누적 곡 목록으로 재배선한다.

## 왜 (Why) / 누구를 위해

- 파이프라인은 라이브 검증됐지만(2026-07-08) 웹에서 쓸 수 없다 — 셀프서브 톤 생성이라는 제품 핵심 가치가 CLI 스모크 스크립트에 갇혀 있다.
- 현 사이트는 런타임에서 깨져 있다(카탈로그 조회·생성 API 모두 drop된 테이블 참조). R4는 기능이기 전에 복구다.
- 사용자(나, GP-150+G250 유저): 곡명만 입력하면 30~40초 뒤 용도별(파트 3 + 출력 2) 세팅을 화면으로 받는다.

## 수용 기준 (측정 가능 — 테스트로 검증되어야 함)

### A. 생성 API (`POST /api/generate` v2)
- [ ] A1. 유효 입력(artist·title·guitar·processor) → `tone_jobs` 행 생성(`status=queued`) + `202 {jobId}` 즉시 응답(파이프라인 완료를 기다리지 않음).
- [ ] A2. 백그라운드에서 resolver→research→canon(캐시 미스 시)→project 실행, 단계 진입마다 `tone_jobs.status`가 `resolving→generating_canon→projecting→validating→done` 순으로 갱신된다(캐논 캐시 히트 시 `generating_canon` 생략 허용).
- [ ] A3. 미등록 기어 입력 → job을 만들지 않고 `200 {status:"unresolved", unresolved:[{kind,query}]}` 반환.
- [ ] A4. 파이프라인 오류 → `tone_jobs.status=failed` + `failure_reason`(사용자 문구)·내부 상세 분리 저장. 조용한 실패 0(A2~A4 외 상태로 끝나는 잡 없음).
- [ ] A5. 입력 검증(빈 값·길이 초과·honeypot)과 rate limit는 기존 `/api/generate` 수준 유지.
- [ ] A6. n8n 관련 코드·env 참조가 저장소에서 제거된다.

### B. 잡 폴링 (`GET /api/jobs/[id]`)
- [ ] B1. `tone_jobs`를 읽어 `{status, songSlug?, failureReason?}` 반환. `done`이면 결과 URL 구성에 필요한 slug 포함.
- [ ] B2. 존재하지 않는 jobId → 404.

### C. 생성 폼 (홈)
- [ ] C1. 기타·이펙터 입력이 추가된다: approved 목록 셀렉트 + "직접 입력" 시 자유 텍스트(총 4입력: 아티스트·곡·기타·이펙터).
- [ ] C2. 제출 → 진행 UI(기존 StrumLoader+단계 문구) → 폴링 → `done`에서 곡 상세로 이동. `failed`는 사용자 문구 + 재시도 노출.
- [ ] C3. `unresolved` 응답 → "지원 준비중" 안내 + 문의 폼 프리필 링크(기어명 주입) 노출. job 폴링을 시작하지 않는다.
- [ ] C4. 진행 문구가 tone_jobs 실제 단계에 동기화된다(연출 문구 ↔ status 매핑).

### D. 결과 뷰 — 곡 상세 role 5탭
- [ ] D1. `/songs/[slug]`가 `songs`+`tones`(+`canonical_tones`)를 조회해 role 5탭을 렌더한다. 탭 순서 lead/backing/solo/real-amp/phone.
- [ ] D2. 성공 role: `tones.signal_chain`이 기존 시그널 체인 렌더러(SignalChain/BlockModule/KnobGrid)로 순서대로 렌더된다(렌더러 컴포넌트 무수정).
- [ ] D3. null role(`signal_chain=null`): `null_reason`이 사용자 문구로 표시된다.
- [ ] D4. 미적재 role(캐논은 있으나 tones 없음): "이 기기로 낼 수 없음" 상태 + 미매핑 실기 목록은 v1에서 생략 가능하되 기어 추가 요청 링크 노출.
- [ ] D5. real-amp/phone 탭에 파생 소스 파트가 표기된다(예: "lead 파생").
- [ ] D6. 320/768/1024/1440 어느 폭에서도 가로 오버플로 없음(비주얼 스냅샷).

### E. 카탈로그 (`/tones`, 홈 미리보기)
- [ ] E1. `tones`가 1행 이상 적재된 곡만 목록에 노출된다(songs 단독 행은 제외).
- [ ] E2. 목록 항목 클릭 → 해당 곡 상세로 이동.
- [ ] E3. 빈/희소 상태(적재 곡 0~2): 생성 유도 CTA가 표시된다.

### F. 품질 게이트 (상시)
- [ ] F1. `lint`·`typecheck`(tsgo) green, 커밋 전 `typecheck:full` green.
- [ ] F2. 신규·수정 로직 유닛 테스트 포함 전체 스위트 green, 커버리지 ≥ 80% 유지.
- [ ] F3. 라이브 검증: dev 서버에서 신곡 1건 생성 → 5탭 확인(수동, QA 단계 기록).

## 비목표 (Non-goals)

- 문의 폼 유형 확장(기타·이펙터 추가 요청 전용 필드) — R6 `request-form-v2` 스코프. 이번엔 프리필 링크만.
- 어드민 UI(gear/processors 입력) — R5.
- Supabase Realtime 구독 — 폴링으로 충분, 필요 시 후속.
- 디자인 리뉴얼·신규 비주얼 방향 — 기존 토큰·렌더러 유지(재배선이지 리디자인 아님).
- 계정/저장/공유, 폴백·근사 매칭 notes의 UI 노출(데이터만 보존).
- 기타 본체 세팅(GuitarSetting) 렌더 — 캐논에 해당 데이터 없음(브레인스톰 이월 질문 3 → v1 생략 확정).

## 열린 질문 (→ TRD)

1. `after()` 실행 한도 확인 및 초과 시 단계 분할 전략 (브레인스톰 이월 2).
2. tone_jobs 단계 ↔ 진행 문구 매핑표, `failure_reason` 문구 카탈로그 (이월 1).
3. 곡 slug 규칙: `songSlug(artist,title)` 재사용 + songs 테이블에 slug 컬럼 추가 vs 조회 시 계산 (이월 4).
4. 구 어댑터(`adaptPatch`)·구 테이블 참조 코드의 제거 vs 격리 범위.
