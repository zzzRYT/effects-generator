# 복기 — variation-compare (트랙2 사이클 #2)

- **Feature slug**: variation-compare
- **PRD/TRD/설계**: docs/{prd,trd}/variation-compare.md · docs/plans/2026-06-21-variation-compare-design.md
- **완료일**: 2026-06-21
- **결과**: CRITICAL/HIGH = 0. lint/tsgo/tsc green, vitest 145 통과, Playwright 72 통과(4 브레이크포인트). 빌드 정적(● SSG).

## 무엇을 만들었나
곡 상세의 "변주 세로 나열"을 **변주 탭 위젯**으로 교체(ui-1.8 충족). 한 번에 하나 표시, 활성 변주는
URL `?v=N`(1-based, 공유 가능). **점진적 향상**: 서버가 탭바 + 모든 패널을 정적 HTML 로 그려 no-JS=전부
표시, JS 아일랜드가 한 번에 하나만 보이게 강화. 100% 정적 유지.

## 핵심 설계 결정 (재사용할 것)
- **정적 패널은 `useSearchParams` Suspense 경계 밖**에 둔다. Next 16 은 prerender 시 useSearchParams 를
  쓰는 클라이언트 트리를 가장 가까운 Suspense 까지 fallback 으로 돌린다 → 패널을 경계 안에 넣었으면
  정적 HTML 이 fallback 으로 degrade 돼 no-JS·SSG 가 깨졌을 것. **해법: 아일랜드를 `null` 렌더 동작 전용
  컴포넌트로 만들고, `getElementById` 로 정적 DOM 을 강화.** 하이드레이션 불일치 0(렌더 출력 없음).
- **무플래시 = `<body>` 첫 자식 인라인 스크립트(`html.js`) + CSS 게이트.** 서버 default=첫 패널 active →
  공통 케이스(`?v` 없음/`=1`) 완전 무플래시. `?v=2+` 딥링크만 1 프레임 패널 스왑(의도된 트레이드오프).
- **URL As State**: 로컬 React 상태 0, 활성 인덱스는 `resolveActiveIndex(searchParams)` 파생. `router.replace(scroll:false)`.
- **탭 = `<a role="tab" href="#panel">`** (button 아님): no-JS 에서 href 가 패널로 스크롤, role 이 AT 에 "tab"
  안내(ARIA 1.2 유효), 서버 roving tabindex 미설정 → no-JS 키보드 포커스 가능. 아일랜드가 roving 부여.
- **순수 함수(`resolveActiveIndex`) + DOM id 헬퍼(`tabId`/`panelId`)를 `lib/variationTab.ts` 단일 출처**로.

## CE 병렬 리뷰 (6 에이전트) — 발견·처리
검증우선(실측·계약 대조 후 심각도 판정). CRITICAL/HIGH = 0. 처리 내역:

**수정 적용:**
- (maintainability MEDIUM) **DOM id 스킴이 3파일에 중복** → `tabId(i)`/`panelId(i)` 를 `lib/variationTab.ts`
  로 추출, VariationTabs·VariationPanel 이 공유. **ID 정합 유닛 테스트 추가**(aria-controls↔id, aria-labelledby↔id).
- (a11y MEDIUM) **tabpanel 에 aria-label + aria-labelledby 중복**(aria-labelledby 가 우선 → aria-label 죽은 속성)
  → tabbed 면 aria-label 제거(접근명=탭 라벨 "정석 JCM800", "변주 1"보다 유의미). 의존 셀렉터 갱신
  (e2e `article[aria-label^="변주"]`→`article[role="tabpanel"]`, SongDetail.test 패널 단언).
- (kieran-ts MEDIUM) onClick 핸들러 `Event`→`MouseEvent`(keydown 의 KeyboardEvent 와 타입 엄밀성 통일).
- (maintainability MEDIUM) layout 스크립트↔variation-tabs CSS **의도된 결합**을 양쪽 주석으로 명문화.
- (a11y LOW) `<a role="tab">` 선택 근거를 주석으로 확장.

**근거 달아 기각/이월:**
- (correctness MEDIUM) "첫 effect 에 `count` deps 누락" → **비이슈**. 첫 effect 는 `count` 를 참조하지 않고
  DOM `tabs.length` 로 클램프. 곡 전환 시 slug→containerId(이미 deps)가 바뀌어 effect 재실행·재바인드.
  `count` 는 빌드 상수(헌법: 런타임 데이터 없음)라 불변 → deps 추가는 오히려 "변할 수 있다"는 오해. 주석으로 명시.
- (a11y LOW) "no-JS 에서 서버 aria-selected=true 가 모든 패널 visible 과 의미 불일치" → **이월**. 리뷰어도
  OPTIONAL·미준수아님. 서버 aria-selected 제거 시 탭 aria-required-attr 갭 위험, no-JS 에선 콘텐츠 전부 읽힘.
- (frontend-races LOW) 딥링크 1프레임 스왑 → 설계 트레이드오프(공통 케이스 무플래시 우선). 비차단.
- (kieran-ts/testing) "resolveActiveIndex/단일변주 테스트 없음" → **오판(false negative)**. 두 테스트 파일
  (`variationTab.test.ts` 19케이스, `VariationTabs.test.tsx` count==1 분기)이 이미 존재·통과. 리뷰어가 미열람.
- `tabProps` 빈 객체 spread(kieran-ts) → 타입 안전·관용적. 대안은 `<article>` JSX 중복 → 유지.

## 다음에 피할/주의할 패턴
- **Next 16 useSearchParams + 정적 폴백을 같은 트리에 두지 말 것.** Suspense 경계 안은 prerender 에서
  fallback 만 정적화된다 → 정적이어야 할 콘텐츠는 경계 밖 서버 트리에 두고, 동적 부분만 격리.
- **라우트/마크업 구조 변경 후엔 `next build`(타입젠) 선행** 후 tsc(사이클 #1 교훈 유지).
- **점진적 향상 마크업 변경 시 의존 테스트 셀렉터 동반 점검**: aria-label 제거가 e2e 카운트 셀렉터·
  getByLabelText 를 깨뜨림 → role 기반(`role="tabpanel"`)으로 전환해 시각 무관 카운트.
- **CE 리뷰는 "테스트 없음" 지적을 항상 실측 대조**: 이번에 2건이 false negative(파일 미열람)였음. 검증우선 원칙이 막아줌.

## QA — 검증 루브릭 (loop-until-pass, 1회차 통과)
이 사이클의 목표 기준은 **ui-1.8(변주 탭, 필수)**. 자동 검사 전수 통과로 1회차에 임계 충족(되돌림 0).

| 기준 | 점수 | 근거 |
|------|------|------|
| **ui-1.8** 변주 탭 표시·전환·콘솔에러0 | **5/5** | e2e: 탭 3개, 3회 전환 모두 패널 재렌더, console+pageerror=0 |
| edge-3.7 / cross-5.2 키보드 탭 순서 | 5/5 | e2e ←/→/Home/End roving + focus-visible(대비 9.98:1, a11y 리뷰 실측) |
| edge-3.8 변주 개수 유연 | 5/5 | 1개→탭바 미렌더(유닛), 3개 e2e, 모바일 320 탭바 wrap·오버플로0 |
| fs-4.7 변주별 switching 독립 | 5/5 | 패널 자기 데이터만(#1 VariationPanel 재사용), 탭 전환 시 독립 렌더 |
| cross-5.1/5.3 a11y(대비·시맨틱) | 5/5 | axe wcag2a+2aa 위반 0(4 브레이크포인트), WAI-ARIA Tabs 정합(a11y 리뷰 CONFORMANT) |
| cross-5.4 reduced-motion | 5/5 | e2e: transition-duration ≤0.1s |
| AC5 no-JS 전부표시 | 5/5 | e2e javaScriptEnabled:false → 3 패널 visible. 정적 HTML 검증(3 tabpanel) |
| AC10 정적 SSG | 5/5 | next build 로그 ● SSG, 런타임 페치 0, 아일랜드 Suspense 격리 |

**목적1(UI 시각화) 임계(평균≥4.0, ui-1.1 필수 5점) 유지** — #1 의 ui-1.1~1.7·1.9 는 패널 내부(VariationPanel
무변경)라 회귀 0, ui-1.8 만 신규 충족. **QA 통과.**

## 이월 (미해결)
- cross-5.5/5.7(LCP/CLS) Lighthouse 미측정(정적이라 위험 낮음, #0~#2 공통 이월).
- hanroro switching.B 경고 2건(설명만, 블록 없음 — 데이터 이슈, 코드 무관).
- 브랜치 origin 미push·main 미병합.
