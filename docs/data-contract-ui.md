# UI 렌더 계약 (parser 출력 → 화면)

`docs/parser-contract.md`(md → 타입 상수)의 **소비 측 계약.** 파서가 구운 타입 상수를 화면에 어떻게 그리는지를 못박는다.
`docs/verification-rubric.md`(QA 50기준)가 이 문서를 근거로 채점한다 — 그래서 여기 값은 루브릭과 **1:1로 일치**해야 한다.

## 불변(INVARIANT) vs 잠정(기본값)

- **불변**: 아래 *제약*(대비 비율, 명도차, 상태 신호 다중화, 노브 표기 규칙, switching JSON 형식). QA가 이걸 측정한다. 바꾸려면 루브릭도 같이 바꾼다.
- **잠정(기본값)**: 구체적 헥스 색·아이콘·간격·타이포 같은 *미감*. 사이클 #1(`signal-chain-view`)의 `/superpowers:brainstorm`에서 GP-150 스킨 방향과 함께 확정한다. 단, 확정값도 아래 불변 제약을 반드시 통과해야 한다.

---

## 1. 블록 타입 색 토큰

블록 타입을 한눈에 구분하는 **악센트 색**(좌측 보더 / 타입 배지 배경). 카드 본문은 중립 표면, 노브 텍스트는 고대비 — 즉 "장식 색"과 "텍스트 대비"를 **분리**해서 ui-1.1과 cross-5.1을 동시에 만족시킨다.

### 기본값(잠정) — `lib/tokens.css` `:root`

```css
:root {
  /* 블록 타입 악센트 (잠정 — #1 brainstorm 확정) */
  --color-od:  #c2410c; /* OD/BOOST/DST/FUZZ — 드라이브 계열 (주황) */
  --color-amp: #1d4ed8; /* AMP — 앰프 (파랑) */
  --color-cab: #6d28d9; /* CAB — 캐비닛/IR (보라) */
  --color-dly: #0e7490; /* DLY — 딜레이 (시안) */
  --color-rvb: #be185d; /* RVB — 리버브 (핑크) */
  --color-mod: #047857; /* MOD/FILTER/WAH/PITCH — 모듈레이션 (초록) */
  --color-util: #525252; /* NR/COMP/EQ/VOL — 유틸 (회색) */

  /* 표면·텍스트 (고대비 기본) */
  --surface:    #fafaf9; /* 카드 표면 */
  --surface-2:  #ffffff; /* 노브 영역 */
  --text:       #1c1917; /* 본문/노브 값 — 표면 대비 ≥ 4.5:1 */
  --text-muted: #57534e; /* 보조 — 대비 ≥ 4.5:1 */
}
```

> 루브릭 예시는 `#f97316`(orange-500) 등 밝은 톤을 들었으나, 흰 배경 4.5:1을 못 넘긴다(ui-1.1 피드백 예시가 `#f97316 → #d97706` 하향을 명시). 그래서 위 기본값은 **명도를 낮춘 진한 톤**으로 잡아 텍스트/배지 대비를 선제적으로 통과시킨다.

### 제약(불변)

1. **타입 구분 명도차**: 인접 타입 색의 상대 명도(0.2126R+0.7152G+0.0722B 정규화) 차이 ≥ 20%. (ui-1.1)
2. **배지/보더 위 텍스트 대비** ≥ 4.5:1 (WCAG AA). 악센트 색을 배경으로 'A'/'B'·타입약어를 올릴 땐 텍스트 색을 흰/검 중 대비 통과하는 쪽으로 자동 선택. (ui-1.1, cross-5.1)
3. **타입 → 색 매핑은 1곳**(`lib/tokens.css` + `lib/blockType.ts`)에서만 정의. 컴포넌트는 `data-type` 속성으로 토큰을 참조(`.block[data-type="OD"]{--c:var(--color-od)}`). 하드코딩 금지.
4. **색만으로 의미 전달 금지** — 타입은 색 + **타입 약어 텍스트**(OD/AMP/CAB/DLY/RVB…) 병기. (edge-3.11)

타입 → 토큰 그룹 매핑:

| 타입 | 토큰 |
|------|------|
| `OD` `BOOST` `DST` `FUZZ` | `--color-od` |
| `AMP` | `--color-amp` |
| `CAB` | `--color-cab` |
| `DLY` | `--color-dly` |
| `RVB` | `--color-rvb` |
| `MOD` `FILTER` `WAH` `PITCH` | `--color-mod` |
| `NR` `COMP` `EQ` `VOL` | `--color-util` |

---

## 2. 노브 렌더 형식

파서 출력 `knob = { name, value, unit? }` 를 화면 텍스트로 변환하는 **순수 함수**(`lib/renderKnob.ts`). 루브릭 ui-1.6 / data-2.2 의 권위 규칙.

```ts
type KnobRender = {
  name: string;   // 'Gain', 'Time', 'Pre Delay'
  value: number;  // 5.5, 120, 0.8
  unit?: string;  // 'ms' | 's' | '%' | 'Hz' | 'kHz'
  scale?: "0-10" | "0-100"; // unit 없을 때만 (선택). 기본 0-10.
};
```

### 표기 규칙 (불변)

| 조건 | 출력 예 |
|------|---------|
| `unit` 있음 | `Time: 120ms` · `Feedback: 15%` · `Decay: 0.8s` |
| `unit` 없음 + scale 0-10(기본) | `Gain: 5.5 (0–10)` |
| `unit` 없음 + scale 0-100 | `Level: 55 (0–100)` |

- `name`·`value` 는 **항상** 표시. 단위 있으면 단위, 없으면 스케일 범위를 **반드시** 병기(모호 표기 금지 — tone-builder 규칙과 동일).
- 부동소수점은 md 원본 자릿수를 **반올림/절삭 없이** 유지(±0.01만 허용). `5.5`→`5.5`, `0.8`→`0.8`. (data-2.10)
- `unit` 과 값 사이 공백 없음(`120ms`), 스케일은 값 뒤 공백+괄호(`5.5 (0–10)`). 대시는 `–`(en dash).
- `knobs=[]`(예: IR-only CAB)면 노브 영역에 "노브 없음" 명시 또는 빈 영역 깔끔하게 — crash 0. (data-2.6, edge-3.3)
- `enabled=false` 블록의 노브 값도 **전부 표시**(읽기 전용, 데이터 손실 금지). 흐리게는 가능. (data-2.5)

---

## 3. 상태 스타일 (enabled / disabled)

```css
/* enabled=true: 기본 */
.block { opacity: 1; filter: none; }

/* enabled=false: 비활성 — 색 + 다중 신호 */
.block[data-enabled="false"] {
  opacity: 0.30;            /* enabled 대비 ≥ 50%p 차이 (ui-1.3) */
  filter: grayscale(0.6);   /* 채도 제거 (ui-1.3, edge-3.11) */
}
```

### 제약 (불변)

- enabled=true 대 false 의 **opacity 차이 ≥ 50%p** + **grayscale 적용**. (ui-1.3)
- 상태를 **색만으로 구분 금지** — opacity·grayscale + 텍스트 상태 라벨('OFF'/'기본 OFF') + `aria-disabled` 까지 다중 신호. 색맹 모드(grayscale 시뮬)에서도 구분 가능해야. (edge-3.11)
- 모든 타입(OD/AMP/CAB/DLY/RVB…)에서 disabled 렌더가 동일하게 동작. (edge-3.4)

---

## 4. 풋스위치 (footswitch / switching)

### 4.1 블록 배지

- `footswitch` 값이 `'A'`/`'B'` 인 블록은 **우상단에 ≥12px 배지** — 텍스트 'A'/'B'(+ 선택적 아이콘). 배경은 악센트 색, 텍스트는 대비 통과 색. (ui-1.5, fs-4.1)
- `footswitch` 없는 블록은 배지 영역 **clean**(빈 배지/플레이스홀더 금지). (fs-4.1)
- `aria-label="CTRL A 풋스위치로 토글"` 등 스크린리더 라벨 필수. (fs-4.9)

### 4.2 그룹화

- 같은 풋스위치(A)에 묶인 블록들(예: TS-808 + Slapback)은 **같은 색/섹션/클래스로 시각 그룹화** — 배지만으로 끝내지 않는다. (fs-4.3)
- enabled(기본 ON/OFF) 상태와 footswitch(토글 할당)는 **시각적으로 구분**. `enabled=false + footswitch:A`(기본 꺼짐, A로 켬) 와 `enabled=true + 무스위치`(항상 켜짐)가 헷갈리면 안 됨. (fs-4.4)

### 4.3 switching 플랜 섹션

`switching:` 한 줄(JSON 객체)을 파싱한 메타필드. signal_chain 과 **구분된 섹션**(heading 명시: "스위칭 플랜" 등)에 표시. pickup 필드와도 분리. (fs-4.6, fs-4.8)

파서가 산출하는 형식 (불변):

```ts
type SwitchingPlan = {
  A?: { description: string; blockModels: string[] };
  B?: { description: string; blockModels: string[] };
};
// 예: { A: { description: "솔로 — TS-808 + Slapback ON",
//            blockModels: ["TS-808", "Slapback"] } }
```

- `description` 은 md `switching:` 의 값 그대로(사람이 쓴 설명).
- `blockModels` 는 파서가 **자동 추출**: 해당 변주의 signal_chain 에서 `footswitch` 가 그 키(A/B)인 블록들의 `model` 목록. UI 는 "(N개: TS-808, Slapback)" 형식으로 개수·모델 병기. (fs-4.10)
- description 에 언급된 모델명이 실제 signal_chain 블록과 일치하는지 파서가 검증(미스매치는 경고). (fs-4.2)
- 변주마다 switching 이 다를 수 있음 — 탭 전환 시 독립 재렌더, 데이터 혼합 0. (fs-4.7)

---

## 5. 컴포넌트 ↔ 토큰 책임

| 관심사 | 단일 출처 |
|--------|-----------|
| 타입↔색 매핑 | `lib/tokens.css`(:root 변수) + `lib/blockType.ts`(타입→그룹) |
| 노브 텍스트 변환 | `lib/renderKnob.ts` (순수 함수, 유닛 테스트 대상) |
| switching 추출·검증 | `lib/parser/`(빌드 타임) → 타입 상수 |
| 상태/배지 스타일 | `components/block/block.module.css` (data-속성 기반) |

컴포넌트는 인라인 색/형식 하드코딩 없이 위 출처만 참조한다(DRY·web 토큰 규칙).
