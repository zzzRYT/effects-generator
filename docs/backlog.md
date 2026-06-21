# 백로그 — 트랙 2 사이클 대상

각 항목 = `docs/web-harness.md`의 루프 한 사이클. 위에서부터 의존 순서.
사이클 시작 = `/superpowers:brainstorm <항목>`.

## 현재 상태 (resume 포인터) — 2026-06-21

> 새 세션은 이 줄부터 읽으면 어디서 이어갈지 안다. CLAUDE.md → 이 파일이 트랙2 진입점.

- ✅ **선행 셋업** 완료: `web/`(Next 16 · App Router · CSS Modules · 이중 게이트 tsgo/tsc/eslint/vitest/playwright) + `docs/data-contract-ui.md`.
- ✅ **사이클 #0 `patch-parser`** 완료 — `patches/**/*.md` → `web/lib/patches.generated.ts` 빌드 파서. 복기: `docs/reviews/patch-parser.md`.
- ✅ **사이클 #1 `signal-chain-view`** 완료 — `/songs/[slug]` 정적 라우트 + 곡의 모든 변주 세로 나열. GP-150 **기계 패널 리얼리즘**(다크 단일테마, 가로 신호흐름, LCD 텍스트 노브, LED, 풋스위치 배지/그룹). 범용 블록-체인 렌더러(`block.type`만 보고 그림). 순수함수(contrast/renderKnob/blockType)+불변제약 자동검증. **113 vitest(funcs 100%) + 36 Playwright(4브레이크포인트 비주얼 + axe a11y=0), lint/tsgo/tsc/build green.** CE 병렬리뷰(3) 검증우선 처리, CRITICAL/HIGH=0. 설계 `docs/plans/2026-06-21-signal-chain-view-design.md`, 복기 `docs/reviews/signal-chain-view.md`.
- ▶ **다음: 사이클 #2 `variation-compare`** — `/superpowers:brainstorm variation-compare`부터. 같은 곡 변주를 나란히/탭으로 비교(ui-1.8 변주 탭 = 이 사이클). 선행 권장: `cd web && npx playwright install`(브라우저 버전 갱신 시 필요했음).
- **미해결 메모**: ① `yb-white-whale` slug 충돌 — 두 rig(g250-gp150·xt-450-gp150)에 같은 파일명 → slug 동일, 라우트가 하나만 노출. 파서(#0) slug 에 rig 미포함이 원인 → slug 를 rig-qualified 로 바꿀지 결정 필요. ② cross-5.5/5.7(LCP/CLS) Lighthouse 미측정(정적이라 위험 낮음). ③ hanroro switching.B 경고 2건(설명만, 블록 없음).
- 브랜치: `feat/web-patch-parser` (#0 커밋 + #1 미커밋, main 미병합·origin 미push).

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
