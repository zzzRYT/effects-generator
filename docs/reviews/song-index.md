# 복기 — song-index (트랙2 사이클 #3)

- **Feature slug**: song-index
- **PRD/TRD/설계**: docs/{prd,trd}/song-index.md · docs/plans/2026-06-21-song-index-design.md
- **완료일**: 2026-06-21
- **결과**: CRITICAL/HIGH = 0. lint/tsgo/tsc green, vitest 169 통과, Playwright 124 통과(4 브레이크포인트). 홈 정적(○ Static).

## 무엇을 만들었나
임시 홈(`/`)을 **곡 목록/검색 진입점**으로 교체. 모든 곡을 정적 목록으로 렌더 + 검색창 + rig 필터 칩.
검색어·활성 rig 는 URL `?q=&rig=`(공유·북마크). 0결과 빈상태 + 라이브 카운트. 점진적 향상.

## 핵심 설계 결정 (재사용할 것)
- **정적 리스트 + 컨트롤 아일랜드**(#2 대칭): 리스트가 정적이어야 하므로(SSG·no-JS) Suspense 밖 서버 트리에
  두고, 컨트롤(검색+칩)을 `<Suspense>` 클라이언트 아일랜드가 렌더하며 리스트를 `getElementById`+`row.hidden`
  으로 필터한다. **PATCHES(73KB) 클라이언트 미전송** — 행 `data-search/rig` 만 읽음.
- **genre 는 칩이 아니라 검색 대상**: `genre` 가 짧은 태그가 아니라 긴 서술문이라 칩으로 무의미(곡당 고유).
  rig(2개)만 칩, genre 키워드는 `data-search` 에 녹여 검색으로 커버. **데이터를 보고 UX 를 바꾼 결정.**
- **하이드레이션 게이트 = `useSyncExternalStore`**(서버/첫렌더 false→빈 필터, 이후 true). 정적 prerender
  (빈 필터)와 첫 클라 렌더를 일치시켜 `?rig=` 딥링크에서도 불일치 0. setState/effect 없이.
- **no-JS = 컨트롤 숨김**: Next 16 이 useSearchParams 컴포넌트를 (빈 파라미터로) 정적 HTML 에 prerender
  하므로 컨트롤이 no-JS 에도 존재 → CSS `:global(html.js) .filterbar` 게이트로 숨김(작동 안 하는 UI 가림).
- **URL 단일 출처 + 레이스 회피**: 칩 클릭 시 현재 검색어는 **라이브 input(비제어) 값**에서 읽는다
  (`searchParams` 는 router.replace 후 비동기 갱신이라 stale). DOM id 는 `songFilter.ts` 단일 출처.

## 디버깅에서 얻은 교훈 (다음에 피할 것 — 비싼 것들)
1. **Playwright `reuseExistingServer:!CI` + 잔존 `npm run dev` 서버 = 함정.** 포트 3000 에 떠 있던 dev 서버를
   Playwright 가 재사용 → 모든 e2e 가 **dev 모드**(엄격 하이드레이션)로 돌아 false 실패. 게다가 `--update-snapshots`
   는 스냅샷 테스트를 항상 통과시켜 실패를 가렸다(클린 재실행에서야 13 실패 드러남). **교훈: e2e 전 :3000 잔존
   서버 확인. `--update` 직후엔 반드시 클린 재실행으로 검증. "passed" 를 무조건 믿지 말 것.**
2. **`html.js` 무플래시 스크립트의 하이드레이션 불일치(#2 잠복 버그).** 스크립트가 하이드레이션 전 `<html>`
   className 을 바꿔 server/client 불일치 → dev 에선 에러로 하이드레이션이 깨지고 아일랜드 핸들러가 안 붙어
   **#2 변주 탭까지 동시 실패**(콘솔 38 에러·`?v=` 미갱신). prod 는 관대해 #2 땐 통과했음. **fix: `<html
   suppressHydrationWarning>`(next-themes 패턴).** 교훈: 페인트-전 DOM 변경 스크립트엔 suppressHydrationWarning.
3. **Next 16 은 useSearchParams 클라이언트 컴포넌트를 Suspense 안이라도 정적 HTML 에 prerender**(빈 파라미터로).
   → no-JS 폴백 가정이 깨짐. 빌드 산출 HTML 을 직접 grep 해 확인. PE 폴백은 CSS 게이트로 강제.
4. **`useSearchParams` 객체 식별자는 effect 의존성에 쓰지 말 것** — 테스트 mock 이 매 렌더 새 인스턴스를 반환해
   `[searchParams]` 가 무한 effect 루프(테스트 행). primitive(q/rig/rawQ) 또는 `.toString()` 으로 의존.
5. **비제어 input 의 라이브 값이 URL 상태보다 "현재 의도"에 가깝다** — router.replace 비동기 갱신 레이스 회피.

## CE 병렬 리뷰 (6 에이전트) — 발견·처리
검증우선. **CRITICAL/HIGH = 0.** correctness=발견0, kieran-ts=발견0, frontend-races=하이드레이션/루프/no-JS SOUND,
a11y=WCAG 2.2 AA COMPLIANT, maintainability/testing=MEDIUM 이하.

**수정 적용:**
- (maint) `html.js` 공유 게이트 결합을 layout 주석에 명문화(소비 CSS 2곳 명시). `songFilter.ts` "DOM 무관"
  오해 주석 수정(순수로직 + DOM id 계약 2부 구성 명시). `buildUrl`→`buildFilterUrl` 리네임.
- (frontend-races) 필터 effect cleanup 부재가 의도적임을 주석화(정적 리스트·구독 없음).
- (testing) **레이스 회귀 가드 e2e 추가**(타이핑 직후 칩 클릭 → URL 에 q·rig 둘 다 보존). 공백-only `q` 파싱 유닛 추가.

**근거 달아 기각/이월:**
- (frontend-races MEDIUM) "onRig 가 `q`(state)를 쓰라" → **기각**. `q` 는 searchParams 파생이라 그게 바로
  원래 레이스(stale). 비제어 input 라이브 값이 정답. **correctness 가 inputRef.value 를 옳다고 명시 확인.**
- (a11y) rig 칩을 radiogroup 으로 → **이월**. 현재 group+aria-pressed 토글버튼이 AA 준수(인정된 칩 패턴).
  radiogroup 은 roving tabindex+화살표키 복잡도 추가 → 선택적 의미 향상에 과함(YAGNI). 향후 후보.
- (a11y) count 에 `role="status"` → **생략**. `aria-live="polite"` 로 충분(리뷰어 확인), 중복.
- (testing) 칩 화살표키 내비 테스트 → **기각**. 토글버튼은 Tab 내비(화살표 패턴 아님, a11y 가 확인).
- 분기 커버리지 song-index 77%(전역 91%) → 수용. useHydrated 의 SSR(false) 분기는 jsdom(클라)에서 미도달.
- **리뷰 부작용 정리**: a11y 에이전트(Write 권한)가 스크래치 spec 4개 생성 → 제거(심사 목적 달성, 의도된 suite 아님).

## QA — 검증 루브릭 (loop-until-pass, 1회차 통과)
이 사이클의 목표 기준 = **edge-3.6(0결과, 필수≥4)** + 진입/교차품질. 자동 검사 전수 통과로 1회차 충족.

| 기준 | 점수 | 근거 |
|------|------|------|
| **edge-3.6** 검색 0결과 UI+복구 | **5/5** | e2e: "검색 결과 없음" + 초기화 링크 동작, crash 0 |
| edge-3.1 반응형 오버플로 0 | 5/5 | e2e 4 브레이크포인트 overflow=false, 칩 wrap, 터치≥44px |
| cross-5.1/5.3 a11y(대비·시맨틱) | 5/5 | axe wcag2a+2aa 위반 0(4 bp), a11y 리뷰 COMPLIANT(19기준) |
| cross-5.2 키보드 | 5/5 | 검색창·칩·링크 Tab 순회·focus-visible, 홈 첫 포커스=검색창 |
| cross-5.4 reduced-motion | 5/5 | e2e transition ≤0.1s |
| AC4 URL 상태·딥링크 | 5/5 | parseFilters 전수 + e2e `?q=`/`?rig=`/딥링크/AND/레이스가드 |
| AC8 no-JS 전체목록 | 5/5 | e2e javaScriptEnabled:false → 7행 visible, 컨트롤 부재 |
| AC11 정적 SSG | 5/5 | next build ○ Static, 아일랜드 Suspense 격리, 페치 0 |

**QA 통과** — 목표 기준 전부 임계 충족, 되돌림 0.

## 이월 (미해결)
- rig 칩 radiogroup 업그레이드(선택적 a11y 의미 향상).
- cross-5.5/5.7(LCP/CLS) Lighthouse 미측정(정적이라 위험 낮음, 전 사이클 공통).
- hanroro switching.B 경고 2건(데이터 이슈).
- 브랜치 origin 미push·main 미병합.
