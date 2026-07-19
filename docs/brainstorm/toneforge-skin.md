# Brainstorm — 사이클 #8 `toneforge-skin`

> 2026-07-19 · 브랜치 `feat/toneforge-convergence` · 북극성 `docs/goal-toneforge-convergence.md`
> 루프 진입점(`docs/web-harness.md`). 다음 단계: PRD.

## 문제

현재 웹뷰(Geist 폰트 + 최소 GP-150 다크 토큰 + 평면 패널)를 Tone Forge 디자인 언어로 수렴시키되, 한 번에 전부 갈아엎지 않고 **가치가 가장 큰 화면(Patch)부터 수직 슬라이스**로 검증한다.

## 결정된 방향 (converged)

**"토큰 레이어 + 코어 프리미티브 + Patch/signal-chain 리스킨"** 만 한다.

- **토큰 포트:** DS 토큰(chassis 9단계·amber 6단계·LED 4색·LCD·shadow/radius/motion·typography)을 `lib/tokens.css` 단일 출처로 확장. 기존 per-type hue는 유지.
- **폰트:** Oswald(display)/Barlow(body)/Space Mono(mono)로 교체. font-display swap.
- **코어 프리미티브:** Panel(리세스 웰+코너 스크류), LED, Display(LCD), Badge — Patch 화면이 쓰는 것만. Knob/Fader/Meter는 필요 최소.
- **Patch 리스킨:** `SongDetail` + `SignalChain` + `BlockModule` + `KnobGrid`를 하드웨어 섀시 룩으로. 데이터·마크업 구조·라우트 불변.

## 하이브리드 색 (핵심 긴장 해소)

Tone Forge "단일 앰버 악센트" 원칙 ↔ 기존 타입별 hue를 **레이어링**으로 화해:

- **섀시/크롬 = 앰버 계열** (프레임, 활성 상태, 워드마크, 라벨 실크스크린).
- **블록 타입 식별 = 기존 per-type hue 유지** (`--color-od/amp/cab/dly/rvb/mod/util`). 이건 데이터 계약 §2의 의미론적 색코딩이라 뺄 수 없음.
- 앰버 섀시 명도가 바뀌면 per-type hue의 **배경 대비 재계산** 필요 → TDD에서 `tokens.test.ts` 불변(≥0.20 명도차, ≥4.5:1 대비) 재검증.

## 채택 안 한 대안 (rejected)

- **단일 앰버 순정(Tone Forge 원칙 그대로).** per-type hue 제거 → 데이터 계약 §2 색코딩 상실. 기각(사용자 fork).
- **5화면 동시 개편.** 리스크·리뷰 부담 과대, 검증 지연. 기각 → 수직 슬라이스.
- **디자인 시스템 먼저(프리미티브 전량 선빌드).** YAGNI. Patch가 실제로 쓰는 프리미티브만 만든다.

## 스코프 밖 (non-goals — 이 사이클)

- 홈/카탈로그 리스킨(#9), 제보 폼 리스킨(#10), 모바일 셸(#11).
- 생성/투표/저장 **기능** — 헌법상 read-only. 디자인의 해당 요소는 장식이거나 이메일로 흡수.
- 1b Generating 애니메이션.
- 브랜드명 변경(현행 "GP-150 톤 라이브러리" 유지, #11에서 재검토).

## 열린 질문 → PRD/TRD로

1. 토큰 파일 구조: 단일 `tokens.css` 확장 vs `styles/tokens/*.css` 분할? → TRD.
2. 앰버 섀시 목표 명도값 확정(per-type 대비 통과선) → TDD, tokens.test.ts.
3. 폰트 로딩: `next/font/google` 3종 셀프호스트 + 프리로드 임계 웨이트 선정 → TRD(성능 예산 CSS<30kb).
4. Knob/Fader/Meter 중 이번 슬라이스에 실제 필요한 것 확정(Patch 화면 정합 기준) → PRD.

## 성공 기준 (이 사이클 done)

- Patch 화면(`/songs/[rig]/[song]`)이 디자인 1c와 시각 정합 (섀시·LED·Display·Badge).
- 하이브리드 색 유지, `tokens.test.ts` green.
- Oswald/Barlow/Space Mono 적용.
- 4 브레이크포인트 비주얼 회귀 + axe=0 + reduced-motion, lint/tsgo/tsc/build green, 커버리지 ≥80%.
- CE 병렬 리뷰 CRITICAL/HIGH=0, 복기 `docs/reviews/toneforge-skin.md`.
