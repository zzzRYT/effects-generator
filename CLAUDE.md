# CLAUDE.md — 프로젝트 헌법

멀티 이펙터 **톤 생성기**. 곡명+아티스트+**내 기타+내 이펙터**를 입력하면 AI가 그 곡의 기타 톤을 조사해 **용도별(lead/backing/solo/real-amp/phone) 시그널 체인**으로 생성하고, 웹 카탈로그에 자동 축적·시각화한다.
기어(기타·이펙터)는 각각 독립 KB 레코드이며, 데이터·구조는 **기기 비종속**으로 설계한다.

> **2026-07-17 북극성 확정:** 이 프로젝트는 **공개 제품/서비스**다 — 07-06의 '개인용 우선'은 폐기. 상세 = 아래 "북극성" 섹션, 로드맵 = `docs/backlog.md` 상단 "북극성 로드맵(2026-07-17)".
> **2026-07-06 캐논·투영 부활:** 생성 구조 = **캐논(AI, 곡당 1회, 실기 기준 기기무관) + 투영(스크립트, AI 없이 결정적 변환)**. role 5종으로 확장. gear KB는 **크론 없이 어드민 수동 입력**(레퍼런스 업로드 포함), 온보딩 트리거도 자동 큐 대신 **문의 폼**(기타·이펙터 추가 요청). ~~개인용 우선~~(07-17 폐기 — 계정·공유캐시는 여전히 첫 출시 범위 밖). 07-04의 독립 엔티티 4·n8n 제거·LLM=Gemini seam은 그대로 유지.
> 전체 설계(결정·아키텍처·단계): **`docs/plans/2026-07-06-canon-projection-revival-design.md`** — 이 헌법보다 상세. 충돌 시 설계 문서가 권위(단, 그 문서 결정 #5 '개인용 우선'과 잔여 단계 순서는 07-17 북극성이 대체 — 문서 상단 노트).
> 이전 설계: `2026-07-04-structure-reset-design.md`(생성 구조만 번복, 나머지 유효) · `2026-06-28-canonical-projection-architecture-design.md`(캐논·투영 핵심만 조건부 부활) · `2026-06-25-tone-generator-pivot-design.md`(피벗, 폐기) — 각 문서 상단 노트 참조.

## 북극성 (2026-07-17 확정)

5주간 설계가 4번 뒤집힌 근본 원인(목적 불명확 + 품질 확신 부족)을 dev-hub wayfinder 맵 `공개-제품-북극성-map`(결정 티켓 EG-T1~T9)에서 해소하고 확정했다. **이 섹션이 "누구를 위해, 무엇이 되면 완성인가"의 권위.**

- **존재 이유 = 공개 제품/서비스.** '개인용 우선'(2026-07-06 결정 #5)은 폐기.
- **타깃 유저 = 입문자(저가 멀티이펙터 사용자).** 톤 지식이 가장 부족해 "곡 이름 → 완성 패치"의 가치가 최대인 층. 기존 서비스는 중가 이상 기기 위주라 이 자리가 비어 있음(EG-T2·T5).
- **핵심 가치 = "이 곡 + 내 기기 → 바로 걸 수 있는 패치".** 캐논·투영 아키텍처는 이 가치에 유효 판정 — 곡별 리서치 카탈로그·기기 비종속 범용 출력 방향은 기각.
- **품질 게이트(공개 조건) = 본인 GP-150 독푸딩.** 라운드 10곡, 최종 라운드에서 **평균 ≥3.5 그리고 4점+ 곡 ≥60% 그리고 1점 0개**(EG-T1). 미통과 시 출시 보류. 프로토콜·기록 = `docs/dogfooding/`.
- **첫 출시 범위**(EG-T5·T8·T9) = 기기 2종(GP-150 검증 기준기 + **Mooer GE-150** 온보딩) · **글로벌 + i18n 3언어(en/ko/ja)** · 곡 20~30 선적재(독푸딩 10곡 시드 + 입문 록·J-pop) · **정식 오픈 + 생성 가드 3종**(Gemini 일일 비용 상한·IP/세션 rate limit·경량 봇 방지) · **계정 없음(익명)** · `/gear/<slug>` 기기 페이지 + 톤 상세 base_gear 라벨 + 기본 SEO(SSG·메타·sitemap·hreflang).
- 계정·저장·공유 캐시·수익화는 출시 후 신호가 오면 재검토(첫 출시 범위 밖).

## 아키텍처 골격 (설계 §1, 2026-07-06)

- **독립 엔티티** (서로를 모름): `guitars`(기타 KB) · `processors`(이펙터 KB: FX 카탈로그·노브 정의) · `songs`(곡 정규화) · `gear`(실기 KB: 실제 앰프·페달, 캐논↔기기 어휘) · `canonical_tones`(캐논: 곡당 1회, 기기무관, **곡 파트 3-role**) · `tones`(투영 산출물, **role 5종**).
- **중간 레이어**: `ToneRequestResolver`(입력→정규화 튜플, 미등록 기어→문의 폼 유도) · `ToneGrounding`(캐논 생성 시 gear KB 대조 컨텍스트 조립) · `ToneProjector`(캐논→기기 결정적 변환, **AI 없음**).
- **캐논+투영 분리**: 캐논(AI, 곡당 1회, 실기 기준) → 투영(스크립트, 기기·기타별 결정적 매핑, $0). 기기 간 일관성·사람 검증 가능성 확보.
- **role 2축(2026-07-06 확정)**: **캐논 = 곡 파트 3-role**(`lead/backing/solo`, AI 생성). **투영 = 출력 대상 파생** — `real-amp`(실앰프 출력, 캐비·IR off 가정)·`phone`(헤드폰/모바일, 캐비·IR on)은 투영이 대표 파트 톤을 출력 프로파일로 변환해 `tones.role` 5종을 채운다. 캐논에는 real-amp/phone이 없다. 근거·대표 파트 선택 규칙 = 설계 §5.
- **기타는 바디 아키타입 6종**(`strat/tele/lespaul/sg/superstrat/hollow`)으로 정규화 — 사용자는 실제 기타명 입력, 내부 매핑. 조합 폭발 억제.
- **어드민 온보딩은 전부 수동.** 자동 크롤링·크론 없음. 미등록 기어는 문의 폼(기타·이펙터 추가 요청) → 어드민이 직접 `/admin`에서 gear/processors/guitars 입력 + 레퍼런스 업로드 → 즉시 approved.

## 절대 규칙 (Source of Truth)

- **Supabase가 SoT다.** 기어 KB(`guitars`/`processors`/`gear`) + 곡(`songs`) + 캐논(`canonical_tones`) + 투영 산출물(`tones`). 원본 참고자료(PDF/HTML, 어드민 업로드)는 Storage 보관(출처·감사용).
- **캐시-우선, 2단.** 캐논 캐시 키 `(song_id, role)`(기기무관) — 히트면 AI 호출 자체가 없음. 투영 캐시 키 `(song_id, body_archetype, processor_id, role, version)`. 신곡이 아니면 ③(캐논 생성) 생략, 투영부터. UX는 **연출된 진행(20~40초)** 후 반환(신뢰성 — 설계 §0).
- **생성 품질 게이트.** 캐논 출력은 스키마 + **base_gear 모양(name/category)** 검증을 통과해야 적재 — gear KB 실존 대조는 **투영으로 이관**(2026-07-06 결정): gear KB가 실제 쓰이는 곳이 투영 룩업이라, 캐논 시점 KB 강제는 부트스트랩 닭-달걀만 만든다. 캐논은 "곡이 쓴 실기"를 자유 서술하고, "이 기기로 낼 수 있나"는 투영이 판정. 투영 결과는 스키마 + **FX가 해당 프로세서 카탈로그에 실존** + 노브 범위 검증을 통과해야 적재. **투영 매핑 = 3단 룩업**(정확 slug → 경계 포함 → 토큰 부분수열, 전부 결정적·문서 순서) — **기능 모듈(NR/EQ/DLY/RVB/VOL)은 미매핑 시 `effects_catalog.defaults` 폴백**(시드에 사람이 지정, 노브는 캐논 값 유지), **톤 정체성 모듈(AMP/DST/CAB/PRE/WAH/MOD)은 폴백 없이 해당 role 투영 실패**(자동 수리·대체 없음 — 실패 시 gear/processors 데이터를 사람이 교정, 미매핑 목록 = 어드민 온보딩 TODO). 카탈로그 오염 0.
- **approved만 사용.** draft 기어는 생성·매칭 대상이 아니다. 어드민이 직접 입력하는 즉시 approved(별도 자동 draft 단계 없음).
- **문의·피드백·기어 추가 요청은 이메일.** 폼(요청 유형: 곡 제보/기타·이펙터 추가 요청/일반 문의) → Web3Forms → Gmail. 이 경로만 백엔드 0.

## 스택

- **Next.js (App Router, TypeScript)** — `web/`, 동적(런타임 Supabase 조회 + 생성 폼 + `/admin`), Vercel 배포.
- **Supabase** — DB(Postgres) + Realtime(잡 진행 푸시) + Auth(admin role) + Storage(원본 문서·레퍼런스) + RLS(공개읽기=approved/done만, 쓰기=서버). 프로젝트 ref: `mooypzyzymussbeszcao`.
- **파이프라인 = 앱 내부 TS** (`web/lib/pipeline/`) — 리서치→캐논 생성→투영→검증, Route Handler/백그라운드 함수로 실행. **n8n 없음**(근거 = `2026-07-04-structure-reset-design.md` §6).
- **LLM = Gemini**(검색 그라운딩 + 실험용 YouTube 미디어 입력, 투영은 AI 없음). 호출은 `web/lib/llm/client.ts` 공용 텍스트·미디어 인터페이스 한 곳 — Gemini는 네이티브 `generateContent`, Ollama는 텍스트 전용 OpenAI 호환 seam.
- **Tailwind + shadcn(themed) + 디자인 토큰(OKLCH)** — 맥북 니어블랙 + 정직한 실제 기어색(네온 X). react-icons.

## 데이터 계약 (척추)

두 계층의 체인이 있다:

- **`canonical_tones.chain`** — 실기 어휘(`base_gear` = `{name, category, attributes?, confidence?}`). 기기 무관. AI가 채움. gear KB 실존 대조는 여기서 강제하지 않고 투영 룩업에서(위 게이트).
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
  lib/audio-experiment/               # YouTube 관측 A/B 계약 · 블라인딩 · 원자 실행기
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
- ✅ **R1 완료** — `web/lib/pipeline/` 골격: LLM seam(`lib/llm/client.ts`) + Resolver + Grounding + 검증 게이트(캐논·투영) + 타입 계약. 목 테스트 22건.
- ✅ **R2 완료(라이브 검증 포함)** — 캐논 생성 end-to-end: `prompts.ts` + `research.ts`(song_research 캐시) + `generate.ts`(3-role 캐논→게이트→`canonical_tones`) + `json.ts` + `rest.sbInsert`. **캐논 게이트를 스키마+base_gear 모양으로 축소, gear KB 실존은 투영으로 이관**(부트스트랩 닭-달걀 해소). Gemini 실호출 스모크 통과(2026-07-08, `scripts/smoke-pipeline.ts`).
- ✅ **R3 완료(라이브 검증 포함)** — `projector.ts`: base_gear 역인덱스(`effects_catalog.entries` 187건, md "(기반:)" 추출) + **3단 룩업**(정확→경계 포함→토큰 부분수열) + **기능 모듈 디폴트 폴백**(NR/EQ/DLY/RVB/VOL → `effects_catalog.defaults`) + kind 교차검증 + 대표 파트(lead→backing→solo) real-amp(CAB off)/phone(CAB on) 파생 + 게이트 + `tones` 적재. Resolver 슬러그 변형 조회(GP-150/GP150 호환). 라운드트립 골든(PATCHES 91블록: 84 정밀매핑·5 폴백·2 예외·mismatch 0). **라이브 스모크 2곡 통과**: Oasis DLBIA = 5-role 전부 적재(파생 포함), Radiohead Creep = 캐논 3행 + 정당한 미매핑(ShredMaster 등 → 어드민 온보딩 TODO). 테스트 391 그린.
- ✅ **R4 완료(라이브 QA 포함)** — 웹 재배선(하네스 풀 사이클, 산출물 `docs/*/r4-web-rewire.md`): 생성 폼 4입력 → `tone_jobs`+`after()` 파이프라인(maxDuration=60) → 폴링(좀비 잡 가드) → **role 5탭**(`RoleTabs`, rendered/null/missing, 기존 렌더러 무수정) → tones 기반 카탈로그. n8n·구 테이블 참조 전수 제거. 라이브 QA: 신곡 36초 done·unresolved·실 Gemini 503 실패 경로 검증. 테스트 450·build 그린. 이월 = D6 비주얼 스냅샷(리뷰 문서). ~~다음 = R5(어드민 수동 입력 UI)~~ — 2026-07-17 재정렬로 R5는 출시 후 강등(아래 북극성 확정 항목).
- ✅ **R4.5 멀티모달 오디오 톤 A/B 랩 코드·자동 게이트 완료(실환경 표본 대기, 2026-07-12)** — `/lab/audio-tone`에서 YouTube 역할별 구간을 선택하고 텍스트 baseline과 오디오 관측 enriched를 동일 조건으로 비영속 생성·GP-150 투영해 익명 설정표 평가. `ADMIN_SECRET` 서명 세션, Gemini 네이티브 미디어 계약 + 실제 검색 그라운딩(`groundedSearch`, 출처는 검색 메타데이터만 권위), `tone_experiments` 원자 실행·단회 평가 구현. `20260711090000` 원격 적용 후 RLS=true·공개 정책 0·update trigger·INSERT/UPDATE/DELETE 롤백 재검증 완료(2026-07-12). Task 11 수용 게이트 전수 실행: e2e(`audio-tone-lab.spec.ts`) 4브레이크포인트×3케이스 12건 그린 — 실행 중 블라인드 응답 계약 변경(`PublicProjection`)에 e2e 목이 안 맞아 화면이 에러 바운더리로 크래시하는 실결함 1건 발견·수정. `npm run test`(556)·`test:cov`(문장 87.59%/브랜치 80.56%/함수 87.85%/라인 89.86%, 전부 80%+)·`lint:check`·`typecheck`·`typecheck:full`·`build`·`test:visual` 전부 그린. 운영 `canonical_tones`·`tones` 쓰기 없음. 설정표 평가만으로 실제 음향 유사도를 주장하지 않는다. **2026-07-17 유보 판정(EG-T4):** 남은 작업(실 Gemini smoke·10곡/30구간 표본)은 중단 — 독푸딩 라운드 1은 baseline(현행 텍스트 생성)만. 재진입 = 라운드 1 저점 곡의 문제 모듈이 톤 정체성(AMP/DST/CAB)에 몰릴 때, 라운드 2 저점 곡 한정 **귀 A/B**로 채택 판정(기존 설정표 게이트 enriched 선호 ≥70% 등은 참고 지표로 강등). 코드·랩(`/lab/audio-tone`)은 보존.
- 🧭 **2026-07-17 북극성 확정·로드맵 재정렬** — dev-hub wayfinder 맵(`공개-제품-북극성-map`, EG-T1~T9)으로 공개 제품 북극성 확정, 이 헌법 개정(위 "북극성" 섹션). R5(어드민 UI)는 출시 후 강등(EG-T6 — 온보딩·교정은 스크립트 경로가 공식 도구), R4.5는 유보(EG-T4). **다음 = 독푸딩 라운드 1**(10곡, GP-150, `docs/dogfooding/round-1.md`) → 품질 환류 → 출시 준비(GE-150 온보딩·i18n 3언어·`/gear` 페이지+SEO·생성 가드 3종·곡 선적재). 단계 상세 = `docs/backlog.md` 상단 "북극성 로드맵(2026-07-17)".
