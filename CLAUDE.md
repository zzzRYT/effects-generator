# CLAUDE.md — 프로젝트 헌법

멀티 이펙터 톤 라이브러리. 곡별 기타 톤을 멀티 이펙터 패치로 만들고, 웹에서 시각적으로 본다.
GP-150이 첫 프로세서일 뿐, 데이터·구조는 **프로세서 비종속**으로 설계한다.

설계 문서: `~/.gstack/projects/zzzRYT-effects-generator/leejaejin-main-design-20260619-150953.md`

## 두 개의 레이어

1. **생산 레이어 (md)** — `tone-builder` 스킬이 곡을 조사해 검증된 패치를 만든다. **이게 가치의 원천.**
2. **소비 레이어 (web)** — `web/`의 Next.js 앱이 패치를 GP-150 기계 화면처럼 시각화한다. 읽기 전용.

## 절대 규칙 (Source of Truth)

- **md가 유일한 진실이다.** `patches/`, `models/`, `rigs/`의 마크다운이 SoT.
- **웹은 읽기 전용 정적 뷰다.** 빌드 타임에 md를 파싱해 **타입 상수**로 구워 넣는다. 런타임 DB 없음, 편집 없음. 톤 수정은 md를 고치고 다시 빌드한다.
- **DB 없음.** Supabase·런타임 데이터스토어 안 쓴다. 패치 = 빌드 산출물.
- **곡 제보는 이메일로** (DB 테이블 아님). 제보 폼/링크 → Gmail. 백엔드 0.

DB를 다시 도입하거나 웹 편집 UI를 넣는 변경은 하기 전에 반드시 사용자에게 확인한다 (의도적으로 뺀 복잡도).

## 스택

- **Next.js (App Router, TypeScript)** — `web/`, 정적 빌드, Vercel 배포 (main 푸시 → 빌드 → 배포).
- **DB·백엔드 없음.** 패치는 빌드 타임 상수. 제보는 이메일.
- **모노레포** — 이 repo 안에 `web/`. 빌드 시 같은 트리의 `../patches`, `../models`, `../rigs`를 직접 읽는다.

## 데이터 계약 (척추)

패치 = `signal_chain`: **순서 있는 block 배열.** 각 block = `{ type, model, base_gear?, enabled, footswitch?, knobs: [{name, value, unit?}] }`.
GP-150의 AMP/CAB/OD/DLY/RVB가 전부 이 한 형태로 표현된다. 렌더러는 `block.type`만 보고 그린다.

- 전체 스펙·예시·검증 규칙: **`docs/parser-contract.md`** (생산자 tone-builder와 소비자 파서가 둘 다 따르는 권위 문서).
- TS 타입은 `web/lib/types.ts`에 단일 정의하고 파서·렌더러가 공유한다 (앱 부트스트랩 후 생성).
- 빌드 타임 파서가 md → 타입 상수(예: `web/lib/patches.generated.ts`)로 굽는다. `knobs`는 그 상수 안의 배열 = 위 모양 그대로.

## 디렉터리 지도

```
models/        # 장비 모델 (프로세서 비종속 단위)
  guitars/<guitar>.md
  processors/<processor>/  profile · hardware · amps · cabs · effects
rigs/<guitar>-<processor>.md   # 기타+프로세서 조합. default 플래그.
patches/<rig>/<artist>-<song>.md  # 곡별 패치 (사람용 줄글 + signal_chain 펜스)
patches/INDEX.md
docs/parser-contract.md        # md → jsonb 입력 계약
web/                           # Next.js 앱 (아직 미부트스트랩)
.claude/skills/tone-builder/   # 곡 → 패치 생성 스킬
```

## 두 트랙

- **트랙 1 (곡 → 이펙트 값)**: `.claude/skills/tone-builder/SKILL.md` + `docs/parser-contract.md`로 닫힘.
- **트랙 2 (사이트 코드)**: `web/` 구현. **반드시 `docs/web-harness.md`의 루프를 따른다.**
  - 루프: `/superpowers:brainstorm` → PRD → TRD → TDD → CE 리뷰(복기) → QA, 매 편집 후 lint + typecheck(tsgo) 게이트.
  - 다음 사이클 대상: `docs/backlog.md`. 단계 템플릿: `docs/templates/`.
  - 타입체크는 tsgo(TS7 preview)로 빠르게, 커밋 직전 `tsc`로 풀 검증(이중 게이트).
  - **QA = `docs/verification-rubric.md`** (5개 목적 50기준)로 점수 매겨 목적 달성까지 loop-until-pass.

## 스킬 라우팅

- "이 곡 톤 만들어줘" / 새 패치 → **`tone-builder`** 스킬. 패치는 항상 이걸로 만든다 (손으로 추측 금지).
- 패치 md를 만들 땐 `docs/parser-contract.md`의 `signal_chain` 펜스를 **반드시 함께** 쓴다 (안 그러면 빌드 파서가 못 읽음).
- `web/` 작업 → `docs/web-harness.md` 루프 진입. 새 피처는 `/superpowers:brainstorm`부터.
- 제보 폼에서 신청이 오면 → `tone-builder`로 패치 만들고 md에 추가 → 다시 빌드/배포.

## 컨벤션

- 문서·주석·커밋 메시지: **한국어**. 코드 식별자: 영어.
- 커밋: `<type>: <설명>` (feat/fix/refactor/docs/chore). 사용자가 요청할 때만 커밋.
- 웹 코드는 전역 web 규칙(feature 폴더, CSS 토큰, compositor-friendly 애니메이션, 시맨틱 HTML, 불변성)을 따른다.
- 파일은 작게 (200–400줄, 800 max). 기능/도메인 단위로 묶는다.
- 노브 값 모호 표현 금지 — 항상 숫자 + 단위 (tone-builder 스킬 규칙과 동일).

## 명령어

`web/` 부트스트랩 후 여기에 dev/build/sync/lint 명령을 추가한다. (현재 앱 미생성)

## 앱 부트스트랩 (다음 스텝)

1. `cd web && npx create-next-app@latest . --typescript --app` (빈 디렉터리에서)
2. `web/lib/types.ts` — `docs/parser-contract.md`의 타입을 코드로.
3. 빌드 타임 md 파서 → `web/lib/patches.generated.ts` 타입 상수. 오아시스 1곡 검증.
4. 곡 상세 = 범용 블록-체인 렌더러 + GP-150 스킨. 변주 3개 비교.
5. 제보 폼(곡·아티스트·요청자·메모) → 폼-투-이메일 서비스(Web3Forms 권장, access key는 `web/.env`) → Gmail. 백엔드 없음.
