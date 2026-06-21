# TRD — signal-chain-view

- **Feature slug**: signal-chain-view
- **PRD**: docs/prd/signal-chain-view.md
- **설계**: docs/plans/2026-06-21-signal-chain-view-design.md

## 설계 요약
`web/app/songs/[slug]/page.tsx`가 `generateStaticParams()`로 `PATCHES`의 전 slug를 정적 생성한다.
slug로 `Song`을 찾아(못 찾으면 `notFound()`) `<SongDetail>`에 넘기고, 변주를 세로로 나열한다.
각 변주는 `<SignalChain>`(block[] → 가로 흐름)과 `<SwitchingPlan>`을 렌더한다.

렌더러는 `block.type`만 보고 그린다 — 타입별 분기 컴포넌트 없이 `<BlockModule>` 하나가 모든 타입을
처리하고, 색/약어는 `lib/blockType.ts`(타입→그룹·약어) + `lib/tokens.css`(그룹→색)를 `data-type`
속성으로 참조한다. 노브 텍스트는 순수 함수 `lib/renderKnob.ts`(data-contract §2)가 만든다.
전 컴포넌트 presentational, 데이터는 빌드 상수에서 props로만 흐른다(런타임 0).

## 컴포넌트 구조
```
web/
  app/songs/[slug]/page.tsx        # SSG 라우트(generateStaticParams + notFound)
  app/page.tsx                     # 홈 — 곡 상세 임시 링크 목록(#3 전 placeholder)
  components/
    song-detail/
      SongDetail.tsx               + song-detail.css
      VariationPanel.tsx
    signal-chain/
      SignalChain.tsx              + signal-chain.css
      BlockModule.tsx              + block.module.css
      KnobGrid.tsx
      SwitchingPlan.tsx
    ui/
      TypeBadge.tsx                + type-badge.css
  lib/
    tokens.css                     # 다크 패널 토큰(:root)
    blockType.ts                   # 타입→토큰 그룹 + 약어 + util 폴백
    renderKnob.ts                  # 노브 → 표시 텍스트(순수)
    contrast.ts                    # 상대명도·대비비 계산(tokens 테스트·배지 텍스트색 선택)
```

## 파일 목록 (생성/수정)
| 파일 | 역할 |
|------|------|
| web/app/songs/[slug]/page.tsx | SSG 라우트, slug→Song, notFound |
| web/app/page.tsx | 홈 임시 링크(수정) |
| web/components/song-detail/SongDetail.tsx | 곡 헤더 + 변주 세로 나열 |
| web/components/song-detail/VariationPanel.tsx | 변주 1개: 라벨 + 체인 + 스위칭 |
| web/components/signal-chain/SignalChain.tsx | block[] 가로 흐름 + 커넥터 |
| web/components/signal-chain/BlockModule.tsx | 블록 1개(헤더+LED+풋스위치+노브격자) |
| web/components/signal-chain/KnobGrid.tsx | knobs[] → LCD 셀(빈 배열 처리) |
| web/components/signal-chain/SwitchingPlan.tsx | switching 분리 섹션 |
| web/components/ui/TypeBadge.tsx | 타입 배지(색+약어, data-type) |
| web/lib/tokens.css | 다크 패널 토큰 |
| web/lib/blockType.ts | 타입→그룹/약어, 미지 타입 util 폴백 |
| web/lib/renderKnob.ts | 노브 텍스트 변환(순수) |
| web/lib/contrast.ts | 상대명도/대비비(흰·검 자동선택) |
| (테스트) renderKnob/blockType/tokens/contrast .test.ts | 유닛 |
| web/tests/visual/song-detail.spec.ts | Playwright 스냅샷 |

## 데이터 흐름 / 타입
- 입력: `PATCHES: readonly Song[]` (lib/patches.generated.ts). `Song → Variation → Block → Knob`, `SwitchingPlan`.
- 변환: `renderKnob(knob)` → 표시 문자열 / `blockTypeToken(type)` → {group, abbr}.
- 출력: SSG HTML(읽기 전용).
- 타입 출처: web/lib/types.ts (`docs/parser-contract.md`와 1:1). 새 타입 정의 없음.

## 상태 / 엣지케이스
- `knobs=[]`(IR-only CAB): "노브 없음".
- `enabled=false`: 흐림+grayscale+'OFF'+aria-disabled, 노브 값 유지.
- `footswitch` 없음 → 배지 영역 clean. 같은 키 그룹 시각화.
- 변주 1개 / 3개 모두. 긴 모델명·곡명 → wrap/ellipsis, 오버플로 0.
- 미지 block.type → util 회색 폴백(crash 0).
- 모바일(320): 가로 체인이 세로 wrap, 커넥터 방향 표시 유지.

## 수용 기준 ↔ 구현·테스트 매핑
| PRD 기준 | 컴포넌트 | 테스트 |
|----------|----------|--------|
| AC1 순서 렌더 | SignalChain | visual(오아시스), 렌더 순서 단위 |
| AC2 변주 세로·독립 | SongDetail/VariationPanel | visual 다변주 |
| AC3 약어 병기 | TypeBadge/blockType | blockType.test, visual |
| AC4 노브 형식 | KnobGrid/renderKnob | renderKnob.test(전 케이스) |
| AC5 disabled | BlockModule(block.module.css) | visual disabled 변주, dom 단위 |
| AC6 풋스위치/그룹 | BlockModule | visual 풋스위치 변주 |
| AC7 스위칭 섹션 | SwitchingPlan | visual |
| AC8 빈 노브 | KnobGrid | renderKnob/KnobGrid 단위 |
| AC9 반응형 | (전체 css) | visual 320/768/1024/1440 |
| AC10 정적 | page.tsx | `next build` 로그 ○ Static |
| 불변 색 제약 | tokens.css/contrast | tokens.test(명도차·대비) |

## 테스트 계획
- 유닛(Vitest, 커버리지 80%+): renderKnob(§2 표기 테이블+빈배열), blockType(매핑+폴백),
  contrast(상대명도·대비·흰검선택), tokens(인접 명도차 ≥20%·배지 대비 ≥4.5:1·LCD 대비).
- 비주얼(Playwright, 320/768/1024/1440): 오아시스 곡 상세 — 정상/disabled 포함/풋스위치 그룹 변주.
  접근성: 키보드 내비, aria-disabled/aria-label 존재, reduced-motion.

## 새 의존성 (있으면 근거)
- 없음. contrast 계산은 색 4개 토큰 대상이라 작은 자체 함수(WCAG 공식)로 충분 — 라이브러리 불필요(YAGNI).
