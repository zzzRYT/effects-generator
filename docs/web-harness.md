# 트랙 2 구현 하네스 — 웹 사이트 루프

트랙 2(`web/` 사이트 코드)를 AI가 **명확히 읽고 루프를 돌려가며** 이행하기 위한 실행 절차.
한 사이클 = 피처 1개. 모든 사이클은 아래 6단계를 순서대로 통과한다. 단계 간 게이트를 못 넘으면 다음으로 가지 않는다.

> 트랙 1(곡 → 이펙트 값)은 `.claude/skills/tone-builder/SKILL.md` + `docs/parser-contract.md`로 닫혀 있다. 이 문서는 트랙 2 전용.

## 루프 개요

```
/superpowers:brainstorm ─▶ PRD ─▶ TRD ─▶ TDD ─▶ CE 리뷰(복기) ─▶ QA
                               └── 매 편집 후 게이트: lint + typecheck(tsgo) ──┘
```

산출물은 전부 `docs/` 아래 피처 slug로 모인다 — 다음 사이클이 읽고 복기할 수 있게.

```
docs/
  brainstorm/<feature>.md   # 0. 탐색 결과
  prd/<feature>.md          # 1. 무엇·왜·수용 기준
  trd/<feature>.md          # 2. 어떻게(설계)
  reviews/<feature>.md      # 4. 리뷰 발견 + 복기
docs/templates/             # 각 단계 템플릿
docs/backlog.md             # 피처 목록(다음 루프 대상)
docs/verification-rubric.md # QA 권위 기준 (5목적 50기준, loop-until-pass)
```

> **"목적 달성까지 루프"의 정의** = QA 단계가 `docs/verification-rubric.md`의 5개 목적 임계를 모두 충족할 때까지. 미달 목적엔 구조화 피드백 → 구현 되돌림 → 재검증.

---

## 단계별 정의

### 0. Brainstorm — `/superpowers:brainstorm`
- **입력**: 피처 아이디어 한 줄 (예: "곡 상세에서 시그널 체인을 GP-150 화면처럼 보여주기").
- **활동**: `/superpowers:brainstorm` 실행 — 접근법·UX·엣지케이스·레퍼런스를 발산하고 한 방향으로 수렴.
- **산출**: `docs/brainstorm/<feature>.md` — 고른 방향 + 버린 대안 + 열린 질문.
- **게이트**: 방향 1개 확정, 열린 질문 해소 또는 PRD로 넘길 것 명시.

### 1. PRD — `docs/prd/<feature>.md`
- 무엇을, 왜, 누구를 위해, **측정 가능한 수용 기준**, 비목표(non-goals).
- 템플릿: `docs/templates/prd.md`.
- **게이트**: 모든 수용 기준이 테스트로 검증 가능한 형태. 모호하면("예쁘게") 반려.

### 2. TRD — `docs/trd/<feature>.md`
- 컴포넌트 구조, 파일 목록, 데이터 흐름, **타입**(`web/lib/types.ts`·`docs/parser-contract.md` 참조), 상태, 엣지케이스, 테스트 계획 개요.
- 권장: `code-architect` 에이전트로 초안.
- 템플릿: `docs/templates/trd.md`.
- **게이트**: 각 수용 기준이 컴포넌트·테스트에 1:1 매핑됨. 새 의존성은 근거 명시.

### 3. TDD — 테스트 먼저
- 테스트 계획대로 **테스트를 먼저 쓴다(RED)** → 최소 구현(GREEN) → 리팩터.
- 유닛/컴포넌트: **Vitest**. 비주얼 회귀·플로우: **Playwright** (브레이크포인트 320/768/1024/1440, reduced-motion).
- 시각 비중 큰 컴포넌트는 마크업 단언보다 **비주얼 스냅샷**이 신호가 크다.
- **게이트**: 구현 전 테스트 존재, 전부 green, 커버리지 ≥ 80%, 스냅샷 커밋됨.

### 게이트 (상시, 모든 편집 후)
- `lint` (eslint) — 자동수정 후 통과.
- `typecheck` (**tsgo / TS7 preview**) — 빠른 타입 게이트. green 아니면 진행 금지.
- 루프 안에선 tsgo로 빠르게, **커밋 직전 `typecheck:full`(정식 tsc)** 로 풀 검증(preview 미지원 케이스 대비).

### 4. CE 리뷰 — 복기까지
- `compound-engineering:review:*` 에이전트를 **병렬**로:
  - `correctness-reviewer` (always-on), `maintainability-reviewer` (always-on), `testing-reviewer` (always-on), `kieran-typescript-reviewer`(TS).
  - 비동기 UI 있으면 `julik-frontend-races-reviewer`, 접근성 민감하면 `a11y-architect`.
- 심각도별 정리 → **CRITICAL/HIGH는 머지 전 수정**(전역 code-review 규칙).
- **복기(필수)**: `docs/reviews/<feature>.md`에 — 무엇을 발견·수정했나, 다음에 피할 패턴, 재사용할 결정. 컴파운딩의 핵심.
  - 5분 이상 아낄 교훈이면 `~/.claude/skills/gstack/bin/gstack-learnings-log`에도 기록.
- **게이트**: CRITICAL/HIGH = 0, 복기 기록 존재.

### 5. QA — 실제 동작 (loop-until-pass)
- **권위 기준: `docs/verification-rubric.md`** — 5개 목적(UI 표현·값 명확성·엣지케이스·풋스위치 전환·교차품질), 50개 측정 가능 기준.
- `/qa` 또는 `gan-evaluator`로 각 기준을 0~5 스코어 → 목적별 임계 판정. 미달이면 구조화 피드백 → 구현(TDD)으로 되돌림 → **목적 달성까지 반복**(최대 5회, 수렴 가드).
- 핵심 플로우(곡 찾기 → 패치 봄 → 변주 3개 비교 → 제보 폼 제출) + 브레이크포인트(320/375/768/1024/1440) + a11y + reduced-motion 전부 루브릭에 포함.
- **게이트**: 루브릭 5개 목적 모두 임계 충족 = "목적 달성". 이게 사이클 종료 신호.

---

## 도구 (부트스트랩 때 실체화)

`web/`를 `create-next-app`으로 띄운 뒤 아래를 설치·설정하고 `package.json` 스크립트를 박는다.

| 역할 | 도구 | 비고 |
|------|------|------|
| 타입체크(빠름) | **`@typescript/native-preview`** (`tsgo`) | TS7 네이티브 preview, ~10x. 루프 게이트용. |
| 타입체크(정식) | `typescript` (`tsc`) | 커밋 직전 풀 검증 fallback. |
| 린트 | ESLint (next 플랫 config) | `--fix`. |
| 유닛/컴포넌트 | Vitest | 커버리지 80%. |
| 비주얼/E2E | Playwright | 320/768/1024/1440, reduced-motion. |
| 패치 생성 | 빌드 타임 md 파서 | `docs/parser-contract.md` → `web/lib/patches.generated.ts`. |
| 제보 | 폼-투-이메일(Web3Forms) | 백엔드 없음. |

### 계획된 `package.json` 스크립트 (부트스트랩 시 반영)

```jsonc
{
  "scripts": {
    "dev": "next dev",
    "build": "npm run gen:patches && next build",
    "gen:patches": "tsx scripts/gen-patches.ts",   // md → patches.generated.ts
    "lint": "eslint . --fix",
    "typecheck": "tsgo --noEmit",                   // TS7 preview, 루프 게이트
    "typecheck:full": "tsc --noEmit",               // 커밋 직전 풀 검증
    "test": "vitest run --coverage",
    "test:visual": "playwright test"
  }
}
```

> tsgo는 preview라 일부 기능 미지원일 수 있다. 루프 속도는 tsgo로, 최종 신뢰는 `typecheck:full`로 잡는 **이중 게이트**가 이 하네스의 핵심.

---

## 한 사이클 체크리스트

- [ ] 0. `/superpowers:brainstorm` → `docs/brainstorm/<feature>.md`, 방향 확정
- [ ] 1. PRD 작성, 수용 기준 측정 가능
- [ ] 2. TRD 작성, 기준 ↔ 컴포넌트·테스트 매핑
- [ ] 3. 테스트 먼저(RED) → 구현(GREEN) → 리팩터, 커버리지 80%
- [ ] 게이트: `lint` + `typecheck`(tsgo) green 유지
- [ ] 4. CE 리뷰 병렬 실행 → CRITICAL/HIGH 0 → `docs/reviews/<feature>.md` 복기
- [ ] 5. QA 핵심 플로우 통과
- [ ] 커밋 직전 `typecheck:full`(tsc) green
