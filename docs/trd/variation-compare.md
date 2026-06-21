# TRD — variation-compare

- **Feature slug**: variation-compare
- **PRD**: docs/prd/variation-compare.md
- **설계**: docs/plans/2026-06-21-variation-compare-design.md

## 설계 요약
`SongDetail`의 "변주 세로 나열"을 `<VariationTabs>`로 교체한다. 라우트/SSG/데이터 흐름은 #1 그대로
(빌드 상수 `PATCHES` → props). 핵심은 **점진적 향상(progressive enhancement)**: 서버가 탭바 + **모든
변주 패널을 visible 정적 HTML로** 렌더하고(no-JS = 전부 접근), JS 아일랜드가 그 정적 DOM을 *강화*해
한 번에 하나만 보이는 탭 위젯으로 만든다.

`useSearchParams`는 Next 16에서 prerender 시 가장 가까운 Suspense 경계까지를 클라이언트 렌더로
돌린다. 따라서 **패널을 useSearchParams 경계 안에 두면 안 된다**(그러면 정적 HTML엔 fallback만 남아
no-JS·SEO가 깨짐). 해법: 패널은 Suspense **밖** 서버 트리에 정적으로 두고, `useSearchParams`를 쓰는
아일랜드는 **렌더 결과가 `null`인 순수 동작 컴포넌트**로 만들어 `<Suspense>`로 격리한다. 아일랜드는
`getElementById(containerId)`로 정적 탭/패널을 찾아 `aria-selected`·roving tabindex·`data-active`·
키보드·클릭→`?v=N` 동기화를 붙인다. 렌더 출력이 없으므로 하이드레이션 불일치도 없다.

**무플래시**: `<body>` 첫 자식의 인라인 스크립트가 파싱 중 `html.js`를 붙인다 → 뒤따르는 패널이
페인트되기 전 `.js` CSS(비활성 패널 `display:none`)가 적용됨. 서버는 첫 변주를 `data-active="true"`로
렌더하므로 공통 케이스(`?v` 없음/`?v=1`)는 완전 무플래시. `?v=2+` 딥링크는 하이드레이션 후 한 프레임
패널 스왑이 있을 수 있음 — 공통 케이스 무플래시를 우선하고 인라인 clamp 중복을 피하는 의도적 트레이드오프
(설계 미해결 질문 해소).

## 컴포넌트 구조
```
web/
  app/songs/[rig]/[song]/page.tsx     # 무변경
  components/song-detail/
    SongDetail.tsx                    # (수정) .variations map → <VariationTabs song={song}/>
    VariationTabs.tsx                 # (신규, 서버) 탭바 + 모든 패널(정적) + Suspense(아일랜드)
    VariationTabsClient.tsx           # (신규, 'use client') useSearchParams로 정적 DOM 강화, render=null
    VariationPanel.tsx                # (수정) 탭 모드 ARIA 배선(id/role=tabpanel/aria-labelledby/data-active/tabIndex)
    variation-tabs.module.css         # (신규) 탭바·.js 패널 토글·반응형·reduced-motion
    song-detail.module.css            # 무변경(또는 .variations 정리)
  lib/
    variationTab.ts                   # (신규) resolveActiveIndex(param,count) 순수 함수
  app/layout.tsx                      # (수정) <body> 첫 자식 무플래시 인라인 스크립트(html.js)
```

## 파일 목록 (생성/수정)
| 파일 | 역할 |
|------|------|
| web/lib/variationTab.ts | `resolveActiveIndex(param,count)` — `?v` 1-based 파싱·클램프·폴백(순수) |
| web/components/song-detail/VariationTabs.tsx | 서버: 변주 1개→패널만, ≥2→탭바+모든 패널+Suspense(아일랜드) |
| web/components/song-detail/VariationTabsClient.tsx | 'use client', render null. 정적 탭/패널 강화(aria/roving/키보드/클릭→?v=) |
| web/components/song-detail/VariationPanel.tsx | (수정) `tabbed`/`active` props로 tabpanel ARIA 배선 |
| web/components/song-detail/SongDetail.tsx | (수정) 변주 나열 → `<VariationTabs>` |
| web/components/song-detail/variation-tabs.module.css | 탭바 스타일·`:global(html.js)` 패널 토글·반응형·reduced-motion |
| web/app/layout.tsx | (수정) 무플래시 인라인 스크립트 |
| web/lib/__tests__/variationTab.test.ts | resolveActiveIndex 전수 |
| web/components/__tests__/VariationTabs.test.tsx | 구조+아일랜드 강화(jsdom, next/navigation mock) |
| web/e2e/variation-compare.spec.ts | ui-1.8 탭전환·?v= URL·no-JS·키보드·axe·모바일 |
| web/e2e/song-detail.spec.ts-snapshots/* | 스냅샷 재생성(나열→탭) |

## 데이터 흐름 / 타입
- 입력: `Song`(빌드 상수). `song.variations: Variation[]`. 새 타입 없음 — `web/lib/types.ts` 그대로.
- 변환: `resolveActiveIndex(searchParams.get('v'), count)` → 0-based 활성 인덱스(순수).
- 출력: 정적 HTML(모든 패널) + 클라이언트 동작(URL만 읽음, 페치·편집 0).
- 상태: URL `?v=N`이 유일한 상태원(web "URL As State"). 로컬 React 상태 없음 — `useSearchParams` 파생.

## resolveActiveIndex 계약
```
resolveActiveIndex(param: string | null, count: number): number
  n = parseInt(param ?? "", 10)
  if NaN(n) → 0
  idx = n - 1                    // 1-based → 0-based
  if idx < 0 || idx >= count → 0
  return idx
```
- `"1"`→0, `"2"`→1, `"3"`(count3)→2, `null`/`""`/`"abc"`→0, `"0"`→0, `"-1"`→0, `"99"`(count3)→0, `"1.5"`→0(parseInt 1), `"2x"`→1.

## 아일랜드(VariationTabsClient) 동작
- `useSearchParams()`·`useRouter()`·`usePathname()` (next/navigation). `active = resolveActiveIndex(sp.get('v'), count)`.
- mount effect: `documentElement.classList.add('js')`(백업), `el=getElementById(containerId)`; tabs=`[role=tab]`, panels=`[role=tabpanel]`. 클릭/키보드 리스너 바인드, cleanup에서 해제.
  - 탭 클릭: `preventDefault` → `router.replace(\`${pathname}?v=${i+1}\`, {scroll:false})`.
  - tablist keydown: ←/→ 인접(순환), Home/End 처음/끝 → focus 이동 + `router.replace(?v=…)` (automatic activation).
- active effect(deps[active]): 각 tab `aria-selected`/roving `tabindex`(활성 0, 그 외 -1)/`data-active`, 각 panel `data-active` 갱신.
- render `null`(동작 전용 → 하이드레이션 불일치 0).

## 무플래시 인라인 스크립트 (layout)
- `<body>` 첫 자식: `<script dangerouslySetInnerHTML={{__html:"document.documentElement.classList.add('js')"}} />`.
- 1st-party 한 줄, 파싱 중 동기 실행. (CSP 미설정 정적 사이트 — 도입 시 nonce 필요. 복기에 메모.)

## CSS 전략 (variation-tabs.module.css)
- 기본(no-JS / `.js` 없음): 모든 패널 visible(=AC5). 탭바는 `<a href="#vpanel-N">` 앵커 → no-JS 스크롤 점프.
- `:global(html.js) .panels [data-active="false"] { display: none; }` — JS일 때만 비활성 패널 숨김.
  - (`[data-active]`·`[role]`은 CSS Module에서 전역 통과, 클래스만 스코프됨. `html.js`는 `:global`.)
- `.tab[data-active="true"]` 활성 시각(언더라인/LCD 강조). focus-visible 링(대비≥4.5:1).
- 반응형: 탭바 `flex; flex-wrap: wrap;` + 좁을 때 `overflow-x:auto`. 터치 타깃 min-height 44px. 긴 라벨 wrap.
- `@media (prefers-reduced-motion: reduce)`: transition none.

## 상태 / 엣지케이스
- 변주 1개 → 탭바·아일랜드 미렌더, `<VariationPanel>` 하나만(AC8, edge-3.8).
- `?v` 없음/범위밖/비숫자 → 첫 변주(resolveActiveIndex, AC4).
- 변주 ≥5 → 탭바 wrap/가로 스크롤(edge-3.8, edge-3.1 오버플로 0).
- 긴 라벨("합주용 미드 푸시 (UK 900)") → wrap, 클리핑 0(AC9).
- no-JS → 모든 패널·스위칭 플랜 visible(AC5).
- 패널 내부(disabled/footswitch/switching)는 #1 그대로 — 변주 #1이 default-active라 기존 `.first()` e2e 단언 유지.

## 수용 기준 ↔ 구현·테스트 매핑
| PRD 기준 | 구현 | 테스트 |
|----------|------|--------|
| AC1 탭=변주 수·라벨 | VariationTabs 탭바 | VariationTabs.test(구조), e2e ui-1.8 |
| AC2 전환 한 번에 하나·에러0 | 아일랜드 data-active + CSS | e2e ui-1.8(클릭→활성 전환, console 0) |
| AC3 ?v=N 갱신 | 아일랜드 router.replace scroll:false | e2e(클릭 후 URL) |
| AC4 딥링크·폴백 | resolveActiveIndex | variationTab.test 전수, e2e(?v=2 진입) |
| AC5 no-JS 전부표시 | 서버 정적 패널 + .js 게이트 CSS | e2e javaScriptEnabled:false |
| AC6 키보드 | 아일랜드 keydown roving | e2e(←/→/Home/End) |
| AC7 ARIA·axe | role/aria-selected/controls + 아일랜드 | VariationTabs.test(구조), e2e axe |
| AC8 변주1개 미렌더 | VariationTabs 분기 | VariationTabs.test(count1) |
| AC9 반응형·터치·클리핑 | variation-tabs.module.css | e2e 320/375/768/1024/1440 |
| AC10 정적 SSG | 패널 Suspense 밖, 아일랜드 null | next build 로그 ● SSG |
| AC11 reduced-motion | CSS prefers-reduced-motion | e2e emulateMedia |

## 테스트 계획
- 유닛(Vitest, 커버리지 80%+): `variationTab.test`(resolveActiveIndex 전수), `VariationTabs.test`
  (jsdom + `vi.mock('next/navigation')` → 구조: tablist/N tab/tabpanel·aria·count1 미렌더; 아일랜드
  강화: `html.js` 추가·data-active 토글·탭 클릭→`router.replace('?v=2')`·ArrowRight 이동).
- 비주얼·E2E(Playwright, 320/375/768/1024/1440): `variation-compare.spec` — 탭 전환(ui-1.8),
  `?v=N` 갱신·딥링크, no-JS 전부표시, 키보드(←/→/Home/End), axe(탭 위젯), reduced-motion,
  모바일 탭바 오버플로0·터치≥44px. 곡상세 스냅샷 재생성.

## 새 의존성 (있으면 근거)
- 없음. 탭 위젯은 WAI-ARIA APG 패턴을 직접 구현(작은 아일랜드) — 헤드리스 탭 라이브러리는 JS 런타임
  필수라 no-JS 폴백·번들예산·최소복잡도 헌법과 충돌(YAGNI). 스와이프 제스처는 **이번 미채택**(선택적
  향상, 비용 대비 보류 — 필요 시 후속).
