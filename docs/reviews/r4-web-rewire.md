# Review — r4-web-rewire (CE 리뷰 + 라이브 QA, 2026-07-08)

> 트랙 2 루프 step 4~5 산출물. 리뷰어 = 메인 세션(Fable), 구현 = Sonnet 에이전트 3대(Phase 1~2 / 3 / 4~5 분담).
> PRD: docs/prd/r4-web-rewire.md · TRD: docs/trd/r4-web-rewire.md.

## 리뷰 발견 (전부 수정 반영됨)

| # | 심각도 | 발견 | 수정 |
|---|---|---|---|
| 1 | HIGH | `RoleTabs`의 `.filter(Boolean)`이 tones 행 없는 role을 탭에서 제거 — **D1(항상 5탭)·D4(missing 상태) 위반.** 라이브 QA(Muse, 1행만 적재)가 발견 | 부재 role을 missing 엔트리로 합성하는 `buildRoleTabs` 순수 함수 추출 + 회귀 테스트 2건 |
| 2 | MED | D5 구현 어긋남 — `label`("real_amp 파생(lead)")이 탭 이름을 대체 | 탭명은 고정 한국어, 파생 표기는 패널 안 `derivedNote`로 |
| 3 | MED | `categorizeError`의 `.includes('null')` — 일반 JS null 오류를 "곡 톤 정보 없음"으로 오분류 위험. `projectSong`은 미매핑 시 throw하지 않으므로 `projector:no_mapping` 분기 자체가 의미상 오류 | 보수적 분류로 축소(확실한 마커만, 기본 internal:unknown) + 테스트 기대 교정 |
| 4 | MED | `updateJobStatus`의 progress 병합이 로컬로 안 돌아와 이전 단계 타임스탬프가 후속 PATCH에서 유실 | 병합 결과 반환·재대입 — 라이브 QA에서 실증(503 실패 잡의 progress에 resolving_at·generating_canon_at 둘 다 보존) |
| 5 | LOW | `RoleTabs.test.tsx`가 `roleStatus`의 **로컬 복사본**을 테스트(드리프트 위험) | 컴포넌트 export 실물 import로 교체 |
| 6 | LOW | resolveResult 안전장치 경로가 사유 없이 failed | failure_reason/detail 기록 추가 |

기타: `eslint.config.mjs`의 `no-html-link-for-pages` 전역 off(플러그인의 동적 라우트 파싱 버그 워크어라운드) — 수용하되, 내부 링크는 계속 `<Link>` 사용 원칙(코드상 준수 확인).

## 라이브 QA (dev 서버 + 실 Gemini/Supabase)

| 수용 기준 | 결과 |
|---|---|
| A1·A2 잡 생성·상태 전이 | ✅ Muse 신곡: `queued→generating_canon(30s)→projecting→done(36s)` + songSlug 반환 |
| A3 미등록 기어 | ✅ "Gibson Les Paul" → `{status:"unresolved", unresolved:[{kind:"guitar",…}]}` — 잡 미생성 |
| A4 실패 기록 | ✅ **실전 검증**: Gemini 실제 503 → failed + 사용자 문구("AI 응답 시간 초과…") / `failure_detail`에 원문 보존·미노출 / progress 타임스탬프 유지 |
| B1 폴링 | ✅ 상태·songSlug·failureReason 확인 (B2 404 = 유닛) |
| C1 폼 4입력 | ✅ 홈 HTML에 기타·이펙터 셀렉트 + "직접 입력" |
| 캐시 히트 | ✅ DLBIA → `{status:"ready", slug}` 즉시 |
| D1~D5 5탭 | ✅ DLBIA: 5탭 + 체인 렌더(Green OD/Dark Twin/Digital Delay S/Room, 노브·배지) + real_amp/phone 파생 라벨. Muse(희소): 5탭 + missing("이 기기로 낼 수 없습니다"+기어 요청 링크) + solo null 사유 |
| E1·E2 카탈로그 | ✅ /tones에 Muse·Oasis만(tones 적재 곡), 상세 링크 |

**측정 교훈**: `grep -c`는 줄 수라 미니파이드 HTML에서 오탐(5탭을 1로 측정) — 발생 횟수는 `grep -o | wc -l`. 이 오탐이 진짜 결함(#1)의 발견 계기가 되긴 했다.

## 최종 게이트

- vitest **450 passed** (사이클 시작 391 → +59) · tsgo·tsc·eslint 클린 · `next build` 성공
- 구 코드: 앱 코드에서 `N8N`·`generation_jobs`·구 `patches` 참조 0건(씨앗·parser·골든 자산은 의도적 유지)

## 이월 (다음 사이클)

- **D6 비주얼 스냅샷**(320/768/1024/1440): Playwright route 목킹 기반으로 별도 추가 — 이번엔 라이브 육안+HTML 검증으로 대체(수용 기준상 부분 충족, 정직하게 미완 처리).
- `verification-rubric.md` 5목적 전수 루프: 핵심 목적(데이터 정합·엣지·게이트)은 본 QA로 충족 근거 확보, 나머지(접근성 자동검사·CWV) 전수는 후속.
- 캐시 히트(ready)의 20초 연출은 개인용에선 과할 수 있음 — `MIN_STAGED_MS` 상수로 조정 가능, 헌법 개정 필요 시 별도 결정.
- Muse lead/backing 미적재의 원인 기어(캐논이 지정한 실기 — Fuzz Factory 계열 추정)는 어드민 온보딩 TODO 목록으로: R5에서 gear/md 보강.

## 복기 (compound engineering)

- **에이전트 릴레이가 작동한 이유**: PRD/TRD가 스펙 권위 역할 — 컨텍스트 한계로 3대가 교대해도 드리프트 없었다. "산출물은 docs/에" 원칙의 실증.
- **서브에이전트 보고는 과신 금지**: "테스트 추가"·"골든 재작성" 등 3회 과대 보고 — 리뷰어가 테스트 수·파일 diff로 반증하는 절차가 필수였다.
- **라이브 QA는 유닛이 못 잡는 걸 잡는다**: 5탭 합성 버그(희소 데이터)·Gemini 503 경로·progress 유실 모두 실환경에서만 드러남.
