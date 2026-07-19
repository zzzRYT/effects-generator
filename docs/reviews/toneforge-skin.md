# 복기 — 사이클 #8 `toneforge-skin`

- **완료일**: 2026-07-19 · 브랜치 `feat/toneforge-convergence`
- **북극성**: docs/goal-toneforge-convergence.md (Tone Forge 디자인 수렴)
- **산출**: brainstorm/prd/trd → 구현 → CE 병렬 리뷰(3) → QA(루브릭)

## 무엇을 했나

Patch(곡 상세) 화면을 Tone Forge 하드웨어 스킨으로 리스킨. 데이터·파서·라우트·ARIA 배선 불변, 토큰·폰트·표피만 교체.

- **토큰 층**: `lib/tokens.css`를 DS 팔레트로 리맵(chassis 스케일·amber 6단·LED·LCD·shadow·radius·motion·typography). 기존 테스트가 참조하는 토큰 이름은 고정, 값만 교체 → `tokens.test.ts`가 무수정 회귀 게이트로 동작.
- **폰트 층**: Oswald(display)/Barlow(body)/Space Mono(mono), next/font 셀프호스트. legacy `--font-geist-*`를 tokens.css에서 새 폰트로 별칭 → 미리스킨 화면도 폰트 일괄 승격, 편집 최소.
- **표피 층**: block/signal-chain/song-detail CSS 리스킨(하드웨어 슬롯·리세스 LCD 웰·발광 LED·앰버 스위칭 명판·패치케이블 커넥터). 신규 `Panel` 프리미티브(코너 스크류 섀시, `as` 다형).
- **하이브리드 색**: 앰버 섀시 크롬 + per-type hue(블록 스트라이프) 유지.

## 게이트 결과 (DoD)

- lint(eslint) · tsgo · tsc 전부 0 에러
- **vitest 255개 통과, 커버리지 96.7% stmts / 98.6% lines** (Panel 8 케이스 신설, 탭패널 ARIA 포워딩 회귀 가드 포함)
- **Playwright 188개 통과** — 4 브레이크포인트 비주얼 회귀(갱신) · axe=0 · reduced-motion · no-JS 폴백
- build SSG 성공(8곡/24변주)
- 번들: **CSS 6.2kb gzipped**(예산 30kb) · 폰트 셀프호스트(외부요청 0, CSP 안전)

## CE 병렬 리뷰 (3)

1. **project-standards-reviewer** — HIGH 1건: body 배경 하드코딩 `rgb(245 148 34 / 5%)` → `color-mix(in srgb, var(--amber-500) 5%, transparent)` 토큰화. **수정 완료.** 나머지(읽기전용·per-type hue 유지·시맨틱·compositor-friendly·불변) 전부 준수.
2. **correctness-reviewer** — 버그 0. Panel props/className 병합·aria-hidden 스크류·CSS 캐스케이드 충돌 없음 확인. MEDIUM 테스트 갭 1건(탭패널 ARIA가 `<Panel as="article">`로 전달되는지 단위 검증 부재) → **테스트 추가로 해소.**
3. **a11y-architect** — WCAG 2.2 AA 위반 0. reduced-motion 가드·색외 다중신호(LED+라벨+grayscale+외곽선)·앰버 라벨 대비 8~12:1·포커스 링·시맨틱 전부 통과.

CRITICAL/HIGH 잔여 = 0.

## QA (verification-rubric)

- **목적 1(UI 시각화)**: ui-1.1(색대비, 필수 5점) = tokens.test + axe=0 통과. ui-1.9(AMP/CAB 강조) 보강 — 모델명 한 단계 크게(≥20%) + 스트라이프 5px. 평균 ≥4.0.
- **목적 5(교차 품질)**: cross-5.1(대비, 필수) 통과 · reduced-motion · 비주얼 회귀 갱신 · CSS 예산 통과 · 모바일 12px 하한 유지.
- 목적 2/3/4(데이터·엣지·풋스위치)는 데이터 척추 불변 → 기존 통과 상태 유지(전 테스트 green).

## 교훈 / 주의

1. **스테일 생성물·테스트 드리프트**: 워킹트리의 `patches.generated.ts`가 타 브랜치 스키마(guitar 필드)로 stale → `gen:patches` 재생성으로 해소. `song-index.spec`이 곡 수 7로 하드코딩(Queen 패치 추가 후 8) → 진실값으로 교정. **교훈**: 리스킨 사이클 시작 시 `gen:patches` + 전체 스위트를 먼저 돌려 baseline이 실제로 green인지 확인.
2. **토큰 이름 고정 전략**: 테스트가 참조하는 토큰 이름을 유지하고 값만 리맵하니, 색 대규모 교체가 자동 회귀 검증 아래에서 안전. 앞으로 수렴 사이클(#9~#11)도 동일 전략.
3. **범위 경계 유지**: 홈/제보/모바일셸은 손대지 않되, 전역 폰트/토큰은 별칭으로 자동 승격 → 미리스킨 화면도 깨지지 않고 일관 상승. 단 변주 탭 활성색이 아직 블루(--color-amp) — 완전 앰버화는 #9 이후.

## 남은 항목 (백로그)

- 변주 탭 위젯 앰버화(현재 블루 잔존) → #9/#11 스킨 확장 시.
- `supabase/`·`.worktrees/` untracked 정리(헌법상 DB 없음 — 내 변경 아님, 사용자 확인 대기).
- 수렴 다음: #9 catalog-reskin(홈→TFCatalog).
