# CLAUDE.md — 프로젝트 헌법

멀티 이펙터 **톤 생성기**. 아티스트+곡명을 입력하면 AI가 그 곡의 기타 톤을 조사해 멀티 이펙터 패치로 **생성**하고, 웹 카탈로그에 자동 축적·시각화한다.
GP-150이 첫 프로세서일 뿐, 데이터·구조는 **프로세서 비종속**으로 설계한다.

> **2026-06-25 피벗:** 정적 큐레이션 라이브러리(사람이 스킬 호출 → md → 빌드타임 정적 뷰) → **셀프서브 AI 톤 생성기**(입력 → n8n 생성 → Supabase 자동 축적 → 동적 카탈로그).
> 전체 설계(결정·아키텍처·단계): **`docs/plans/2026-06-25-tone-generator-pivot-design.md`** — 이 헌법보다 상세. 충돌 시 설계 문서가 권위.
> 이전 설계(정적 시절): `~/.gstack/projects/zzzRYT-effects-generator/leejaejin-main-design-20260619-150953.md`.

## 두 개의 레이어

1. **생성 레이어 (n8n + AI)** — 사용자가 아티스트+곡명 입력 → n8n 워크플로우가 곡 톤을 리서치하고 GP-150 장비 데이터에 **그라운딩**해 `signal_chain` JSON 패치를 생성한다. **이게 가치의 원천.** 생성 로직 권위 = `.claude/skills/tone-builder/SKILL.md`(프롬프트 소스) + `docs/parser-contract.md`(출력 계약).
2. **카탈로그 레이어 (web)** — `web/`의 Next.js 앱이 Supabase에 축적된 패치를 GP-150 기계 패널처럼 렌더하고, 생성 폼·검색·투표를 제공한다. **동적**(런타임 조회).

## 절대 규칙 (Source of Truth)

- **Supabase가 카탈로그의 SoT다.** 생성된 패치 = `patches` 테이블의 행(`variations` JSONB = `signal_chain` 계약 그대로). 생성은 AI, 조회는 런타임.
- **캐시-우선.** `(artist_norm, title_norm, processor)`가 이미 있으면 재생성하지 않고 반환. 재생성은 명시적 요청 시 새 `version`으로 누적(이전 보존).
- **생성 품질 게이트.** AI 출력은 `docs/parser-contract.md` 검증을 통과해야만 적재된다(할루시네이션·형식붕괴 차단). 통과 못 하면 `job=failed`, 카탈로그 오염 0.
- **문의·피드백은 이메일.** 개발자 문의(버그/기능/일반)는 폼 → Web3Forms → Gmail. 이 경로만 백엔드 0(카탈로그 DB와 무관).

> 이전 헌법의 `md가 유일한 진실`·`웹은 읽기 전용 정적`·`DB 없음`은 2026-06-25 피벗으로 **폐기**. `patches/*.md`는 초기 카탈로그 씨앗(과거 기록)으로만 보존. 스키마·생성 흐름을 바꾸는 변경은 설계 문서와 정합을 확인하고 진행한다.

## 스택

- **Next.js (App Router, TypeScript)** — `web/`, **동적**(런타임 Supabase 조회 + 생성 폼), Vercel 배포.
- **Supabase** — 카탈로그 DB(Postgres) + Realtime(생성 진행 푸시) + RLS(공개읽기 / 서버·n8n 쓰기). 프로젝트 ref: `mooypzyzymussbeszcao`.
- **n8n** — 톤 생성 오케스트레이션(리서치→그라운딩→생성→검증·수리). LLM = Gemini Flash(리서치+생성) → 필요시 생성단계 GPT-4o-mini 승급. API 종량제, 캐시로 신곡 1회만 과금.
- **Tailwind + shadcn(themed) + 디자인 토큰(OKLCH)** — 맥북 니어블랙 + 정직한 실제 기어색(네온 X). react-icons.
- **모노레포** — 이 repo 안에 `web/`. GP-150 장비 데이터(`models/`)는 생성 그라운딩 소스.

## 데이터 계약 (척추 — 피벗 후에도 불변)

패치 = `signal_chain`: **순서 있는 block 배열.** 각 block = `{ type, category?, model, base_gear?, enabled, footswitch?, knobs: [{name, value, unit?}] }`.
GP-150의 12모듈(NR·PRE·WAH·DST·NS·AMP·CAB·EQ·MOD·DLY·RVB·VOL)이 전부 이 한 형태로 표현된다. 렌더러는 `block.type`만 보고 그린다. (계약 자체는 피벗과 무관 — 출처만 빌드타임 md → 런타임 Supabase JSONB로 바뀜.)

- 전체 스펙·예시·검증 규칙: **`docs/parser-contract.md`** (생성기 n8n과 소비자 렌더러가 둘 다 따르는 권위 문서).
- TS 타입은 `web/lib/types.ts`에 단일 정의, 렌더러·검증이 공유.
- n8n이 이 모양으로 생성 → `web/lib/parser/validate.ts` 규칙 통과 → Supabase `patches.variations` JSONB로 적재 → 웹이 런타임 조회해 렌더.

## 디렉터리 지도

```
models/        # 장비 모델 (프로세서 비종속 단위) — 생성 그라운딩 소스
  guitars/<guitar>.md
  processors/<processor>/  profile · hardware · amps · cabs · effects
rigs/<guitar>-<processor>.md           # 기타+프로세서 조합. default 플래그.
patches/<rig>/<artist>-<song>.md       # (과거) 정적 라이브러리 → 이제 Supabase 카탈로그 씨앗
docs/parser-contract.md                # signal_chain 생성/검증 계약 (권위)
docs/plans/2026-06-25-tone-generator-pivot-design.md  # 피벗 전체 설계
docs/backlog.md                        # 트랙2 사이클 진입점 (상단 = 피벗 포인터)
web/                                   # Next.js 동적 카탈로그 + 생성 폼
.claude/skills/tone-builder/           # 생성 로직 = n8n 시스템 프롬프트 소스
```

## 두 트랙

- **트랙 1 (생성 — 곡 → signal_chain)**: `.claude/skills/tone-builder/SKILL.md`(프롬프트 로직) + `docs/parser-contract.md`(계약)를 **n8n 워크플로우로 이식**. 그라운딩 = `models/processors/<p>/`. 검증 = `web/lib/parser/validate.ts` 규칙.
- **트랙 2 (웹 코드)**: `web/` 구현. **`docs/web-harness.md` 루프**(brainstorm→PRD→TRD→TDD→CE 리뷰→QA, 매 편집 후 lint + typecheck(tsgo) 게이트, 커밋 직전 `tsc` 풀 검증). 다음 사이클: `docs/backlog.md`. QA = `docs/verification-rubric.md`.

## 스킬 라우팅

- 톤 생성 = **n8n 워크플로우**(셀프서브). `tone-builder` 스킬은 **생성 프롬프트의 권위 소스이자 수동 폴백**(n8n 없이 한 곡 만들 때).
- 생성/패치 출력은 `docs/parser-contract.md`의 `signal_chain` 계약을 **반드시** 따른다(안 그러면 검증 실패 → 미적재).
- `web/` 작업 → `docs/web-harness.md` 루프 진입. 새 피처는 `/superpowers:brainstorm`부터.
- 사용자 문의(폼) → 개발자 이메일(Web3Forms→Gmail).

## 컨벤션

- 문서·주석·커밋 메시지: **한국어**. 코드 식별자: 영어.
- 커밋: `<type>: <설명>` (feat/fix/refactor/docs/chore). 사용자가 요청할 때만 커밋.
- 웹 코드는 전역 web 규칙(feature 폴더, CSS 토큰, compositor-friendly 애니메이션, 시맨틱 HTML, 불변성)을 따른다.
- 파일은 작게 (200–400줄, 800 max). 기능/도메인 단위로 묶는다.
- 노브 값 모호 표현 금지 — 항상 숫자 + 단위 (tone-builder 스킬 규칙과 동일).

## 명령어

`web/` 기준: `npm run dev` · `build` · `lint` / `lint:check` · `typecheck`(tsgo) / `typecheck:full`(tsc) · `test`(vitest) / `test:cov` · `test:visual`(playwright). (`gen:patches`는 피벗으로 DB 조회 전환 예정.)

## 현재 상태 (피벗 진행)

- ✅ 정적 라이브러리 사이클 #0~#6 완료 (signal_chain 렌더러·변주비교·검색·제보폼·기타세팅). 기록 = `docs/backlog.md`.
- 🔀 **2026-06-25 피벗 시작.** Phase 0: Supabase 스키마/씨앗/RLS/Realtime 적용 완료(`mooypzyzymussbeszcao`) + 이 헌법 개정. 다음 = Phase 1(n8n 두뇌). 단계 전체 = 설계 §12, 진입점 = `docs/backlog.md` 상단.
