# 백로그 — 트랙 2 사이클 대상

각 항목 = `docs/web-harness.md`의 루프 한 사이클. 위에서부터 의존 순서.
사이클 시작 = `/superpowers:brainstorm <항목>`.

## 현재 상태 (resume 포인터) — 2026-06-23

> 새 세션은 이 줄부터 읽으면 어디서 이어갈지 안다. CLAUDE.md → 이 파일이 트랙2 진입점.

- ✅ **선행 셋업** 완료: `web/`(Next 16 · App Router · CSS Modules · 이중 게이트 tsgo/tsc/eslint/vitest/playwright) + `docs/data-contract-ui.md`.
- ✅ **사이클 #0 `patch-parser`** 완료 — `patches/**/*.md` → `web/lib/patches.generated.ts` 빌드 파서. 복기: `docs/reviews/patch-parser.md`.
- ✅ **사이클 #1 `signal-chain-view`** 완료 — `/songs/[slug]` 정적 라우트 + 곡의 모든 변주 세로 나열. GP-150 **기계 패널 리얼리즘**(다크 단일테마, 가로 신호흐름, LCD 텍스트 노브, LED, 풋스위치 배지/그룹). 범용 블록-체인 렌더러(`block.type`만 보고 그림). 순수함수(contrast/renderKnob/blockType)+불변제약 자동검증. **113 vitest(funcs 100%) + 36 Playwright(4브레이크포인트 비주얼 + axe a11y=0), lint/tsgo/tsc/build green.** CE 병렬리뷰(3) 검증우선 처리, CRITICAL/HIGH=0. 설계 `docs/plans/2026-06-21-signal-chain-view-design.md`, 복기 `docs/reviews/signal-chain-view.md`.
- ✅ **사이클 #2 `variation-compare`** 완료 — 변주 **탭 위젯**(한 번에 하나, `?v=N` URL 공유). 점진적 향상: 서버가 모든 패널을 정적 HTML 로 그려 **no-JS=전부 표시**, JS 아일랜드(null 렌더)가 `getElementById`로 강화 → 한 번에 하나. `useSearchParams`는 Suspense 격리(SSG 유지). WAI-ARIA Tabs(roving tabindex·←/→/Home/End). **145 vitest + 72 Playwright(4 브레이크포인트, axe 0, no-JS, reduced-motion), lint/tsgo/tsc/build green(● SSG).** CE 병렬리뷰(6) 검증우선, CRITICAL/HIGH=0. 설계 `docs/plans/2026-06-21-variation-compare-design.md`, 복기 `docs/reviews/variation-compare.md`.
- ✅ **사이클 #3 `song-index`** 완료 — 홈을 **곡 목록/검색 진입점**으로. 정적 목록 + 검색창 + rig 칩, URL `?q=&rig=`(공유), 0결과 빈상태 + 라이브 카운트. 점진적 향상: 리스트 정적(no-JS=전부) + 컨트롤 아일랜드(`useSyncExternalStore` 하이드레이션 게이트), genre 는 칩 대신 검색 대상(긴 서술문이라). **169 vitest + 124 Playwright(4 bp, axe 0, no-JS, 레이스가드), lint/tsgo/tsc/build green(○ Static).** CE 병렬리뷰(6) CRITICAL/HIGH=0. 복기 `docs/reviews/song-index.md`(⚠ dev서버 재사용·하이드레이션 교훈 포함).
- ✅ **사이클 #4 `request-form`** 완료 — 곡 제보 폼(곡·아티스트·요청자·메모) → Web3Forms → Gmail. **백엔드 0.** PE: 트리거 `<a href="/request">` 가 no-JS=정적 `/request` 네이티브 POST / JS=`<dialog>` 모달 fetch 제출. 폼 컴포넌트 1개 공유, 전역 진입점=빈상태 + 신설 `<footer>`. 프리필=라이브 검색값(SONG_SEARCH_ID), honeypot 스팸가드, 키 fail-fast(prod)/placeholder(dev·test). **213 vitest + 188 Playwright(no-JS·dialog·프리필·성공/실패·ESC/백드롭·포커스트랩·더블서브밋·비주얼 4bp·axe 0·reduced-motion), lint/tsgo/tsc/build green(`/request`·`/request/sent` ○ Static).** CE 병렬리뷰(6) 실제 CRITICAL/HIGH 수정 후 0(더블서브밋 가드+AbortController+role=dialog, 나머지는 verify-first 로 기각). 복기 `docs/reviews/request-form.md`(⚠ ::backdrop 클릭·native 포커스트랩 교훈).
- ✅ **사이클 #5 `block-module-taxonomy`** 완료 — 사용자 지적("GP-150엔 OD 모듈이 없다, 모듈은 12개")을 받아 데이터 계약 교정. `block.type`을 효과 카테고리(OD/BOOST/FUZZ/COMP) → **GP-150 실제 12모듈**(NR·PRE·WAH·DST·NS·AMP·CAB·EQ·MOD·DLY·RVB·VOL)로, 효과 종류는 선택 필드 **`category`**(PRE: COMP·BOOST·FILTER·PITCH / DST: OD·DST·FUZZ)로 분리. 화면 = `[DST] 오버드라이브 · TS-808`(모듈 배지+효과종류 라벨+모델). 설계는 **사용자 AskUserQuestion으로 수렴**(type+category / 전체 마이그레이션). 파서가 **per-type 시맨틱 페어링 검증**(잘못된 조합 빌드 차단) + **드리프트 가드 테스트**(런타임 허용목록↔TS union). 패치 5개 마이그레이션(누락 0). **235 vitest(커버리지 96%) + 188 Playwright(오아시스 스냅샷 4bp 갱신), lint/tsgo/tsc/build green(●SSG 7곡/21변주).** CE 병렬리뷰(4) CRITICAL/HIGH=0, MEDIUM 3종(시맨틱 검증·드리프트 가드·회귀 가드) 수정. 설계 `docs/plans/2026-06-23-block-module-taxonomy-design.md`, 복기 `docs/reviews/block-module-taxonomy.md`.
- ✅ **사이클 #6 `model-catalog-validation`** 완료 — 사용자 지적("GP-150에 없는 이펙트가 들어있다")을 받아 **모델명 진실성**을 빌드 게이트로 등록. 빌드 파서가 패치 `model`을 그 rig 의 프로세서 카탈로그(`models/processors/<proc>/{amps,cabs,effects}.md` = 매뉴얼 FX Title)와 대조 → 실기/페달 이름(base-gear)을 model 에 쓰면 `model-unknown`으로 **빌드 차단**. 프로세서 비종속(rig→processor 매핑 기반, 어느 멀티이펙터든 동일). 순수 모듈 `lib/parser/catalog.ts`(extractCatalog/isKnownModel/resolveCatalog) + parsePatch 옵션 스레딩(하위호환) + gen-patches 래퍼가 카탈로그·rig맵 주입. **catalog.test.ts 신설(콤보/범위/노트제외/base-gear거부/게이트 통과·차단), 247 vitest green, gen:patches 8곡/24변주 통과(전 모델 카탈로그 일치).** 데이터 교정: 패치 21곳·`effects.md`/`cabs.md`/contract 의 base-gear→FX Title (TS-808→Green OD, Fuzz Face→Red Haze, EP Booster→Boost, Comp→COMP, '65 Twin Reverb→Twin 2x12). tone-builder SKILL + parser-contract(규칙 6) 갱신. ⚠ 오아시스 Playwright 비주얼 스냅샷은 모델 라벨 변경으로 `--update-snapshots` 필요(브라우저 의존, 별도).
- **🎉 트랙2 사이클(#0~#6) 완료.** 다음: 실제 Web3Forms 키 연결(사용자, `jinjinstar3@gmail.com`)·`web/.env.local`+Vercel 설정 → origin push → main 병합/PR → Vercel 배포.
- **🎨 디자인 수렴 트랙 개시 (2026-07-19)** — 브랜치 `feat/toneforge-convergence`. 북극성 = `docs/goal-toneforge-convergence.md` (Tone Forge 디자인 `ToneForgeRig.dc.html`로 점진 수렴). 사이클 #8~#11 아래 표. 확정 fork: 하이브리드 색(앰버 섀시+타입별 hue), 첫 사이클=수직 슬라이스(토큰+Patch). **#8 `toneforge-skin` ✅ 완료. 다음 진입점 = #9 `catalog-reskin`(홈→TFCatalog).**
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
| 6 | **모델 카탈로그 검증 게이트** | `model-catalog-validation` | ✅ (계획 외/반응형) 패치 `model` ↔ 프로세서 카탈로그(매뉴얼 FX Title) 빌드 대조, base-gear 이름 차단. 프로세서 비종속. |
| 7 | **멀티 프로세서 뷰 (모델 선택)** | `multi-processor-view` | 📋 (계획) 다른 이펙터 추가 대비 — 웹에서 프로세서/모델 선택 → 그 기기 스킨·모듈순서·스케일로 렌더 + 모델 카탈로그 브라우저. 설계: `docs/plans/2026-06-27-multi-processor-view-design.md`. |
| 8 | **Tone Forge 스킨 (수직 슬라이스)** | `toneforge-skin` | ✅ (수렴) DS 토큰 리맵 + Oswald/Barlow/Space Mono(next/font) + `Panel` 프리미티브(코너 스크류) + **Patch/signal-chain 리스킨**(하드웨어 슬롯·LCD 웰·발광 LED·앰버 명판). 하이브리드 색 유지, `tokens.test` 무수정 통과. **255 vitest(cov 96.7%) + 188 Playwright(4bp·axe0·reduced-motion·no-JS), lint/tsgo/tsc/build green(CSS 6.2kb gz).** CE 병렬리뷰(3): 표준 HIGH 1(하드코딩 rgb→토큰) 수정, correctness 버그0(+탭 ARIA 회귀가드 추가), a11y WCAG AA 위반0. 복기 `docs/reviews/toneforge-skin.md`. |
| 9 | **카탈로그 리스킨** | `catalog-reskin` | 🎨 (수렴) 홈(SongIndex)→TFCatalog 룩. PatchCard·검색·정렬. vote 장식. |
| 10 | **제보=Generate 리스킨** | `generate-as-request` | 🎨 (수렴) 제보 폼→TFGenerate 룩(픽업 셀렉터 등). 제출은 여전히 이메일. |
| 11 | **모바일 셸 + 브랜드** | `mobile-shell` | 🎨 (수렴) sticky 풋스위치 바 등 모바일 셸 통일 + 브랜드 워드마크 확정. |

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
