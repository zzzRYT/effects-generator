# PRD — Tone Forge 스킨 (수직 슬라이스)

- **Feature slug**: toneforge-skin
- **Brainstorm**: docs/brainstorm/toneforge-skin.md
- **Goal(북극성)**: docs/goal-toneforge-convergence.md
- **상태**: APPROVED (자율 진행 — 판단 위임)

## 무엇 (What)

곡 상세(Patch) 화면과 시그널 체인 렌더러를 Tone Forge **하드웨어 섀시 룩**으로 리스킨한다. 근흑색 섀시 + 리세스 웰 + 코너 스크류 + 앰버 크롬 + LED/LCD/Display, 폰트는 Oswald(display)/Barlow(body)/Space Mono(mono). 데이터·마크업 구조·라우트·ARIA 배선은 불변, 바뀌는 건 토큰·폰트·표피뿐.

## 왜 (Why) / 누구를 위해

현재 뷰는 기능적이나 "GP-150 실기를 보는" 몰입이 약하다(평면 다크 + 범용 Geist). 사용자(나/밴드/GP-150 유저)가 패치를 볼 때 **실제 멀티이펙터 유닛을 만지는 감각**을 준다. Patch 화면이 가치의 핵심(#1 whoa)이라 여기부터 수렴한다.

## 수용 기준 (측정 가능 — 테스트로 검증)

- [ ] DS 토큰(chassis·amber·LED·LCD·shadow·radius·motion·typography)이 `lib/tokens.css` 단일 출처로 존재하고, 기존 `tokens.test.ts` 불변(악센트 vs 배경 명도차 ≥0.20, 배지/본문/LCD 대비 ≥4.5:1)을 **전부 통과**한다.
- [ ] 블록 타입 색은 **하이브리드**: 앰버 섀시 위에서 per-type hue(`--color-od/amp/cab/dly/rvb/mod/util`)가 유지된다.
- [ ] 폰트가 Oswald/Barlow/Space Mono로 교체된다(제목=Oswald, 본문=Barlow, 수치/라벨=Space Mono). `font-display: swap`.
- [ ] 블록 모듈이 하드웨어 슬롯처럼 보인다: 리세스 LCD 웰, 점등 LED(발광), 실크스크린 라벨, raised 표면 그림자.
- [ ] 변주 카드/섀시 프레임에 코너 스크류·베젤 등 하드웨어 단서가 있다.
- [ ] enabled=false 블록은 색만이 아닌 다중 신호(opacity+grayscale+라벨) 유지. 풋스위치 그룹 외곽선 유지.
- [ ] 320/768/1024/1440에서 오버플로 없음. axe a11y 위반 0. reduced-motion 존중.
- [ ] lint/tsgo/tsc/build green, vitest 커버리지 ≥80%.

## 비목표 (Non-goals — 이번 사이클)

- 홈/카탈로그(SongIndex) 리스킨 → #9.
- 제보 폼 리스킨 → #10. 모바일 셸/브랜드 워드마크 → #11.
- 생성/투표/저장 **기능**(헌법상 read-only — 데이터·파서 불변).
- 1b Generating 애니메이션.
- 새 React 프리미티브 라이브러리 전량 선빌드(YAGNI — Patch가 쓰는 것만).

## 열린 질문

- 토큰 파일 구조(단일 vs 분할) → TRD에서 결정.
- 앰버 섀시 명도 확정값 → TRD/TDD, tokens.test.ts로 검증.
- 폰트 셀프호스트 + 프리로드 웨이트 → TRD(성능 예산 CSS<30kb).
