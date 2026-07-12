# 백로그 — 트랙 2 사이클 대상

각 항목 = `docs/web-harness.md`의 루프 한 사이클. 위에서부터 의존 순서.
사이클 시작 = `/superpowers:brainstorm <항목>`.

## 🔁 캐논·투영 부활 (2026-07-06) — 현행 로드맵

> **읽기 순서: 이 블록이 유일한 현행.** 아래 구조 리셋(2026-07-04)·캐논·투영(2026-06-28)·피벗(2026-06-25) 블록은 **폐기 또는 부분 부활** — 기록용 보존, 각 블록 상단 노트 참조.
> 권위 설계: **`docs/plans/2026-07-06-canon-projection-revival-design.md`**.
>
> 요지: 07-04의 독립 엔티티 4 + n8n 제거 + LLM seam은 유지하되, **생성 구조를 캐논+투영으로 되돌림**
> (캐논=AI 곡당 1회 실기 기준 기기무관, 투영=스크립트 결정적 변환, AI 없음). `gear`(실기 KB)·
> `canonical_tones` 엔티티 재도입. role **5종**(`lead/backing/solo/real-amp/phone`)으로 확장.
> gear KB는 **크론 제거, 어드민 수동 입력**(레퍼런스 업로드 포함) — 온보딩 트리거도 자동 큐 대신
> **요청 폼**(기타·이펙터 추가 요청)으로 대체. 곡별 AI 리서치는 그대로 유지. **개인용 우선**
> (계정/공유캐시/정규화 깔때기는 이번 범위 밖).
>
> **단계:**
> - **R0** — ✅ **완료·적용됨.** 새 Supabase 스키마 8테이블(`guitars`·`processors`·`songs`·`gear`·
>   `canonical_tones`·`tones` + `song_research`·`tone_jobs`) 마이그레이션 2건 리모트 적용:
>   `20260706114215_r0_canon_projection_schema`(피벗 스키마 drop 포함) + `20260706114303_harden_function_search_path`.
>   씨앗(`web/scripts/seed-reset.ts`): processors 1(GP-150, 93 FX)·guitars 2·songs 7. canonical_tones/tones는
>   미적재(patches→캐논 역추출은 R2~R3 라운드트립 게이트 이후로 유보 — 스크립트 헤더 주석). 리셋 전 피벗
>   데이터 백업: `supabase/backups/20260706-pivot-schema-export.json`(songs 15·patches 16·gen_jobs 9). 보안
>   어드바이저 잔여 = INFO 3건(gear/canonical_tones/song_research RLS 정책 없음 — 서버·어드민 전용 의도).
> - **R1** — ✅ **완료.** `web/lib/pipeline/` 골격 — LLM seam(`lib/llm/client.ts`, OpenAI 호환·주입가능)
>   + Resolver(`resolver.ts`, 순수 코어+DB래퍼, 미등록기어→문의유도) + Grounding(`grounding.ts`,
>   gear KB→프롬프트 컨텍스트+KnownGear) + 검증 게이트(`gate.ts`, 캐논=스키마+gear대조 / 투영=스키마+FX실존+노브범위).
>   타입 계약 `types.ts`. 목 테스트 22건(전체 315 그린). 기존 자산 재사용: normalize·slugify·parser/catalog(isKnownModel)·parser/validate.
> - **R2** — ✅ **코드 완료(라이브 스모크 대기).** 캐논 생성 end-to-end — `prompts.ts`(캐논/리서치 프롬프트,
>   tone-builder 계약의 코드 구현) + `research.ts`(song_research 캐시 + LLM 리서치) + `generate.ts`(곡 확보→
>   리서치→그라운딩→3-role 캐논 LLM→게이트→`canonical_tones` 적재) + `json.ts`(LLM JSON 파서) + `rest.sbInsert`.
>   **캐논 게이트를 스키마+base_gear 모양으로 축소, gear KB 실존은 R3 투영으로 이관**(부트스트랩 닭-달걀 해소,
>   설계 §5). 목 테스트 전체 328 그린. **미완 = Gemini 실연결 스모크**(`web/.env.local`에 `LLM_PROVIDER`/
>   `GEMINI_API_KEY` 넣고 신곡 1건 생성 확인 — env엔 아직 Supabase 키만).
> - **R3** — ✅ **코드 완료(시드 재실행 대기).** `web/lib/pipeline/projector.ts` — base_gear 역인덱스
>   (`processors.effects_catalog.entries` — `extractCatalogEntries`가 md "(기반: 실기명)" 추출, 시드 확장) +
>   **2단 룩업**(정확 slug → 경계 포함 매칭: 실측에서 정확 일치만으로는 91블록 중 39 미매핑이라 도입, 설계 §2 ④) +
>   kind 교차검증(AMP↔amp, CAB↔cab, 그 외↔effect) + 1:N 문서순서 첫항목 + 대표 파트(lead→backing→solo 폴백)
>   real-amp(CAB off)/phone(CAB on) 파생 + 투영 게이트 + `tones` 적재(onConflict 5키). **라운드트립 골든 게이트**
>   (`projector-golden.test.ts`): PATCHES 전수 91블록 역투영 — 84 매핑·mismatch 0·미매핑 6종은 명시 예외
>   (md 에 "(기반:)" 없는 오리지널 모델 등). 리모트 시드 재실행 완료(2026-07-08, `effects_catalog.entries`
>   187건 + `defaults`).
>   **라이브 검증(2026-07-08, Gemini 실호출 — `web/scripts/smoke-pipeline.ts`):** ① Radiohead Creep — 캐논
>   3-role 생성·적재(리그 리서치 정확: ShredMaster+Twin), 투영은 정당한 미매핑(GP-150 에 없는 실기 → 어드민
>   온보딩 TODO 리포트). ② Oasis DLBIA — **5-role 전부 적재**(lead/backing/solo 투영 + real_amp/phone 파생,
>   한 체인에서 3단 토큰 매칭·기능 폴백 모두 검증). 스모크가 찾은 실결함 3건 수정: **3단 룩업**(토큰 부분수열,
>   'Fender Twin Reverb'↔"'65 Twin Reverb" 흡수) + **기능 모듈 디폴트 폴백**(사용자 승인 — DLY/RVB 등 제네릭
>   모델엔 "(기반:)"이 없어 구조적 전곡 미매핑이었음, `effects_catalog.defaults` 로 해소) + **Resolver 슬러그
>   변형 조회**("GP-150"/"GP150" 호환) + 캐논 null_reason 한국어화. 테스트 391 그린, 골든 3분류(84 정밀·5 폴백·2 예외).
> - **R4** — ✅ **완료(라이브 QA 포함, 2026-07-08).** 웹 재배선 — 하네스 풀 사이클(brainstorm→PRD→TRD→TDD→
>   CE 리뷰→라이브 QA, `docs/{brainstorm,prd,trd,reviews}/r4-web-rewire.md`). 생성 폼 4입력(기어 셀렉트+직접
>   입력) → `POST /api/generate`(검증·rate limit·Resolver·`tone_jobs` INSERT·`after()` 파이프라인,
>   maxDuration=60) → 폴링(`/api/jobs/[id]`, 좀비 잡 가드 lazy 3분) → **role 5탭 결과 뷰**(`RoleTabs`,
>   rendered/null/missing 3상태, 파생 라벨, 기존 SignalChain 렌더러 무수정) → 카탈로그(tones 기반, 희소 CTA).
>   n8n·generation_jobs·구 patches 참조 전수 제거. 라이브 QA: 신곡 36초 done·미등록 기어 unresolved·실제
>   Gemini 503 실패 경로까지 검증. 테스트 391→450, build 그린. 이월: D6 비주얼 스냅샷·루브릭 전수(리뷰 문서 참조).
>   **← 다음 = R5**(어드민 수동 입력 UI + 레퍼런스 업로드).
> - **R4.5 오디오 톤 A/B 랩** — ✅ **코드·자동 게이트 완료(실환경 표본 대기, 2026-07-12).** 관리자 전용
>   `/lab/audio-tone`에서 YouTube `lead/backing/solo` 구간을 직접 선택하고, 동일 모델·문헌·프롬프트·temperature로
>   텍스트 baseline과 오디오 관측 enriched 캐논을 비영속 생성한 뒤 같은 GP-150 카탈로그로 5-role 투영한다.
>   결과는 RLS 비공개 `tone_experiments`에만 저장하고 운영 `canonical_tones`·`tones`에는 쓰지 않는다. 익명 A/B
>   설정표를 논리적 정합성·체인 타당성·노브 실사용성으로 평가한다. 관리자 HMAC 세션, Gemini 네이티브 YouTube
>   입력 + 실제 검색 그라운딩(`groundedSearch`), 원자 실행, 단회 평가 구현. `20260711090000` 원격 적용 후
>   RLS=true·공개 정책 0·update trigger·INSERT/UPDATE/DELETE 롤백을 재검증했다(2026-07-12). Task 11 수용
>   게이트 전수 실행 완료: 모바일 E2E 4브레이크포인트×3케이스(로그인·3-레인 편집·익명 평가·실패 재시도·a11y)
>   12건 그린 — 실행 중 블라인드 응답 계약(`PublicProjection`) 변경에 e2e 목이 안 맞아 화면이 크래시하는
>   실결함을 발견·수정했다. 유닛 556건·커버리지 80%+ 전항목·lint·typecheck·typecheck:full·build 전부 그린.
>   **미완:** 실 Gemini smoke(진행 예정)와 표본 수집. 메인 채택은 10곡/30구간,
>   enriched 선호 ≥70%, 평균 +0.5/5, 투영 실패율 증가 없음일 때만.
>   설정표 평가만으로 실제 음향 유사도를 입증하지 않는다. 설계·계획 = `docs/superpowers/{specs,plans}/2026-07-11-*`.
> - **R5** — 어드민 — gear/processors/guitars 수동 입력 UI + 레퍼런스 업로드(Storage).
> - **R6** — 요청 폼 확장(별도 `/superpowers:brainstorm` 사이클, 아래 표 `request-form-v2` 참조).
> - **R7** — 둘째 기기 검증 — 실제 멀티이펙터 1종 수동 온보딩→투영→렌더(비전 증명).

## ~~🔄 구조 리셋 (2026-07-04)~~ (생성 구조만 폐기 — 2026-07-06 캐논·투영 부활로 대체, 나머지 결정은 유효)

> 권위 설계: **`docs/plans/2026-07-04-structure-reset-design.md`**(상단에 07-06 번복 노트 있음).
>
> 요지: 독립 엔티티 4(`guitars`·`processors`·`songs`·`tones`) + 중간 레이어 2(Resolver·Grounding). 고정 **3-role(lead/backing/solo)** 생성, 기타는 **바디 아키타입 6종** 정규화, 1단 직접 생성(캐논/투영 폐기). 어드민 기어 온보딩(자동 리서치→draft→`/admin` 승인). **n8n 제거** — 파이프라인 = `web/lib/pipeline/` TS 모듈. LLM = Gemini(OpenAI 호환 seam으로 Ollama 교체 가능). 캐시 히트 = 연출된 진행(20~40초).
>
> ⚠️ 이 블록의 "생성 구조"(1단 직접 생성, 3-role)만 07-06에서 번복됨. 독립 엔티티·n8n 제거·LLM seam·검증 게이트 개념은 07-06이 그대로 이어받음.

## ~~🧭 확장 설계 (2026-06-28) — 캐논·투영 + 멀티이펙터 + 계정~~ (2026-07-04에 폐기 → 2026-07-06 캐논/투영 핵심만 조건부 부활)

> ~~**읽기 순서: 이 블록부터.**~~ 피봇(아래 2026-06-25)의 다음 진화. brainstorm 수렴, 구현 대기.
> 설계 문서: **`docs/plans/2026-06-28-canonical-projection-architecture-design.md`** (피봇 설계를 확장).
>
> ⚠️ **2026-07-06 노트:** 이 블록의 캐논·투영 핵심(`gear` KB·캐논/투영 분리)은 되살아났다 —
> 단 gear 크론 적재(P9.5)·자동 온보딩 큐는 제거(어드민 수동으로 대체), 계정/저장(P10)·정규화
> 깔때기(P11)는 미결정·유보. 현행 로드맵은 위 "캐논·투영 부활(2026-07-06)" 블록.
>
> 요지: 생성을 **캐논(AI, 곡당 1회, 실기 기준 기기무관)** + **투영(스크립트, AI 없이 기기·기타별 변환)** 으로 분리.
> `base_gear`가 캐논↔기기 다리(2026-06-27 main의 모델명/카탈로그 교정이 투영 룩업). 캐논은 **리서치로 base 기어를 확정**하고, 그 근거는 **real-gear KB**(씨앗=카탈로그 역인덱싱 + 크론 적재 + 곡별, §15)에 누적. + **계정**(비로그인 생성, 로그인 저장) + **공유 캐시 재사용**(비용 신곡당 1회) + **곡 정규화 깔때기**(교차언어 포함).
>
> **새 단계(피봇 Phase 6 이후):**
> - ✅ **P7 main 정합** (커밋 `20dbda5`) — 모델명 매뉴얼 FX Title 교정(TS-808→Green OD 등) + 카탈로그 게이트(규칙 7, base-gear 이름 빌드 차단)를 피봇으로 포팅. 카탈로그(effects/cabs)·씨앗 패치 8파일·그라운딩(system-prompt/parser-contract)·tone-builder SKILL 정렬. `catalog.ts`를 기타 registry 와 병행 스레딩. gen:patches 8곡/24변주(게이트 활성)·vitest 293·tsgo/tsc/eslint green.
> - **P8 device-spec + 레지스트리** — `profile.md` device-spec 펜스 + `gen:processors`, 렌더러 데이터구동(멀티 토대).
> - **P9 캐논/투영 분리 + gear KB** — 캐논=리서치로 base 기어 확정(`base_gear`=구조화 레코드) + gear KB 스키마/씨앗(GP-150 카탈로그 역인덱싱+Flash 보강) + `catalog.ts` base_gear 추출 확장 + 투영 스크립트(속성 대조) + 라운드트립 게이트(기존 8곡). 노브 스케일은 P12 경계. 설계 §4·§9·§15.
> - **P9.5 gear 적재 크론 (신규)** — 블로그·게시글 문서 소스 크론 크롤 → Gemini 2.5 Flash 정제 → `gear` 누적(출처·confidence·머지). `data-scraper-agent` 패턴. P9 후. 설계 §15.
> - **P10 계정 + 저장** — Supabase Auth + `saved_patches` + RLS.
> - **P11 정규화 깔때기** — 퍼지 + LLM 해소 + `aliases` 학습.
> - **P12 둘째 기기 end-to-end** — `processor-builder` 스킬로 실제 멀티이펙터 1종 학습 → 투영 → 스킨 → 선택 UX(비전 증명). 노브 스케일/노브명 리매핑 실물화.
> - **(미래 — 과금 트랙)** — 오디오 분석 + 고성능 LLM 프리미엄 피더. 지금 짓지 않음, P10 이후 라우팅. seam만 확보(설계 §16).
>
> ⚠️ **브랜치:** 이 작업은 `feat/tone-generator-pivot` 라인. main(옛 정적 라인)과 `c3f48be`에서 분기됨. ✅ 2026-06-27 main의 모델명/게이트 작업은 P7(`20dbda5`)로 포팅 완료 — 이제 피봇이 정확한 그라운딩을 가짐.

## ~~🔀 방향 전환 (2026-06-25) — 톤 생성기 피벗~~ (폐기 — 2026-07-04 구조 리셋으로 대체)

> ~~**읽기 순서: 이 블록부터.**~~ 트랙2의 정적 라이브러리(#0~#6)는 완료됐고, 이제 프로젝트는 **셀프서브 AI 톤 생성기**로 피벗한다.
> 설계 확정 문서: **`docs/plans/2026-06-25-tone-generator-pivot-design.md`** (모든 결정·아키텍처·단계 계획).
>
> 요지: 사람이 `tone-builder` 스킬 호출 → **사용자가 아티스트+곡명 입력 → n8n이 AI로 생성 → Supabase 자동 축적 → 동적 공개 카탈로그.**
> CLAUDE.md 핵심 규칙 3개(`DB 없음`·`웹 읽기 전용`·`md가 SoT`)를 의식적으로 뒤집음(피벗 §11). GP-150 렌더러·`types.ts`·`signal_chain` 계약은 재사용.
> 다음 액션: **Phase 0**(CLAUDE.md 개정 + Supabase 스키마 + env). 아래 #0~#6 정적 라이브러리 기록은 참고용으로 보존.

## 현재 상태 (resume 포인터) — 2026-06-23

> 새 세션은 이 줄부터 읽으면 어디서 이어갈지 안다. CLAUDE.md → 이 파일이 트랙2 진입점.

- ✅ **선행 셋업** 완료: `web/`(Next 16 · App Router · CSS Modules · 이중 게이트 tsgo/tsc/eslint/vitest/playwright) + `docs/data-contract-ui.md`.
- ✅ **사이클 #0 `patch-parser`** 완료 — `patches/**/*.md` → `web/lib/patches.generated.ts` 빌드 파서. 복기: `docs/reviews/patch-parser.md`.
- ✅ **사이클 #1 `signal-chain-view`** 완료 — `/songs/[slug]` 정적 라우트 + 곡의 모든 변주 세로 나열. GP-150 **기계 패널 리얼리즘**(다크 단일테마, 가로 신호흐름, LCD 텍스트 노브, LED, 풋스위치 배지/그룹). 범용 블록-체인 렌더러(`block.type`만 보고 그림). 순수함수(contrast/renderKnob/blockType)+불변제약 자동검증. **113 vitest(funcs 100%) + 36 Playwright(4브레이크포인트 비주얼 + axe a11y=0), lint/tsgo/tsc/build green.** CE 병렬리뷰(3) 검증우선 처리, CRITICAL/HIGH=0. 설계 `docs/plans/2026-06-21-signal-chain-view-design.md`, 복기 `docs/reviews/signal-chain-view.md`.
- ✅ **사이클 #2 `variation-compare`** 완료 — 변주 **탭 위젯**(한 번에 하나, `?v=N` URL 공유). 점진적 향상: 서버가 모든 패널을 정적 HTML 로 그려 **no-JS=전부 표시**, JS 아일랜드(null 렌더)가 `getElementById`로 강화 → 한 번에 하나. `useSearchParams`는 Suspense 격리(SSG 유지). WAI-ARIA Tabs(roving tabindex·←/→/Home/End). **145 vitest + 72 Playwright(4 브레이크포인트, axe 0, no-JS, reduced-motion), lint/tsgo/tsc/build green(● SSG).** CE 병렬리뷰(6) 검증우선, CRITICAL/HIGH=0. 설계 `docs/plans/2026-06-21-variation-compare-design.md`, 복기 `docs/reviews/variation-compare.md`.
- ✅ **사이클 #3 `song-index`** 완료 — 홈을 **곡 목록/검색 진입점**으로. 정적 목록 + 검색창 + rig 칩, URL `?q=&rig=`(공유), 0결과 빈상태 + 라이브 카운트. 점진적 향상: 리스트 정적(no-JS=전부) + 컨트롤 아일랜드(`useSyncExternalStore` 하이드레이션 게이트), genre 는 칩 대신 검색 대상(긴 서술문이라). **169 vitest + 124 Playwright(4 bp, axe 0, no-JS, 레이스가드), lint/tsgo/tsc/build green(○ Static).** CE 병렬리뷰(6) CRITICAL/HIGH=0. 복기 `docs/reviews/song-index.md`(⚠ dev서버 재사용·하이드레이션 교훈 포함).
- ✅ **사이클 #4 `request-form`** 완료 — 곡 제보 폼(곡·아티스트·요청자·메모) → Web3Forms → Gmail. **백엔드 0.** PE: 트리거 `<a href="/request">` 가 no-JS=정적 `/request` 네이티브 POST / JS=`<dialog>` 모달 fetch 제출. 폼 컴포넌트 1개 공유, 전역 진입점=빈상태 + 신설 `<footer>`. 프리필=라이브 검색값(SONG_SEARCH_ID), honeypot 스팸가드, 키 fail-fast(prod)/placeholder(dev·test). **213 vitest + 188 Playwright(no-JS·dialog·프리필·성공/실패·ESC/백드롭·포커스트랩·더블서브밋·비주얼 4bp·axe 0·reduced-motion), lint/tsgo/tsc/build green(`/request`·`/request/sent` ○ Static).** CE 병렬리뷰(6) 실제 CRITICAL/HIGH 수정 후 0(더블서브밋 가드+AbortController+role=dialog, 나머지는 verify-first 로 기각). 복기 `docs/reviews/request-form.md`(⚠ ::backdrop 클릭·native 포커스트랩 교훈).
- ✅ **사이클 #5 `block-module-taxonomy`** 완료 — 사용자 지적("GP-150엔 OD 모듈이 없다, 모듈은 12개")을 받아 데이터 계약 교정. `block.type`을 효과 카테고리(OD/BOOST/FUZZ/COMP) → **GP-150 실제 12모듈**(NR·PRE·WAH·DST·NS·AMP·CAB·EQ·MOD·DLY·RVB·VOL)로, 효과 종류는 선택 필드 **`category`**(PRE: COMP·BOOST·FILTER·PITCH / DST: OD·DST·FUZZ)로 분리. 화면 = `[DST] 오버드라이브 · TS-808`(모듈 배지+효과종류 라벨+모델). 설계는 **사용자 AskUserQuestion으로 수렴**(type+category / 전체 마이그레이션). 파서가 **per-type 시맨틱 페어링 검증**(잘못된 조합 빌드 차단) + **드리프트 가드 테스트**(런타임 허용목록↔TS union). 패치 5개 마이그레이션(누락 0). **235 vitest(커버리지 96%) + 188 Playwright(오아시스 스냅샷 4bp 갱신), lint/tsgo/tsc/build green(●SSG 7곡/21변주).** CE 병렬리뷰(4) CRITICAL/HIGH=0, MEDIUM 3종(시맨틱 검증·드리프트 가드·회귀 가드) 수정. 설계 `docs/plans/2026-06-23-block-module-taxonomy-design.md`, 복기 `docs/reviews/block-module-taxonomy.md`.
- **🎉 트랙2 사이클(#0~#5) 완료.** 다음: 실제 Web3Forms 키 연결(사용자, `jinjinstar3@gmail.com`)·`web/.env.local`+Vercel 설정 → origin push → main 병합/PR → Vercel 배포.
- 🔧 **배포 픽스**(2026-06-23): 루트 `vercel.json`에 `cleanUrls:true` 추가 — 정적 export `*.html`을 확장자 없는 경로로 서빙(상세 페이지 새로고침 404 해소). 배포 후 검증 필요.
- ✅ **사이클 #6 `guitar-controls`** 완료 — 곡 상세에 **기타 본체 세팅 박스**(셀렉터 위치/볼륨/톤/코일스플릿 + 메모), 신호 출발점(체인 위). 변주별 `pickup` 자유문자열 → 구조화 `guitar` JSON, 셀렉터 라벨은 rig→기타모델 5-way 맵에서 빌드타임 파생(`selectorLabel`, 드리프트 0). `guitarRegistry`(순수) + `parseGuitar`(범위검증·rig가드·코일스플릿경고). 패치 8파일 24변주 전체 백필(pickup 0). tone-builder 스킬에 `guitar:` 규칙 추가. **vitest 258 + Playwright 170(axe 0, 스냅샷 4bp 갱신), lint/tsgo/tsc/build green(●SSG 8곡/24변주).** CE 병렬리뷰(3) HIGH 2(배치·rig가드) 수정 후 0, typescript 승인. 설계 `docs/plans/2026-06-23-guitar-controls-design.md`, 복기 `docs/reviews/guitar-controls.md`.
- 📌 **사이클 #7 `new-badge`** 대기(별도 brainstorm) — frontmatter `added:` 날짜 → 곡 목록+상세 "New" 배지, **클라이언트 판정**(`now−added<7일`, 정적빌드 무관 정확, no-JS=배지없음). #6과 독립.
- **미해결 메모**: ✅ ~~① yb slug 충돌~~ 해소(0b9a3b5). ② cross-5.5/5.7(LCP/CLS) Lighthouse 미측정(정적이라 위험 낮음). ③ hanroro switching.B 경고 2건. ④ rig 칩 radiogroup 업그레이드(선택적 a11y). ⑤ NEXT_PUBLIC_SITE_URL 설정 시 no-JS redirect→/request/sent 활성(코드 대비됨). ⑥ request CSS page-shell 중복(2페이지, 수용).
- 브랜치: `feat/web-patch-parser` (#0~#4 커밋, main 미병합·origin 미push).

| # | 피처 | slug | 비고 |
|---|------|------|------|
| 0 | **md 파서 → `patches.generated.ts`** | `patch-parser` | 인프라 척추. `docs/parser-contract.md` 구현. 오아시스 1곡 검증. UI 전에 이게 먼저. TDD 강하게. |
| 1 | **곡 상세 — 시그널 체인 렌더러 (GP-150 스킨)** | `signal-chain-view` | 핵심 가치. 범용 블록-체인 렌더러 + 프로세서 스킨. block.type만 보고 그림. |
| 2 | **변주 3개 비교 뷰** | `variation-compare` | 같은 곡의 변주를 나란히. 탭/카드. |
| 3 | **곡 목록 / 검색** | `song-index` | 진입점. 정적 목록 + 클라이언트 필터. |
| 4 | **제보 폼** | `request-form` | 폼-투-이메일(Web3Forms) → Gmail. 백엔드 없음. |
| 5 | **모듈 택소노미 교정** | `block-module-taxonomy` | (계획 외/반응형) `block.type` = GP-150 실제 12모듈, 효과종류는 `category` 필드. 데이터 계약 척추 교정. |
| 6 | **기타 본체 세팅 박스** | `guitar-controls` | ✅ 완료. 변주별 `pickup` → 구조화 `guitar`(셀렉터/볼륨/톤/코일스플릿+메모), 셀렉터 라벨 rig→기타모델 파생, 전체 백필. 복기 `docs/reviews/guitar-controls.md`. |
| 7 | **New 배지** | `new-badge` | frontmatter `added:` → 목록+상세 "New" 배지. 클라이언트 판정(7일). **다음(별도 brainstorm).** |
| 8 | **요청 폼 확장** | `request-form-v2` | 📌 대기(별도 brainstorm, 2026-07-06 결정). 기존 곡 제보 폼에 "요청 유형" 선택 추가(곡 제보/기타·이펙터 추가 요청/일반 문의). 설계: `docs/plans/2026-07-06-canon-projection-revival-design.md` §4. 기어 추가 요청이 자동 온보딩 큐를 대체하는 트리거. |

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
