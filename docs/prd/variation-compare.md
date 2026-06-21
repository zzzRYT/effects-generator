# PRD — variation-compare (변주 비교 탭)

- **Feature slug**: variation-compare
- **Brainstorm/설계**: docs/plans/2026-06-21-variation-compare-design.md
- **상태**: DRAFT

## 무엇 (What)
곡 상세(`/songs/[rig]/[song]`)에서 같은 곡의 여러 변주를 **탭으로 전환**해 한 번에 하나씩 본다.
사이클 #1은 모든 변주를 세로로 나열했는데, #2는 변주 라벨 탭바 + 활성 변주 1개 패널로 교체한다.
활성 탭은 URL `?v=N`(1-based)에 실려 공유 가능하다. 변주 패널 자체(시그널 체인·스위칭 플랜)는
#1의 `VariationPanel`을 그대로 재사용한다 — 이 사이클은 **표시 방식(나열→탭)만** 바꾼다.

## 왜 (Why) / 누구를 위해
한 곡에 보통 2~3개 변주(앰프·게인·미드 세팅 차이)가 있다. 세로 나열은 변주가 늘수록 길어지고,
"변주 A vs B에서 뭐가 다른가"를 같은 화면 위치에서 비교하기 어렵다. GP-150 유저(나·밴드)가
변주를 **탭으로 빠르게 오가며** 한자리에서 차이를 읽고, 특정 변주 링크(`?v=2`)를 멤버에게
공유할 수 있어야 한다. 루브릭 목적1의 ui-1.8(변주 탭)을 직접 충족한다.

## 수용 기준 (측정 가능 — 테스트로 검증)
- [ ] AC1: 변주 ≥2개면 탭바가 렌더되고, 탭 개수 = 변주 개수, 각 탭 라벨 = 변주 label. (vitest + ui-1.8)
- [ ] AC2: 탭 클릭 시 해당 변주 패널이 활성화되고 나머지는 숨겨진다(한 번에 하나). 전환 시 콘솔 에러 0. (Playwright ui-1.8)
- [ ] AC3: 활성 탭은 URL `?v=N`(1-based)에 반영된다. 탭 클릭 → URL `?v=N` 갱신(히스토리 누적·스크롤 점프 없음). (Playwright)
- [ ] AC4: `?v=N` 딥링크로 진입하면 N번 변주가 활성으로 열린다. `?v` 없음/범위밖/비숫자 → 1번 변주 폴백, crash 0. (vitest resolveActiveIndex 전수 + Playwright)
- [ ] AC5: **no-JS에서 모든 변주 패널이 보인다**(서버가 전부 visible 렌더 → JS 없이도 전체 접근). (Playwright `javaScriptEnabled:false`)
- [ ] AC6: 키보드(WAI-ARIA Tabs): 탭에 포커스 후 ←/→ 로 인접 탭 이동·활성화, Home/End 로 처음·끝, roving tabindex(활성 탭만 Tab 시퀀스). (Playwright)
- [ ] AC7: 탭 위젯 ARIA: `role=tablist`/`tab`/`tabpanel`, `aria-selected`, `aria-controls`↔`aria-labelledby` 연결. axe 위반 0. (vitest 구조 + Playwright axe)
- [ ] AC8: 변주가 **1개뿐이면 탭바를 렌더하지 않고** 패널만 표시한다(YAGNI). (vitest)
- [ ] AC9: 320/375/768/1024/1440 에서 탭바 가로 오버플로 0, 터치 타깃 ≥44px, 탭 라벨 클리핑 0(긴 라벨 wrap/ellipsis). (Playwright edge-3.1/edge-3.8)
- [ ] AC10: 빌드가 정적(SSG) 유지 — 곡 라우트 `● SSG`, 런타임 페치 0. `useSearchParams` 클라이언트 아일랜드는 Suspense 경계로 격리되어 패널은 정적 HTML에 남는다. (next build 로그)
- [ ] AC11: `prefers-reduced-motion: reduce` 시 탭 전환·스와이프 모션 ≤0.1s(즉시), 기능 변화 0. (Playwright cross-5.4)

## 비목표 (Non-goals)
- 변주 **나란히 동시 비교**(2패널 split) → 채택 안 함. 탭 전환(한 번에 하나)으로 확정(설계 결정 1).
- 변주 간 diff 하이라이트(어떤 노브가 달라졌는지 색칠) → 이번 스코프 아님. 후속 후보.
- 스택 내비 프레임워크(Stackflow 등) → 기각(모델 불일치·JS 런타임 필수로 no-JS 위배·복잡도).
- 곡 목록/검색 진입 → #3(song-index).
- 패치 편집/토글 → 읽기 전용(프로젝트 헌법).
- 라이트 테마 → 다크 단일 유지.

## 열린 질문
- CSS 기본 탭 숨김 기법(`.js` 클래스 + `[data-active]` vs `:target`) — TRD에서 접근성·no-flash 우선으로 택1.
- `?v` 딥링크(비-첫 변주)로 진입 시 하이드레이션 전 한 프레임 패널 스왑 허용 여부 — TRD에서 결정(공통 케이스 무플래시 우선).
- 터치 스와이프 제스처 채택 여부 — 선택적 향상. TRD에서 비용 대비 결정(미채택 시 비목표로 이동).
