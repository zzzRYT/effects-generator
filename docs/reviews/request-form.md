# 복기 — request-form (트랙2 사이클 #4)

**완료일:** 2026-06-21
**설계:** docs/plans/2026-06-21-request-form-design.md · **PRD:** docs/prd/request-form.md · **TRD:** docs/trd/request-form.md
**커밋:** (feat 커밋 해시) · **선행 설계 커밋:** 7fc8d27

곡 제보 폼. PE: 트리거 `<a href="/request">` 가 no-JS=정적 `/request` 네이티브 POST / JS=`<dialog>` fetch 제출.
Web3Forms 직접 POST(백엔드 0). 트랙2 마지막 사이클.

## 게이트 결과 (최종)
- **vitest 213**(+44: requestForm·requestEnv·RequestForm·RequestDialog) · **Playwright 188**(+64 request-form: no-JS·dialog·프리필·성공/실패·ESC/백드롭·포커스트랩·더블서브밋·비주얼 4bp·axe 0·reduced-motion) · lint/tsgo/tsc/build green.
- **빌드 정적 유지**: `/request`·`/request/sent` 모두 `○ Static`, 홈도 `○ Static` — 전역 dialog 아일랜드(layout)가 SSG 안 깨뜨림(AC14).
- **CE 병렬리뷰 6**(correctness·maintainability·testing·kieran-ts·frontend-races·a11y) → 실제 CRITICAL/HIGH 수정 후 **0**.

## CE 리뷰에서 발견·수정한 것 (진짜)
- **[CRITICAL→fix] 더블서브밋 가드 부재**(frontend-races) — 버튼 disabled 만으론 sub-frame 더블클릭에 두 fetch 가능.
  → `submittingRef`(in-flight 가드) + `AbortController`(닫기 시 in-flight 취소, AbortError 무시) + `finally` 리셋.
  e2e 추가: 느린 route mock 으로 더블서브밋 시 요청 1회만 확인.
- **[HIGH→fix] fetch 응답 narrowing**(correctness·kieran 공통) — `json.success` truthy 체크 → 명시적 `json.success === true`.
- **[a11y CRITICAL #1→fix] dialog role 명시** — native `<dialog>` 암묵 role 있으나 방어적으로 `role="dialog"` 추가(무비용).
- **[a11y CRITICAL #2→테스트로 반증]** "포커스 트랩 미구현" 주장 — **native modal `<dialog>.showModal()` 이 배경을 inert 처리해 이미 트랩됨**(HTML 사양). 수동 트랩 불필요. **e2e 로 실증**(12 Tab 동안 배경 인터랙티브 요소에 포커스 0). 단 wrap 경계에서 focus 가 잠깐 비인터랙티브 `<body>` 에 머무는 건 정상(다음 Tab 복귀) — 테스트 단언을 "배경 컨트롤에 안 닿음"으로 정정.

## 기각한 발견 (근거 — 컴파운딩)
- **[correctness CRITICAL] "validation 실패 시 phase=submitting 고착"** — 오독. `setPhase("submitting")`(L118)은 validate 조기 return(L113) **뒤**라 실패 경로에서 도달 안 함. 실제 코드 확인(verify-first)으로 false positive.
- **[frontend-races HIGH] "프리필을 URLSearchParams 로 읽어라"** — 적용하면 **#3 의 stale URL 레이스 재발**. 라이브 `input.value` 가 가장 신선한 소스(의도). 기각.
- **[frontend-races HIGH] "포커스 effect 타이밍 레이스"** — e2e AC5(열림 시 곡 포커스)가 4bp 통과 = 실증적 반증.
- **[frontend-races HIGH] "하이드레이션 전 클릭 → 네비 충돌"** — 의도된 graceful fallback(리스너 부착 전엔 `<a>` 가 작동하는 `/request` 로 풀 네비). 충돌 아님.
- **[a11y HIGH] 필수표시 시각만 / 에러·필수 색만 의존** — `required` 속성이 필수를 프로그램적으로 알림, `*`는 색 아닌 **글리프**, 에러는 **텍스트**로 전달(색은 보강). 1.4.1/3.3.2 충족.
- **[a11y MEDIUM] close 버튼 음수 margin 이 히트박스 축소** — margin 은 위치만 옮기지 요소 크기(44×44 hit) 불변. 오해.
- **[testing HIGH] "스냅샷 1 breakpoint 만"** — playwright.config 가 4 프로젝트(320/768/1024/1440) 매트릭스. 스냅샷은 bp 별 생성(`-desktop-1440-darwin.png`). 오해.
- **[testing] "requestForm/songFilter 테스트·dialog e2e 없음"**(maintainability·testing) — 실제 존재(requestForm.test·RequestDialog.test·request-form.spec). 에이전트가 `__tests__` 미탐색.

## 다음에 피할 패턴 (교훈)
- **`::backdrop` 클릭으로 모달 닫기 금지** — 헤드리스 Chromium 에서 `::backdrop` 클릭이 dialog 타깃 click 을 안 쏨(React onClick·native listener 둘 다 못 잡음). → **dialog 요소를 전체 뷰포트 투명 레이어로 만들고 패널을 자식(`.dialogInner`)으로** 두면, 패널 바깥 클릭 target===dialog 로 확실히 닫힌다. (디버깅 detour 2회 소모.)
- **모달 포커스 트랩은 수동 구현 말 것** — native modal `<dialog>` 이 트랩 제공. 트랩 검증 e2e 는 "배경 인터랙티브 요소에 안 닿음"으로 단언(wrap 경계의 transient `<body>` 허용). 매 Tab "dialog.contains" 강제는 오탐.
- **리뷰 에이전트 CRITICAL 은 verify-first** — 6개 중 correctness·a11y 의 CRITICAL 2건이 코드 오독/낡은 전제. 실제 코드·통과 e2e 와 대조해 기각. (단 frontend-races 의 더블서브밋은 진짜였음 → 전수 검토 후 선별.)

## 재사용할 결정
- **PE 골격 계승**: 서버 정적 진실(`/request` 네이티브 폼) + JS 아일랜드 강화(dialog fetch). #2/#3 의 `html.js` 게이트는 닫힌 `<dialog>` 가 이미 `display:none` 이라 **이 사이클엔 신규 CSS 게이트 불필요**(설계 R2).
- **DOM id 단일 출처**: REQUEST_*_ID(requestForm.ts), 크로스 피처 프리필은 SONG_SEARCH_ID(songFilter.ts) 공유 — 계약 주석 명시.
- **순수 분리**: 검증·payload·honeypot·env 키해석을 `lib/` 순수 모듈로 → 전수 단위 테스트.
- **시크릿**: `NEXT_PUBLIC_WEB3FORMS_KEY` 빌드 인라인(공개 라우팅키), prod 부재 fail-fast/dev·test placeholder. `.env.example` 추적(`!.env.example`), 실제 키·SITE_URL 은 사용자가 Vercel/.env.local.

## 이월(후속, 비차단)
- (maintainability MEDIUM) `.page/.head/.title` CSS 가 request.module.css·song-index.module.css 중복 — 2 페이지 소규모라 수용. 3번째 생기면 공용 page-shell 추출.
- `NEXT_PUBLIC_SITE_URL` 미설정 → no-JS 성공은 Web3Forms 기본 성공페이지. 도메인 확정 후 `redirect→/request/sent` 활성(코드 조건부 대비됨).
- (testing MEDIUM, 선택) RequestDialog 컴포넌트 테스트에 payload 인자 단언·"또 제보" 후 포커스 재검증 추가 가능(현재 e2e 가 커버).
