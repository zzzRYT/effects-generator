# 백로그 — 트랙 2 사이클 대상

각 항목 = `docs/web-harness.md`의 루프 한 사이클. 위에서부터 의존 순서.
사이클 시작 = `/superpowers:brainstorm <항목>`.

## 🔀 방향 전환 (2026-06-25) — 톤 생성기 피벗

> **읽기 순서: 이 블록부터.** 트랙2의 정적 라이브러리(#0~#6)는 완료됐고, 이제 프로젝트는 **셀프서브 AI 톤 생성기**로 피벗한다.
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
