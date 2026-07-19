# TRD — Tone Forge 스킨 (수직 슬라이스)

- **Feature slug**: toneforge-skin
- **PRD**: docs/prd/toneforge-skin.md

## 설계 요약

세 층으로 수렴한다. **(1) 토큰 층** — `lib/tokens.css`를 DS 토큰으로 확장하되, 기존 테스트가 참조하는 토큰 이름(`--panel`·`--panel-2`·`--bezel`·`--lcd`·`--lcd-text`·`--text`·`--text-muted`·`--led-on/off`·`--color-*`)을 **그대로 유지**하고 값만 DS 팔레트로 리맵한다. 이러면 `tokens.test.ts`가 자동 회귀 게이트가 된다. 신규 토큰(amber 스케일·chassis 스케일·shadow·radius·motion·typography·tracking)을 추가한다. **(2) 폰트 층** — `app/layout.tsx`에서 `next/font/google`로 Oswald/Barlow/Space Mono를 로드해 `--font-display`/`--font-body`/`--font-mono` 변수로 노출. 아직 리스킨 안 한 화면이 쓰는 legacy `--font-geist-sans/mono`는 tokens.css에서 새 폰트로 **alias** → 전 화면 폰트 일괄 승격, 편집 최소. **(3) 표피 층** — Patch 화면 CSS 모듈(`block`·`signal-chain`·`song-detail`)을 하드웨어 섀시 룩으로 리스킨. 코너 스크류가 반복되므로 작은 `Panel` 프리미티브 하나만 추가(나머지 LED/Badge/Display/LCD는 이미 data-attribute 기반이라 CSS 처리).

토큰 리맵의 대비 안전성: `--panel`을 더 어둡게(#131316) 바꾸면 per-type hue의 명도차·본문 대비는 **커지므로** 불변이 더 안전해진다. LCD를 DS값(bg #0a1512 / text #7dffcb)으로 바꿔도 near-black 위 mint라 ≥4.5:1. 최종 판정은 vitest가 한다(눈대중 금지).

## 토큰 파일 구조 (결정)

**단일 `lib/tokens.css` 확장** 채택(분할 안 함). 이유: 파일 1개면 tokens.test.ts의 정규식 파싱이 그대로 동작하고, 현 규모(토큰 ~60개)에서 분할은 과설계(YAGNI). 섹션 주석으로 구획한다(chassis / amber / led / lcd / semantic / type-accent / typography / spacing / radius / shadow / motion).

## 컴포넌트 구조

```
components/ui/
  Panel.tsx            # 신규 — 코너 스크류 + 베젤 섀시 래퍼(children slot)
  panel.module.css     # 신규
components/signal-chain/
  block.module.css     # 리스킨 (하드웨어 슬롯)
  signal-chain.module.css  # 리스킨 (레일/커넥터)
components/song-detail/
  SongDetail.tsx       # Panel 적용(헤더 섀시)
  VariationPanel.tsx   # Panel 적용(변주 카드)
  song-detail.module.css   # 리스킨
```

## 파일 목록 (생성/수정)

| 파일 | 역할 |
|------|------|
| web/lib/tokens.css | **수정** — DS 토큰 리맵+추가(단일 출처) |
| web/app/layout.tsx | **수정** — Oswald/Barlow/Space Mono 로드, 변수 노출 |
| web/app/globals.css | **수정** — body 폰트=Barlow, color-scheme 유지 |
| web/components/ui/Panel.tsx | **신규** — 코너 스크류 섀시 래퍼 |
| web/components/ui/panel.module.css | **신규** |
| web/components/ui/__tests__/Panel.test.tsx | **신규** — 렌더/children/aria 패스스루 |
| web/components/signal-chain/block.module.css | **수정** — 하드웨어 슬롯 리스킨 |
| web/components/signal-chain/signal-chain.module.css | **수정** — 신호 레일 리스킨 |
| web/components/song-detail/SongDetail.tsx | **수정** — Panel 헤더 |
| web/components/song-detail/VariationPanel.tsx | **수정** — Panel 카드 |
| web/components/song-detail/song-detail.module.css | **수정** — 리스킨 |

## 데이터 흐름 / 타입

- 입력: `patches.generated.ts`의 `Song`/`Variation`/`Block`/`Knob` (불변).
- 변환: 없음(순수 표피). `blockTypeToken`/`pickTextColor`/`renderKnob` 그대로.
- 출력: 동일 마크업, 리스킨된 CSS.
- 타입 출처: `web/lib/types.ts` (불변).

## 상태 / 엣지케이스

- 빈 knobs(knobEmpty), enabled=false(opacity+grayscale), footswitch 없음/A/B(외곽선), 변주 1개/3개, 긴 모델명(ellipsis) — 모두 기존 동작 유지, CSS만 갱신.
- Panel: children 없는 경우, aria 속성 패스스루, as-prop 없이 기본 `<div>`(래핑 요소는 시맨틱 방해 안 하게 presentational).

## 수용 기준 ↔ 구현·테스트 매핑

| PRD 기준 | 구현 | 테스트 |
|----------|------|--------|
| DS 토큰 + 불변 통과 | tokens.css 리맵 | tokens.test.ts (기존, 무수정 통과) |
| 하이브리드 색 | `--color-*` 유지 + amber semantic | tokens.test.ts 명도차/대비 |
| 폰트 교체 | layout next/font + alias | Panel/기존 스냅샷, build green |
| 하드웨어 슬롯 | block.module.css | Playwright 비주얼 4bp(오아시스) |
| 코너 스크류 섀시 | Panel + panel.module.css | Panel.test.tsx, 비주얼 |
| 상태 다중신호 유지 | block.module.css 무의미변경 | BlockModule.test.tsx (기존) |
| a11y/overflow/reduced-motion | CSS media queries | Playwright axe + 4bp + reduced-motion |

## 테스트 계획

- 유닛(Vitest): `Panel.test.tsx` 신규(children 렌더·className 병합·aria 패스스루). 기존 235+ 스펙 회귀 무손실. tokens.test.ts 그대로 게이트.
- 비주얼(Playwright): 오아시스 곡 상세 스냅샷 4 브레이크포인트 `--update-snapshots`(리스킨이므로 갱신 예정). axe=0, reduced-motion.

## 새 의존성

- 없음. `next/font/google`는 Next 16 내장. Oswald/Barlow/Space Mono는 Google Fonts(next/font가 빌드타임 셀프호스트 → 외부 요청 0, CSP 안전).
