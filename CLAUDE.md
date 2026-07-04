# CLAUDE.md — 프로젝트 헌법

멀티 이펙터 **톤 생성기**. 곡명+아티스트+**내 기타+내 이펙터**를 입력하면 AI가 그 곡의 기타 톤을 조사해 **용도별(lead/backing/solo) 시그널 체인**으로 생성하고, 웹 카탈로그에 자동 축적·시각화한다.
기어(기타·이펙터)는 각각 독립 KB 레코드이며, 데이터·구조는 **기기 비종속**으로 설계한다.

> **2026-07-04 구조 리셋:** 설계 리셋 + 코드 선별 재사용. 독립 엔티티 4 + 중간 레이어 2, 고정 3-role 생성, 어드민 기어 온보딩 파이프라인, **n8n 제거**(파이프라인 = 앱 내 TS 모듈).
> 전체 설계(결정·아키텍처·단계): **`docs/plans/2026-07-04-structure-reset-design.md`** — 이 헌법보다 상세. 충돌 시 설계 문서가 권위.
> 폐기된 이전 설계: `2026-06-25-tone-generator-pivot-design.md`(피벗), `2026-06-28-canonical-projection-architecture-design.md`(캐논·투영) — 참고자료로만 보존.

## 아키텍처 골격 (설계 §1)

- **독립 엔티티 4** (서로를 모름): `guitars`(기타 KB) · `processors`(이펙터 KB: FX 카탈로그·노브 정의) · `songs`(곡 정규화) · `tones`(생성 산출물).
- **중간 레이어 2** (조합 지식은 여기만): `ToneRequestResolver`(입력→정규화 튜플, 미등록 기어→온보딩 큐) · `ToneGrounding`(생성 프롬프트 컨텍스트 조립).
- **기타는 바디 아키타입 6종**(`strat/tele/lespaul/sg/superstrat/hollow`)으로 정규화 — 사용자는 실제 기타명 입력, 내부 매핑. 조합 폭발 억제.
- **어드민 온보딩**: 미등록 기어 → 자동 리서치 파이프라인(수집→정제→draft) → `/admin` 승인 게이트 → approved만 생성에 사용.

## 절대 규칙 (Source of Truth)

- **Supabase가 SoT다.** 기어 KB(`guitars`/`processors`) + 곡(`songs`) + 톤(`tones`) + 잡(`tone_jobs`/`gear_onboarding_jobs`). 원본 리서치 문서(PDF/HTML)는 Storage 보관(출처·감사용).
- **캐시-우선.** 유니크 키 `(song_id, body_archetype, processor_id, role, version)`. 히트 시 재생성하지 않되, UX는 **연출된 진행(20~40초)** 후 반환(신뢰성 — 설계 §0).
- **생성 품질 게이트.** AI 출력은 스키마 + **FX가 해당 프로세서 카탈로그에 실존** + 노브 범위 검증을 통과해야 적재. 실패 → 1회 자동 수리 → 재실패 시 `job=failed`. 카탈로그 오염 0.
- **approved만 사용.** draft 기어는 생성·매칭 대상이 아니다. 어드민 승인 게이트 = 톤 품질 게이트.
- **문의·피드백은 이메일.** 폼 → Web3Forms → Gmail. 이 경로만 백엔드 0.

## 스택

- **Next.js (App Router, TypeScript)** — `web/`, 동적(런타임 Supabase 조회 + 생성 폼 + `/admin`), Vercel 배포.
- **Supabase** — DB(Postgres) + Realtime(잡 진행 푸시) + Auth(admin role) + Storage(원본 문서) + RLS(공개읽기=approved/done만, 쓰기=서버). 프로젝트 ref: `mooypzyzymussbeszcao`.
- **파이프라인 = 앱 내부 TS** (`web/lib/pipeline/`) — 리서치→그라운딩→생성→검증·수리, Route Handler/백그라운드 함수로 실행. **n8n 없음**(근거 = 설계 §6).
- **LLM = Gemini**(검색 그라운딩 내장). 호출은 `web/lib/llm/client.ts` OpenAI 호환 인터페이스 한 곳 — 추후 Ollama 교체 seam.
- **Tailwind + shadcn(themed) + 디자인 토큰(OKLCH)** — 맥북 니어블랙 + 정직한 실제 기어색(네온 X). react-icons.

## 데이터 계약 (척추)

톤 = `signal_chain`: **순서 있는 block 배열.** 각 block = `{ type, category?, model, enabled, footswitch?, knobs: [{name, value, unit?}] }`.
렌더러는 `tones.signal_chain` + `processors`의 노브 정의만 보고 그린다. 새 이펙터 지원 = processors 행 추가 + (선택) 스킨 CSS.

- FX 이름·노브 범위의 권위 = **해당 `processors` 행의 `effects_catalog`** (검증 게이트가 대조).
- TS 타입은 `web/lib/types.ts` 단일 정의, 렌더러·검증·파이프라인이 공유. 드리프트 가드 테스트 유지.
- `docs/parser-contract.md`는 R0~R1에서 새 스키마 기준으로 개정 예정(그 전까지 signal_chain 형태의 참고 권위).

## 디렉터리 지도

```
docs/plans/2026-07-04-structure-reset-design.md  # 현행 권위 설계
docs/backlog.md                        # 진입점 (상단 = R0~R5 리셋 로드맵)
docs/parser-contract.md                # signal_chain 계약 (R0~R1에서 개정)
models/ · rigs/ · patches/             # (과거) 정적 시절 자산 → R0 씨앗 마이그레이션 소스
web/                                   # Next.js 앱 (public + /admin + api)
  lib/llm/client.ts                    # LLM seam (Gemini ↔ Ollama)
  lib/pipeline/                        # resolver · grounding · research · generate · validate · onboarding
.claude/skills/tone-builder/           # 생성 프롬프트 권위 소스 (파이프라인이 로드) + 수동 폴백
```

## 스킬 라우팅

- 톤 생성 = 앱 파이프라인(셀프서브). `tone-builder` 스킬은 **프롬프트 권위 소스이자 수동 폴백**.
- 생성 출력은 검증 게이트(스키마·FX 실존·노브 범위)를 **반드시** 통과해야 적재.
- `web/` 작업 → `docs/web-harness.md` 루프(brainstorm→PRD→TRD→TDD→CE 리뷰→QA). 새 피처는 `/superpowers:brainstorm`부터.
- 사용자 문의(폼) → 개발자 이메일(Web3Forms→Gmail).

## 컨벤션

- 문서·주석·커밋 메시지: **한국어**. 코드 식별자: 영어.
- 커밋: `<type>: <설명>` (feat/fix/refactor/docs/chore). 사용자가 요청할 때만 커밋.
- 웹 코드는 전역 web 규칙(feature 폴더, CSS 토큰, compositor-friendly 애니메이션, 시맨틱 HTML, 불변성)을 따른다.
- 파일은 작게 (200–400줄, 800 max). 기능/도메인 단위로 묶는다.
- 노브 값 모호 표현 금지 — 항상 숫자 + 단위.

## 명령어

`web/` 기준: `npm run dev` · `build` · `lint` / `lint:check` · `typecheck`(tsgo) / `typecheck:full`(tsc) · `test`(vitest) / `test:cov` · `test:visual`(playwright).

## 현재 상태 (구조 리셋)

- ✅ 정적 라이브러리 사이클 #0~#6, 피벗 Phase 0~6 + P7 완료 — 기록 = `docs/backlog.md`.
- 🔄 **2026-07-04 구조 리셋 시작.** 설계 확정(`2244a81`) + 이 헌법 개정. 다음 = **R0**(새 스키마 + 씨앗 마이그레이션). 단계 전체 = 설계 §8, 진입점 = `docs/backlog.md` 상단.
