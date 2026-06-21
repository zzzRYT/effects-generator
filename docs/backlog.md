# 백로그 — 트랙 2 사이클 대상

각 항목 = `docs/web-harness.md`의 루프 한 사이클. 위에서부터 의존 순서.
사이클 시작 = `/superpowers:brainstorm <항목>`.

## 현재 상태 (resume 포인터) — 2026-06-21

> 새 세션은 이 줄부터 읽으면 어디서 이어갈지 안다. CLAUDE.md → 이 파일이 트랙2 진입점.

- ✅ **선행 셋업** 완료: `web/`(Next 16 · App Router · CSS Modules · 이중 게이트 tsgo/tsc/eslint/vitest/playwright) + `docs/data-contract-ui.md`.
- ✅ **사이클 #0 `patch-parser`** 완료 — `patches/**/*.md` → `web/lib/patches.generated.ts` 빌드 파서. 복기: `docs/reviews/patch-parser.md`.
- ✅ **사이클 #1 `signal-chain-view`** 완료 — `/songs/[slug]` 정적 라우트 + 곡의 모든 변주 세로 나열. GP-150 **기계 패널 리얼리즘**(다크 단일테마, 가로 신호흐름, LCD 텍스트 노브, LED, 풋스위치 배지/그룹). 범용 블록-체인 렌더러(`block.type`만 보고 그림). 순수함수(contrast/renderKnob/blockType)+불변제약 자동검증. **113 vitest(funcs 100%) + 36 Playwright(4브레이크포인트 비주얼 + axe a11y=0), lint/tsgo/tsc/build green.** CE 병렬리뷰(3) 검증우선 처리, CRITICAL/HIGH=0. 설계 `docs/plans/2026-06-21-signal-chain-view-design.md`, 복기 `docs/reviews/signal-chain-view.md`.
- ✅ **사이클 #2 `variation-compare`** 완료 — 변주 **탭 위젯**(한 번에 하나, `?v=N` URL 공유). 점진적 향상: 서버가 모든 패널을 정적 HTML 로 그려 **no-JS=전부 표시**, JS 아일랜드(null 렌더)가 `getElementById`로 강화 → 한 번에 하나. `useSearchParams`는 Suspense 격리(SSG 유지). WAI-ARIA Tabs(roving tabindex·←/→/Home/End). **145 vitest + 72 Playwright(4 브레이크포인트, axe 0, no-JS, reduced-motion), lint/tsgo/tsc/build green(● SSG).** CE 병렬리뷰(6) 검증우선, CRITICAL/HIGH=0. 설계 `docs/plans/2026-06-21-variation-compare-design.md`, 복기 `docs/reviews/variation-compare.md`.
- ✅ **사이클 #3 `song-index`** 완료 — 홈을 **곡 목록/검색 진입점**으로. 정적 목록 + 검색창 + rig 칩, URL `?q=&rig=`(공유), 0결과 빈상태 + 라이브 카운트. 점진적 향상: 리스트 정적(no-JS=전부) + 컨트롤 아일랜드(`useSyncExternalStore` 하이드레이션 게이트), genre 는 칩 대신 검색 대상(긴 서술문이라). **169 vitest + 124 Playwright(4 bp, axe 0, no-JS, 레이스가드), lint/tsgo/tsc/build green(○ Static).** CE 병렬리뷰(6) CRITICAL/HIGH=0. 복기 `docs/reviews/song-index.md`(⚠ dev서버 재사용·하이드레이션 교훈 포함).
- ▶ **진행 중: 사이클 #4 `request-form`** — 설계 확정·커밋. 곡 제보 폼(곡·아티스트·요청자·메모) → Web3Forms → Gmail. **백엔드 0.** **확정 방향: `<dialog>` 모달 + no-JS 는 실제 `/request` 정적 페이지로 강등**(PE, 폼 컴포넌트 1개 공유). 전역 진입점=빈상태+신설 `<footer>`. 키는 `web/.env.local`(`NEXT_PUBLIC_WEB3FORMS_KEY`, 사용자가 `jinjinstar3@gmail.com` 연결해 직접 설정), SITE_URL/redirect 는 추후. 설계: `docs/plans/2026-06-21-request-form-design.md`. 다음: PRD→TRD→TDD→CE리뷰→QA. 선행: `cd web && npx playwright install`.
- **미해결 메모**: ✅ ~~① yb slug 충돌~~ 해소(0b9a3b5). ② cross-5.5/5.7(LCP/CLS) Lighthouse 미측정(정적이라 위험 낮음). ③ hanroro switching.B 경고 2건. ④ rig 칩 radiogroup 업그레이드(선택적 a11y).
- 브랜치: `feat/web-patch-parser` (#0~#3 커밋, main 미병합·origin 미push).

| # | 피처 | slug | 비고 |
|---|------|------|------|
| 0 | **md 파서 → `patches.generated.ts`** | `patch-parser` | 인프라 척추. `docs/parser-contract.md` 구현. 오아시스 1곡 검증. UI 전에 이게 먼저. TDD 강하게. |
| 1 | **곡 상세 — 시그널 체인 렌더러 (GP-150 스킨)** | `signal-chain-view` | 핵심 가치. 범용 블록-체인 렌더러 + 프로세서 스킨. block.type만 보고 그림. |
| 2 | **변주 3개 비교 뷰** | `variation-compare` | 같은 곡의 변주를 나란히. 탭/카드. |
| 3 | **곡 목록 / 검색** | `song-index` | 진입점. 정적 목록 + 클라이언트 필터. |
| 4 | **제보 폼** | `request-form` | 폼-투-이메일(Web3Forms) → Gmail. 백엔드 없음. |

## 선행: 앱 부트스트랩 + UI 렌더 계약
위 사이클 전에 일회성으로:
1. `web/`를 `create-next-app`으로 띄우고 `docs/web-harness.md`의 도구·스크립트(tsgo/eslint/vitest/playwright) 실체화.
2. **`docs/data-contract-ui.md` 작성** — `docs/verification-rubric.md`가 요구하는 UI 렌더 계약:
   - 블록 타입(OD/AMP/CAB/DLY/RVB…)별 색상 토큰 + 명도(WCAG AA 대비)
   - 노브 렌더 형식(`name: value unit` / unit 없으면 `(0–10)` `(0–100)` 스케일 표기)
   - 풋스위치 배지·그룹 시각 규칙, enabled/disabled 상태 스타일(opacity+grayscale)
   - switching 메타필드 JSON 형식
   > 색상·아이콘 등 디자인 선택은 사이클 #1의 `/superpowers:brainstorm`에서 확정. 루브릭의 "데이터 계약 사전 정의" 섹션이 제안 기본값.
부트스트랩·계약 작성은 루프 대상이 아니라 셋업.

## 사이클 우선순위 근거
- #0이 흔들리면 전부 흔들린다 → 데이터 척추부터.
- #1이 "whoa" → 가치 검증을 두 번째로 빠르게.
- #4(제보)는 가치 검증 후에 — 보여줄 게 있어야 제보가 의미 있음.
