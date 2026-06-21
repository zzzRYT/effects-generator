# 설계 — variation-compare (트랙2 사이클 #2)

**확정일:** 2026-06-21
**brainstorm:** `/superpowers:brainstorm variation-compare`
**선행:** 사이클 #1 `signal-chain-view` 완료(`/songs/[rig]/[song]`, VariationPanel·SignalChain 등 재사용).
**소비 계약:** `docs/data-contract-ui.md`, `docs/verification-rubric.md`(특히 ui-1.8 변주 탭).

같은 곡의 여러 변주를 **탭으로 전환**해 보는 뷰. #1은 모든 변주를 세로로 나열했는데, #2는 탭 UI로 교체(ui-1.8 충족). 100% 정적 — 런타임 서버 없음.

---

## 확정 결정 (brainstorm)

1. **비교 UX = 탭 전환** (한 번에 하나). 루브릭 ui-1.8 직접 충족. 나란히-동시비교는 채택 안 함.
2. **활성 탭 상태 = URL** (`?v=N`, 1-based, 공유 가능). web 규칙 "URL As State".
3. **구현 = 순수 CSS 기본 + 소형 JS 향상**:
   - **CSS만으로 탭 작동**(no-JS에서도 전환 가능) — 앵커/`:target` 또는 라디오-해킹 중 택1(구현 시 확정, 접근성 우선).
   - 소형 JS 아일랜드가 ARIA(`aria-selected`)·화살표/Home/End 키보드·`?v=` 공유링크·(선택) 터치 스와이프만 더함.
4. **no-JS = 모든 변주 표시** (서버가 모든 패널을 보이게 렌더 → no-JS 사용자도 전부 접근, #1과 동일한 graceful 폴백). JS 있으면 탭으로 향상.
5. **모바일** = 반응형 탭바(가로 스크롤/wrap, 터치 타깃 ≥44px) + 선택적 스와이프. **Stackflow 등 스택 내비 프레임워크는 기각** — 모델 불일치(스택 내비≠뷰 전환), JS 런타임 필수라 no-JS 요구 위배, 최소-복잡도 헌법 위반, 번들 과다.

> **용어 주의**: "서버 컴포넌트"는 런타임 서버가 아니라 **빌드 타임 HTML 생성**(PATCHES 상수 → 정적 HTML, JS 0). 클라이언트 컴포넌트만 브라우저 JS. 데이터는 전부 빌드 상수.

---

## 섹션 1 — 아키텍처

`SongDetail`의 "변주 세로 나열"을 탭 UI로 교체. 라우트/SSG/데이터 흐름은 #1 그대로.

```
components/song-detail/
  SongDetail.tsx        # (수정) 헤더 + VariationTabs. 빌드타임(서버) 컴포넌트 유지
  VariationTabs.tsx     # (신규) 탭바 + 모든 패널(정적 HTML). CSS 기본 토글
  VariationTabsClient.tsx (신규, 'use client')  # ARIA·키보드·?v= 동기화·스와이프 향상만
  VariationPanel.tsx    # (재사용 #1) 무변경 — 각 패널 id, role=tabpanel
components/ui/
  (탭 버튼 마크업은 VariationTabs 내; 필요시 분리)
lib/
  variationTab.ts       # resolveActiveIndex(param, count) 순수 함수
```

**렌더 전략(점진적 향상)**:
- 빌드 HTML: 탭바 + **모든 VariationPanel(보이게)**. no-JS = 전부 접근.
- `<head>` 페인트-전 인라인 스크립트로 `<html class="js">` → CSS `.js`일 때만 비활성 패널 숨김(플래시·하이드레이션 불일치 없음).
- CSS 기본 탭 전환(앵커 `#v-N`/`:target` 또는 동등) — JS 없이도 작동.
- 소형 JS: `role`·`aria-selected`·roving tabindex·화살표/Home/End·탭클릭 시 `?v=N` 갱신·(선택)스와이프.

**정적 헌법 부합**: 데이터=빌드 상수, 편집/페치 0. 탭은 순수 뷰 토글(읽기 전용 유지).

---

## 섹션 2 — URL 상태 & 탭 동작

- **`?v=N`** 1-based. 없음/범위밖/비숫자 → 첫 변주 폴백(crash 0). 인덱스 사용(변주 slug 없음, label은 길고 변동 가능, 인덱스는 md 순서로 결정적).
- 탭 클릭 → `router.replace(?v=N, { scroll: false })`(히스토리 오염·스크롤 점프 방지). replace 선택(변주 전환=뷰 조정, 탐색 아님).
- **키보드(WAI-ARIA Tabs APG)**: `role="tablist"`, ←/→ 이동, Home/End 처음·끝, roving tabindex(활성만 0). automatic activation(패널 가벼움).
- **Suspense**: `useSearchParams`는 Next 16에서 Suspense 필수 → 클라이언트 아일랜드를 Suspense로 감쌈. fallback은 첫 변주(레이아웃 시프트 최소).
- **no-JS 폴백(핵심)**: 서버가 모든 패널 보이게 렌더 → no-JS=전부 표시. 탭바는 no-JS에서 `#v-N` 앵커로도 점프. `.js` 클래스+CSS로 JS 시 깔끔한 탭(플래시 없음).

---

## 섹션 3 — 컴포넌트 & 데이터 흐름

```
PATCHES(빌드상수) → SongDetail → VariationTabs(variations props)
  ├ 탭바: 변주 label 들 → role=tab, aria-controls=v-{i}
  ├ VariationTabsClient: useSearchParams(?v) → activeIndex
  │     data-active 토글 · aria-selected · roving tabindex · 화살표키 · replace(?v=N) · (선택)스와이프
  └ VariationPanel × N (재사용) — id=v-{i}, role=tabpanel, 비활성은 .js + hidden
```

- 데이터 페치 0, 편집 0. 클라이언트는 URL만 읽음.
- **엣지**: 변주 1개 → 탭바 미렌더, 패널만(YAGNI). `?v` 무효 → 첫 변주. 변주 5개+ → 탭바 가로 스크롤/wrap(edge-3.8). 긴 label → ellipsis/줄바꿈.

---

## 섹션 4 — 테스트 & 검증

**유닛(vitest + RTL, 커버리지 80%+)**
- `lib/variationTab.test.ts` — `resolveActiveIndex(param,count)`: 1-based 파싱·클램프·비숫자/없음→0 전수.
- `VariationTabs` 렌더: tablist + N tab + tabpanel, aria-selected/aria-controls, 기본 첫 탭, **변주 1개면 탭바 미렌더**.
- 키보드: ←/→/Home/End roving(fireEvent).

**비주얼·E2E(Playwright, 320/768/1024/1440)**
- ui-1.8: 탭 N개 → 각 클릭 → 패널 재렌더 → 콘솔 에러 0.
- URL: 클릭 시 `?v=N`, `?v=2` 딥링크 진입 시 2번 활성.
- **no-JS**(`javaScriptEnabled:false`): 모든 변주 패널 보임 — 핵심 요구 검증.
- axe a11y(탭 위젯), reduced-motion(스와이프/전환 ≤0.1s), 모바일 320 탭바 오버플로 0 + 터치 ≥44px.
- 스냅샷 갱신.

**QA**: 루브릭 ui-1.8 **필수 충족** + #1에서 deferred 표시한 항목 닫기. edge-3.7/cross-5.2(키보드 탭 패턴) 강화. edge-3.8(변주 개수 유연).

---

## 산출물
이 설계 / PRD(`docs/prd/variation-compare.md`) / TRD(`docs/trd/variation-compare.md`) / 복기(`docs/reviews/variation-compare.md`).

## 미해결(이월)
- cross-5.5/5.7(LCP/CLS) Lighthouse 미측정(정적이라 위험 낮음).
- hanroro switching.B 경고 2건(설명만).
