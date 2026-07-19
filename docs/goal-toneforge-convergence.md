# GOAL — Tone Forge 디자인 수렴 (북극성)

> 세운 날: 2026-07-19 · 브랜치: `feat/toneforge-convergence`
> 권위 디자인: `ToneForgeRig.dc.html` (claude.ai/design 프로젝트 `e801f46e`)
> 이 문서는 **여러 사이클에 걸친 수렴 목표**다. 한 사이클 = `docs/web-harness.md` 루프 1회.
> 트랙2 진입점은 `docs/backlog.md`. 이 파일은 그 위에 얹는 방향타.

## 한 줄 목표

현재 GP-150 기계 패널 웹뷰를 **Tone Forge 디자인 언어**(rugged 하드웨어 스큐어모피즘 — 근흑색 섀시, 앰버 악센트, Oswald/Barlow/Space Mono, LED/Knob/Fader/Display/Meter/Panel 프리미티브)로 **점진 수렴**시킨다. 데이터·구조·헌법은 불변, 바뀌는 건 **표피(스킨)와 화면 구성**뿐.

## 절대 제약 (헌법 재확인 — 수렴이 넘지 못하는 선)

- **읽기 전용.** md가 유일한 진실. 웹은 빌드타임 상수의 정적 뷰. 편집 UI 없음.
- **DB·백엔드 0.** Supabase·런타임 데이터스토어 금지.
- **제보는 이메일** (Web3Forms → Gmail). 그 외 폼 없음.

→ 따라서 디자인의 **동작 함의(생성/투표/저장)는 기능이 아니라 장식**으로 흡수한다. 데이터 척추(`signal_chain`, 파서, 카탈로그 게이트)는 손대지 않는다.

## 디자인 → 현재 앱 화면 매핑

| 디자인 카드 | 디자인 화면 | 현재 라우트/컴포넌트 | 수렴 처리 |
|---|---|---|---|
| 1d TFCatalog | 검색·정렬·PatchCard(+vote) | `app/page.tsx` → `SongIndex` | **리스킨.** vote는 장식/생략 (읽기 전용) |
| 1c TFPatch | SongTabs·Meter·Fader·토글/노브 | `app/songs/[rig]/[song]/page.tsx` → `SongDetail`+`SignalChain` | **리스킨(핵심).** 토글/노브 = ephemeral only, 데이터 불변 |
| 1a TFGenerate | 아티스트/곡/기타/픽업 입력 → 생성 | `app/request/*` → `RequestForm` | 생성 CTA → **이메일 제보 폼**으로 흡수 |
| 1b TFGenerating | 블록 순차 LED + 진행률 % | (없음) | 런타임 생성 없음 → **장식/후순위 또는 생략** |
| 1e TFMobile* | 모바일 셸(372px, sticky 풋스위치 바) | 반응형(기존 브레이크포인트) | 각 화면의 모바일 변형으로 흡수 |

## 현재 ↔ 목표 갭

| 축 | 현재 (main) | 목표 (Tone Forge) |
|---|---|---|
| 폰트 | Geist / Geist Mono | **Oswald(display) / Barlow(body) / Space Mono(mono)** |
| 토큰 | `lib/tokens.css` 최소 GP-150 다크 | DS 토큰 풀세트 (chassis 9단계, amber 6단계, LED 4색, LCD, shadow/radius/motion) |
| 섀시 | 평면 다크 패널 | 근흑색 섀시 + 리세스 웰 + 코너 스크류 + raised/inset shadow |
| 악센트 | 타입별 hue만 | **앰버 섀시 + 타입별 hue 유지(하이브리드)** — 확정 fork |
| 프리미티브 | TypeBadge·KnobGrid·LED(ad hoc) | LED·Knob·Fader·Display·Meter·Panel·Badge·SignalChainBlock 통일 |
| 브랜드 | "GP-150 톤 라이브러리" | "Tone Forge" 워드마크 (※ 브랜드명은 placeholder — 아래 열린 질문) |

## 확정된 fork (이전 브레인스토밍 세션)

1. **블록 타입 색 = 타입별 hue 유지(하이브리드).** Tone Forge "단일 앰버 악센트" 원칙 위에 기존 per-type hue(`--color-od/amp/cab/dly/rvb/mod/util`)를 **레이어**한다. `lib/__tests__/tokens.test.ts`의 WCAG AA 불변(악센트 vs 배경 명도차 ≥0.20, 배지/텍스트 대비 ≥4.5:1)을 계속 통과해야 한다.
2. **첫 사이클 = 수직 슬라이스.** 토큰 레이어 포트 + 코어 Patch/signal-chain 리스킨만. 5화면 전체 동시 개편 안 함.

## 수렴 로드맵 (사이클)

기존 백로그가 #0~#6 완료, #7 multi-processor-view 계획됨. 수렴은 그 뒤 **#8~#11**로 얹는다:

- **#8 `toneforge-skin`** (수직 슬라이스) — DS 토큰 포트 + Oswald/Barlow/Space Mono + 코어 프리미티브(Panel/LED/Display/Badge) + **Patch/signal-chain 리스킨**. 나머지 화면은 손 안 댐. ← **지금 이 사이클**
- **#9 `catalog-reskin`** — 홈(SongIndex)을 TFCatalog 룩으로. PatchCard·검색·정렬 스킨. vote 장식.
- **#10 `generate-as-request`** — 제보 폼을 TFGenerate 룩으로(입력 필드·픽업 셀렉터 스킨). 제출은 여전히 이메일.
- **#11 `mobile-shell`** — 모바일 셸(sticky 풋스위치 바 등) 통일 + 브랜드 워드마크 확정.

각 사이클은 게이트(lint + tsgo, 커밋 직전 tsc) + QA(`docs/verification-rubric.md` loop-until-pass) + CE 리뷰(CRITICAL/HIGH=0)를 통과해야 "완료".

## 성공 기준 (수렴 = done 판정)

- [ ] DS 토큰이 `lib/tokens.css`(또는 분할 토큰 파일)에 단일 출처로 존재, `tokens.test.ts` 불변 통과
- [ ] Oswald/Barlow/Space Mono 로드(font-display swap, 프리로드는 임계 웨이트만) — 기존 Geist 대체
- [ ] Patch 화면이 디자인 1c와 시각적으로 정합 (섀시·LED·Display·Badge·SignalChainBlock)
- [ ] 하이브리드 색: 앰버 섀시 위 타입별 hue 유지, WCAG AA 유지
- [ ] 모든 화면 read-only 유지 (생성/투표/저장 = 장식, 데이터 불변)
- [ ] 4 브레이크포인트(320/768/1024/1440) 비주얼 회귀 + axe a11y=0 + reduced-motion 존중
- [ ] lint/tsgo/tsc/build green, vitest 커버리지 ≥80%
- [ ] Lighthouse/CWV: 랜딩 JS<150kb·CSS<30kb, LCP<2.5s, CLS<0.1

## 열린 질문 (사이클별 PRD에서 확정)

1. **브랜드명.** 디자인의 "Tone Forge"는 placeholder(로고 없음). 현 앱 타이틀 "GP-150 톤 라이브러리" 유지 vs Tone Forge 채택 vs 제3안 → #11 또는 사용자 결정.
2. **토큰 파일 구조.** 단일 `tokens.css` 확장 vs `styles/tokens/*.css` 분할(colors/typography/spacing/radius/shadow/motion) — #8 TRD.
3. **하이브리드 색 대비 재검증.** 앰버 섀시 명도가 바뀌면 per-type hue의 배경 대비가 재계산 필요 — #8 TDD에서 tokens.test.ts 갱신.
4. **1b Generating 애니메이션** 채택 여부 — 런타임 생성이 없으므로 순수 장식. 후순위(#11 이후) 또는 드롭.
