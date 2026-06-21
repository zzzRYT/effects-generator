# 설계 — signal-chain-view (트랙2 사이클 #1)

**확정일:** 2026-06-21
**brainstorm:** `/superpowers:brainstorm signal-chain-view`
**선행:** 사이클 #0 `patch-parser` 완료 — `PATCHES` 타입 상수 준비됨.
**소비 계약:** `docs/data-contract-ui.md` (불변 제약), `docs/verification-rubric.md` (QA 기준).

곡별 패치(`PATCHES` 상수)를 **GP-150 기계 패널처럼** 보여주는 범용 블록-체인 렌더러.
`block.type`만 보고 그린다(타입별 분기 컴포넌트 없음).

---

## 확정 결정 (brainstorm)

1. **스코프**: `/songs/[slug]` 정적 라우트 + 그 곡의 **모든 변주를 세로로 나열**.
   변주 비교 탭/나란히 보기는 #2(variation-compare)로 분리. 곡 목록/검색은 #3.
2. **비주얼 방향**: **기계 패널 리얼리즘** — 다크 베이스, 블록=하드웨어 슬롯,
   가로 시그널 흐름, LED 점등, 금속 베젤.
3. **노브 렌더**: **LCD 텍스트 셀만**(다이얼 없음). 기계감은 패널/폰트/LED가 낸다.
   → 단위 노브(640ms 등)의 "거짓 각도" 문제 원천 차단. 모든 노브 동일 취급.
4. **테마**: 다크 단일(테마 토글 없음).

---

## 섹션 1 — 아키텍처 & 컴포넌트

### 라우트 (`web/app/songs/[slug]/`)
- `page.tsx` — `generateStaticParams()`가 `PATCHES`에서 모든 slug → **SSG**(런타임 0).
  slug로 곡을 찾아 `<SongDetail>`. 못 찾으면 `notFound()`. 빌드 산출물 전부 `○ Static`.

### 컴포넌트 (feature 폴더)
```
components/
  song-detail/
    SongDetail.tsx       # 곡 헤더(아티스트·제목·rig·confidence) + 변주 세로 나열
    VariationPanel.tsx   # 변주 1개 = LCD 라벨 + 시그널 체인 + 스위칭 플랜
  signal-chain/
    SignalChain.tsx      # block[] → 가로 흐름(블록 사이 커넥터). block.type만 보고 렌더
    BlockModule.tsx      # 블록 1개 = 헤더(타입 배지+모델+LED+풋스위치) + 노브 격자
    KnobGrid.tsx         # knobs[] → LCD 셀. renderKnob() 텍스트
    SwitchingPlan.tsx    # switching 메타 → 별도 "스위칭 플랜" 섹션
  ui/
    TypeBadge.tsx        # data-type 기반 악센트 색 배지 + 약어 텍스트 병기
```

### 핵심 원칙
- `SignalChain`은 `block.type`만 보고 그린다. 색/약어는 `lib/blockType.ts` + `lib/tokens.css`
  단일 출처를 `data-type` 속성으로 참조. 하드코딩 금지.
- `lib/renderKnob.ts`(#0에서 연기) 를 **여기서 구현** — data-contract §2 그대로, 순수 함수.
- 전 컴포넌트 presentational(순수). 데이터는 빌드 상수 → props. 클라이언트 상태·페치 0.

---

## 섹션 2 — 비주얼 시스템 (다크 패널 토큰)

`data-contract-ui.md` 기본 토큰은 라이트 기준 → 다크 하드웨어로 재조정.
불변 제약(타입 명도차 ≥20%, 배지 텍스트 대비 ≥4.5:1)은 그대로 통과.

```css
/* 표면/텍스트 */
--panel:     #16161a;  /* 유닛 본체 */
--panel-2:   #1e1e24;  /* 블록 모듈 표면 */
--lcd:       #0c1410;  /* LCD 노브 격자 배경(녹청 틴트) */
--lcd-text:  #b6f0c8;  /* LCD 수치 인광 녹색, 대비 ≥7:1 */
--text:      #e7e5e4;
--text-muted:#a8a29e;  /* 대비 ≥4.5:1 */
--led-on:    #4ade80;

/* 타입 악센트(다크 위 발광 — 인접 명도차 ≥20%) */
--color-od:  #fb923c; --color-amp: #60a5fa; --color-cab: #a78bfa;
--color-dly: #22d3ee; --color-rvb: #f472b6; --color-mod: #34d399;
--color-util:#a8a29e;
```

### 기계감 디테일 (장식 — 의미 전달은 텍스트가 담당)
- 블록 모듈: inset box-shadow 베젤 + 상단 1px 하이라이트. radius 4px.
- LED: enabled=true 점등(glow), false 소등. **상태는 LED만이 아니라** opacity 0.30 +
  grayscale + 'OFF' 라벨로 다중 신호(§3).
- 커넥터 `→`: 블록 사이 케이블 느낌의 가는 선/화살표.
- 폰트: 라벨 시스템 산세리프, **LCD 수치만 등폭**. 두 패밀리 이내.
- compositor-friendly만(transform/opacity). will-change 좁게.

### 검증
확정 색은 `lib/tokens.css`에 박고, 대비/명도차를 계산하는 `tokens.test.ts`로 자동 검사.

---

## 섹션 3 — 데이터 흐름 · 상태 · 풋스위치

### 흐름 (빌드 타임 → props, 런타임 0)
```
PATCHES → page.tsx(slug 매칭) → SongDetail
  → variations.map → VariationPanel
      ├ signalChain[] → SignalChain → BlockModule × N → KnobGrid → renderKnob()
      └ switching → SwitchingPlan
```

### 상태 렌더 (data-contract §3, 불변)
- `enabled=false`: opacity 0.30 + grayscale(0.6) + LED 소등 + 'OFF' 라벨 + `aria-disabled`.
- enabled=false 블록도 **노브 값 전부 표시**(읽기 전용, 손실 0). 흐리게만.
- `knobs=[]`(IR-only CAB): "노브 없음" 명시, crash 0.

### 풋스위치 (data-contract §4)
- `footswitch:'A'|'B'`: 우상단 ≥12px 배지(악센트 배경 + 대비 통과 텍스트) +
  `aria-label="CTRL A 풋스위치로 토글"`. 없으면 배지 영역 clean.
- **그룹 시각화**: 같은 키 블록을 같은 색조 테두리로 묶음(배지만으로 끝내지 않음).
- `enabled=false + footswitch:A`(기본 꺼짐, A로 켬) vs `enabled=true + 무스위치`(항상 켜짐) 명확 구분.

### 스위칭 플랜 섹션
- signal_chain과 **분리된** "스위칭 플랜" heading. A/B 각각 description + blockModels를
  `(N개: TS-808, Slapback)` 형식으로 병기. pickup은 별도 줄.
- 변주마다 독립 — 각 VariationPanel이 자기 switching만, 혼합 0.

### 안전망
알 수 없는 block.type → util 회색 폴백 + 약어 텍스트, crash 0(방어적).

---

## 섹션 4 — 테스트 & 검증

### 유닛 (vitest, 커버리지 80%+ 게이트)
- `lib/renderKnob.test.ts` — §2 표기 테이블 전부: 단위 있음/없음(0–10,0–100), 부동소수 보존,
  en dash, 공백 규칙, `knobs=[]`.
- `lib/blockType.test.ts` — 타입→토큰 매핑 전 케이스 + 미지 타입 폴백.
- `lib/tokens.test.ts` — 불변 제약 자동: 인접 명도차 ≥20%, 배지 대비 ≥4.5:1(흰/검 자동선택), LCD 대비.

### 비주얼 회귀 (Playwright, 320/768/1024/1440)
- 선행 `npx playwright install`.
- 오아시스 라우트: 정상 변주 / enabled=false 포함 / 풋스위치 그룹 변주.
- 접근성: 키보드 내비, aria-disabled/aria-label, reduced-motion.
- 다크 단일 테마 → 테마 토글 테스트 불필요.

### QA 루프 (web-harness 게이트)
`docs/verification-rubric.md` ui-1.x/data-2.x/fs-4.x/edge-3.x/cross-5.x 채점 →
목적 달성까지 loop-until-pass(최대 5회). 매 편집 후 lint+tsgo, 커밋 직전 tsc 풀 검증.

### 산출물
- 이 설계 문서 / PRD(`docs/prd/signal-chain-view.md`) / TRD(`docs/trd/signal-chain-view.md`) / 복기(`docs/reviews/signal-chain-view.md`).
