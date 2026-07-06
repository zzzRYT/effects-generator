# CLAUDE.md — 프로젝트 헌법

멀티 이펙터 **톤 생성기**. 곡명+아티스트+**내 기타+내 이펙터**를 입력하면 AI가 그 곡의 기타 톤을 조사해 **용도별(lead/backing/solo/real-amp/phone) 시그널 체인**으로 생성하고, 웹 카탈로그에 자동 축적·시각화한다.
기어(기타·이펙터)는 각각 독립 KB 레코드이며, 데이터·구조는 **기기 비종속**으로 설계한다.

> **2026-07-06 캐논·투영 부활:** 생성 구조 = **캐논(AI, 곡당 1회, 실기 기준 기기무관) + 투영(스크립트, AI 없이 결정적 변환)**. role 5종으로 확장. gear KB는 **크론 없이 어드민 수동 입력**(레퍼런스 업로드 포함), 온보딩 트리거도 자동 큐 대신 **문의 폼**(기타·이펙터 추가 요청). 개인용 우선(계정·공유캐시는 범위 밖). 07-04의 독립 엔티티 4·n8n 제거·LLM=Gemini seam은 그대로 유지.
> 전체 설계(결정·아키텍처·단계): **`docs/plans/2026-07-06-canon-projection-revival-design.md`** — 이 헌법보다 상세. 충돌 시 설계 문서가 권위.
> 이전 설계: `2026-07-04-structure-reset-design.md`(생성 구조만 번복, 나머지 유효) · `2026-06-28-canonical-projection-architecture-design.md`(캐논·투영 핵심만 조건부 부활) · `2026-06-25-tone-generator-pivot-design.md`(피벗, 폐기) — 각 문서 상단 노트 참조.

## 아키텍처 골격 (설계 §1, 2026-07-06)

- **독립 엔티티** (서로를 모름): `guitars`(기타 KB) · `processors`(이펙터 KB: FX 카탈로그·노브 정의) · `songs`(곡 정규화) · `gear`(실기 KB: 실제 앰프·페달, 캐논↔기기 어휘) · `canonical_tones`(캐논: 곡당 1회, 기기무관, role 5종) · `tones`(투영 산출물).
- **중간 레이어**: `ToneRequestResolver`(입력→정규화 튜플, 미등록 기어→문의 폼 유도) · `ToneGrounding`(캐논 생성 시 gear KB 대조 컨텍스트 조립) · `ToneProjector`(캐논→기기 결정적 변환, **AI 없음**).
- **캐논+투영 분리**: 캐논(AI, 곡당 1회, 실기 기준) → 투영(스크립트, 기기·기타별 결정적 매핑, $0). 기기 간 일관성·사람 검증 가능성 확보.
- **role 5종**: `lead / backing / solo / real-amp / phone`. `real-amp`/`phone`의 정확한 축(곡 파트 vs 출력 대상)은 미확정 — 설계 §5.
- **기타는 바디 아키타입 6종**(`strat/tele/lespaul/sg/superstrat/hollow`)으로 정규화 — 사용자는 실제 기타명 입력, 내부 매핑. 조합 폭발 억제.
- **어드민 온보딩은 전부 수동.** 자동 크롤링·크론 없음. 미등록 기어는 문의 폼(기타·이펙터 추가 요청) → 어드민이 직접 `/admin`에서 gear/processors/guitars 입력 + 레퍼런스 업로드 → 즉시 approved.

## 절대 규칙 (Source of Truth)

- **Supabase가 SoT다.** 기어 KB(`guitars`/`processors`/`gear`) + 곡(`songs`) + 캐논(`canonical_tones`) + 투영 산출물(`tones`). 원본 참고자료(PDF/HTML, 어드민 업로드)는 Storage 보관(출처·감사용).
- **캐시-우선, 2단.** 캐논 캐시 키 `(song_id, role)`(기기무관) — 히트면 AI 호출 자체가 없음. 투영 캐시 키 `(song_id, body_archetype, processor_id, role, version)`. 신곡이 아니면 ③(캐논 생성) 생략, 투영부터. UX는 **연출된 진행(20~40초)** 후 반환(신뢰성 — 설계 §0).
- **생성 품질 게이트.** 캐논 출력은 스키마 + gear KB 대조를 통과해야 적재. 투영 결과는 스키마 + **FX가 해당 프로세서 카탈로그에 실존** + 노브 범위 검증을 통과해야 적재. 투영은 스크립트라 자동 수리 개념이 없음 — 실패 시 gear/processors 데이터를 사람이 교정. 카탈로그 오염 0.
- **approved만 사용.** draft 기어는 생성·매칭 대상이 아니다. 어드민이 직접 입력하는 즉시 approved(별도 자동 draft 단계 없음).
- **문의·피드백·기어 추가 요청은 이메일.** 폼(요청 유형: 곡 제보/기타·이펙터 추가 요청/일반 문의) → Web3Forms → Gmail. 이 경로만 백엔드 0.

## 스택

- **Next.js (App Router, TypeScript)** — `web/`, 동적(런타임 Supabase 조회 + 생성 폼 + `/admin`), Vercel 배포.
- **Supabase** — DB(Postgres) + Realtime(잡 진행 푸시) + Auth(admin role) + Storage(원본 문서·레퍼런스) + RLS(공개읽기=approved/done만, 쓰기=서버). 프로젝트 ref: `mooypzyzymussbeszcao`.
- **파이프라인 = 앱 내부 TS** (`web/lib/pipeline/`) — 리서치→캐논 생성→투영→검증, Route Handler/백그라운드 함수로 실행. **n8n 없음**(근거 = `2026-07-04-structure-reset-design.md` §6).
- **LLM = Gemini**(검색 그라운딩 내장, 캐논 생성에만 사용 — 투영은 AI 없음). 호출은 `web/lib/llm/client.ts` OpenAI 호환 인터페이스 한 곳 — 추후 Ollama 교체 seam.
- **Tailwind + shadcn(themed) + 디자인 토큰(OKLCH)** — 맥북 니어블랙 + 정직한 실제 기어색(네온 X). react-icons.

## 데이터 계약 (척추)

두 계층의 체인이 있다:

- **`canonical_tones.chain`** — 실기 어휘(`base_gear`, gear KB 레코드 참조). 기기 무관. AI가 채움.
- **`tones.signal_chain`** — 투영 산출물. **순서 있는 block 배열.** 각 block = `{ type, category?, model, base_gear?, enabled, footswitch?, knobs: [{name, value, unit?}] }`. `ToneProjector`가 캐논 + `processors.effects_catalog`를 결정적으로 매핑해 채움.

렌더러는 `tones.signal_chain` + `processors`의 노브 정의만 보고 그린다. 새 이펙터 지원 = processors 행 추가 + (선택) 스킨 CSS.

- FX 이름·노브 범위의 권위 = **해당 `processors` 행의 `effects_catalog`** (검증 게이트가 대조).
- 캐논↔기기 매핑의 권위 = `gear.name_norm` ↔ `processors.effects_catalog`의 `base_gear` 대조(투영 룩업).
- TS 타입은 `web/lib/types.ts` 단일 정의, 렌더러·검증·파이프라인이 공유. 드리프트 가드 테스트 유지.
- `docs/parser-contract.md`는 R0~R1에서 새 스키마 기준으로 개정 예정(그 전까지 signal_chain 형태의 참고 권위).

## 디렉터리 지도

```
docs/plans/2026-07-06-canon-projection-revival-design.md  # 현행 권위 설계
docs/plans/2026-07-04-structure-reset-design.md            # 생성구조만 번복, 나머지 유효(엔티티·n8n제거)
docs/backlog.md                        # 진입점 (상단 = R0~R7 부활 로드맵)
docs/parser-contract.md                # signal_chain 계약 (R0~R1에서 개정)
models/ · rigs/ · patches/             # (과거) 정적 시절 자산 → R0 씨앗 마이그레이션 소스
web/                                   # Next.js 앱 (public + /admin + api)
  lib/llm/client.ts                    # LLM seam (Gemini ↔ Ollama)
  lib/pipeline/                        # resolver · grounding · research · generate(캐논) · project · validate
.claude/skills/tone-builder/           # 생성 프롬프트 권위 소스 (파이프라인이 로드) + 수동 폴백
```

## 스킬 라우팅

- 톤 생성 = 앱 파이프라인(셀프서브, 캐논+투영). `tone-builder` 스킬은 **캐논 생성 프롬프트 권위 소스이자 수동 폴백**.
- 캐논은 검증 게이트(스키마·gear KB 대조), 투영은 검증 게이트(스키마·FX 실존·노브 범위)를 **반드시** 통과해야 적재.
- gear/processors/guitars 온보딩 = **어드민 수동**(`/admin`). 자동 리서치·크론 없음.
- `web/` 작업 → `docs/web-harness.md` 루프(brainstorm→PRD→TRD→TDD→CE 리뷰→QA). 새 피처는 `/superpowers:brainstorm`부터.
- 사용자 문의·기어 추가 요청(폼) → 개발자 이메일(Web3Forms→Gmail). 폼 확장 계획 = 백로그 `request-form-v2`.

## 컨벤션

- 문서·주석·커밋 메시지: **한국어**. 코드 식별자: 영어.
- 커밋: `<type>: <설명>` (feat/fix/refactor/docs/chore). 사용자가 요청할 때만 커밋.
- 웹 코드는 전역 web 규칙(feature 폴더, CSS 토큰, compositor-friendly 애니메이션, 시맨틱 HTML, 불변성)을 따른다.
- 파일은 작게 (200–400줄, 800 max). 기능/도메인 단위로 묶는다.
- 노브 값 모호 표현 금지 — 항상 숫자 + 단위.

## 명령어

`web/` 기준: `npm run dev` · `build` · `lint` / `lint:check` · `typecheck`(tsgo) / `typecheck:full`(tsc) · `test`(vitest) / `test:cov` · `test:visual`(playwright).

## 현재 상태 (캐논·투영 부활)

- ✅ 정적 라이브러리 사이클 #0~#6, 피벗 Phase 0~6 + P7 완료 — 기록 = `docs/backlog.md`.
- ✅ 2026-07-04 구조 리셋 설계(독립 엔티티·n8n 제거) — 생성 구조만 아래로 대체됨.
- 🔁 **2026-07-06 캐논·투영 부활 확정** — 생성 구조를 캐논+투영으로 되돌림, role 5종, 어드민 수동 온보딩, 문의 폼 확장 결정. 이 헌법 개정 완료.
- ✅ **R0 완료·적용됨** — 새 스키마 8테이블(6엔티티 + `song_research`·`tone_jobs`) 리모트 적용 완료(마이그레이션 `20260706114215_r0_canon_projection_schema` + `20260706114303_harden_function_search_path`, 피벗 스키마 drop 포함). 씨앗: processors 1(GP-150)·guitars 2·songs 7(`web/scripts/seed-reset.ts`). canonical_tones/tones는 미적재(patches→캐논 역추출은 R2~R3 이후 유보). 피벗 데이터 백업 = `supabase/backups/20260706-pivot-schema-export.json`.
- ✅ **R1 완료** — `web/lib/pipeline/` 골격: LLM seam(`lib/llm/client.ts`) + Resolver + Grounding + 검증 게이트(캐논·투영) + 타입 계약. 목 테스트 22건(전체 315 그린). 다음 = **R2**(캐논 생성 end-to-end, Gemini 실연결, real-amp/phone 의미 확정). 단계 전체 = 설계 §6, 진입점 = `docs/backlog.md` 상단.
