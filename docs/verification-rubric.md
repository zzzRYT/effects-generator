# 웹 톤 뷰어 검증 루브릭 (최종본)

## 검증 철학

이 루브릭은 Cort G250 + Valeton GP-150 멀티이펙터 톤 라이브러리의 웹 뷰어(Next.js 정적 사이트)가 5개 검증 목적의 임계값에 도달할 때까지 **반복(loop-until-pass)** 검증하도록 설계됐다.

### 루프의 원칙

1. **정량화된 기준**: 측정 불가능한 기준은 없다. 각 기준은 자동화 가능(Vitest/Playwright) 또는 구체적 인공 기준(시뮬레이션, 픽셀 diff, axe 점수)을 포함한다.
2. **0~5 스코어링**: 각 기준을 독립적으로 측정. 임계 미달 기준이 하나라도 있으면 해당 목적 재검증.
3. **구조화된 피드백**: 실패 시 "기준 ID → 검증 결과 → 수정 제안 → 재검증 방법"으로 피드백.
4. **최대 5회 반복**: 같은 기준이 3회 이상 지적되거나 5회 후에도 임계 미달 시 아키텍처 리뷰/에스컬레이션.
5. **에이전트 역할 명확화**:
   - **gan-evaluator**: Vitest/Playwright 스크립트 자동 실행 → 스코어 계산 → 구조화 피드백 생성.
   - **gan-generator**: 피드백 수령 → TDD(테스트 먼저) → 구현 → 커밋.

---

## 데이터 계약 사전 정의 (필수)

웹 부트스트랩 전에 다음 사항을 `docs/data-contract-ui.md`로 명시해야 함:

### Parser Output 표준

```typescript
// knob 렌더 형식
type KnobRender = {
  name: string;           // 'Gain', 'Time' 등
  value: number;          // 5.5, 120
  unit?: string;          // 'ms', '%', 's' (없으면 0–10 또는 0–100 범위)
  scale?: '0-10' | '0-100';  // unit 없을 때만 명시 (선택)
};

// 렌더 함수 출력 예시
// - unit='ms' 있음: "Time: 120ms"
// - unit='%' 있음: "Feedback: 15%"
// - unit 없음 & scale='0-10': "Gain: 5.5 (0–10)"
// - unit 없음 & scale='0-100': "Level: 55 (0–100)"
```

### Footswitch 메타필드 JSON 형식

```typescript
type SwitchingPlan = {
  A?: {
    description: string;  // '솔로 — TS-808 + Slapback ON'
    blockModels: string[]; // ['TS-808', 'Slapback'] (자동 추출, 파서가 검증)
  };
  B?: {
    description: string;
    blockModels: string[];
  };
};
```

### UI 색상·상태 스타일 명시

```css
/* 블록 타입별 색상 */
--color-od: #f97316;    /* Orange-500 */
--color-amp: #3b82f6;   /* Blue-500 */
--color-cab: #8b5cf6;   /* Violet-500 */
--color-dly: #06b6d4;   /* Cyan-500 */
--color-rvb: #ec4899;   /* Pink-500 */

/* 상태별 스타일 */
/* enabled=true: 100% opacity, full color */
/* enabled=false: 30% opacity, desaturate, grayscale() CSS filter */
```

---

## 목적별 검증 기준 (최종)

### 목적 1: 신호 체인 시각화 명확성

**의도**: signal_chain이 기계 화면처럼 명확하게 렌더링되고, 블록 타입·신호 흐름·상태가 한눈에 인식됨.

| 기준 ID | 기준명 | 검증 방법 | 임계치 | 점수 산정 |
|---------|--------|---------|--------|---------|
| ui-1.1-block-type-color-contrast | 각 블록 타입(OD/AMP/CAB/DLY/RVB) 색상이 WCAG AA 4.5:1 이상 대비 + 배경 구분 명도 ≥20% | Playwright: 스냅샷 RGB 픽셀 추출 → 명도 공식(0.2126R+0.7152G+0.0722B) → 비율 계산. axe DevTools 자동 스캔 | axe violations=0 + 명도 비율 모두 ≥4.5:1 | 5점: 전부 통과 / 4점: 1개 타입 미달 / 3점: 2개 미달 |
| ui-1.2-signal-flow-left-to-right | signal_chain DOM 노드 순서 = 배열 순서 + 시각 배치가 수평 흐름(좌→우) 또는 수직 스택(위→아래) 일관성 유지 | Vitest: DOM 트리 순회 → block 정렬 순서 검증. Playwright: 각 breakpoint(320/768/1024/1440)에서 block element bounding box X좌표 증가 or Y좌표 증가 일관성 | 모든 block DOM 순서 배열과 100% 일치 + 시각 배치 축 일관성 | 5점: 완전 일치 / 3점: 한 breakpoint 미달 |
| ui-1.3-enabled-state-opacity | enabled=false 블록의 opacity ≤40% (enabled=true 100%) + 회색톤 필터(grayscale 50%) 적용. 식별 불가 색상 혼합 금지 | Playwright: computed style 추출 → filter/opacity 값 확인. 스냅샷: enabled=true vs false 나란히 배치, 시각 밝기 차이 수치화(픽셀 평균 명도) | opacity 차이 ≥50%점 + grayscale/desaturate 적용 확인 | 5점: 모두 적용 / 3점: 일부만 적용 |
| ui-1.4-block-label-render | 각 block의 type 이름(예: 'TS-808(OD)') + enabled 상태 + footswitch 라벨이 동시 표시 | Vitest: block label 텍스트 노드가 model 이름 + type abbr(OD/AMP/CAB/DLY/RVB) 포함 확인. Playwright: 모든 block 영역 텍스트 추출 → pattern 매칭 | 모든 block label이 3개 정보(model/type/state) 포함 + 누락 0개 | 5점: 100% / 4점: 95% 이상 |
| ui-1.5-footswitch-badge-visual | footswitch:A 또는 B인 블록에 우상단에 12px 배지(배경색 명도 ≥20% 컬러, 아이콘 또는 'A'/'B' 텍스트) 렌더. footswitch 없는 블록은 배지 영역 비어있거나 '없음' 표시 | Playwright: block 우상단 영역 스크린샷(각 breakpoint) → 배지 존재 검증. 텍스트 OCR 또는 aria-label 확인 | footswitch 있는 모든 block 배지 표시 + footswitch 없는 block은 배지 영역 clean | 5점: 완전 / 4점: 1~2개 block 미달 |
| ui-1.6-knob-name-value-unit-render | 각 block의 knobs 배열 항목이 모두 렌더. 표시 형식: `name: value unit` (unit 있을 때) 또는 `name: value (0–10)` (unit 없을 때) | Vitest: knob 맵 함수 → DOM에 name+value 텍스트 노드 존재 확인. Playwright: knob 영역 텍스트 추출 → regex 'name:\\s*[0-9.]+\\s*(unit)?'로 포맷 검증 | 모든 knob이 (name+value) 렌더 + unit/scale 표기 누락 0개 | 5점: 100% 일치 / 3점: 90% 이상 |
| ui-1.7-knob-text-mobile-no-clip | 모든 breakpoint(320/375/768/1024/1440)에서 knob 텍스트가 잘려나가지 않으며, 최소 font-size 12px 유지 | Playwright: 각 breakpoint에서 block 영역 스크린샷 → 텍스트 경계 detect → clipping 확인. computed style font-size ≥12px 검증 | 5개 breakpoint 모두 클리핑=0 + font-size ≥12px | 5점: 완전 / 3점: 1개 breakpoint 미달 |
| ui-1.8-variation-tab-render | 변주 1개 이상일 때 탭/드롭다운 UI 표시. 각 탭 선택 시 signal_chain 재렌더링 성공(에러=0) | Playwright E2E: variation 3개 패치 로드 → 탭 3개 표시 확인 → 각 탭 클릭 → signal_chain 재렌더 확인 → console 에러 없음 | 탭 UI 표시 + 3회 탭 전환 모두 성공 + 콘솔 에러=0 | 5점: 완전 / 2점: 탭 표시만 하고 전환 에러 있음 |
| ui-1.9-amp-cab-visual-prominence | AMP와 CAB 블록이 다른 효과 블록보다 시각적 크기/강도 ≥20% 강함. 폰트 크기, 배경 크기, 또는 border 두께 측정 | Playwright: AMP/CAB vs OD/DLY 블록 영역의 font-size/padding/border-width 비교 → 계산(%) | AMP/CAB 모든 요소 ≥20% 강함(최소 3개 요소 중 2개) | 5점: 완전 / 3점: 부분 적용 |

**목적 1 통과 기준**: 9개 기준 평균 ≥4.0/5.0. 단, 기준 ui-1.1(색상 대비)은 필수 5점.

---

### 목적 2: 값 정확성·명확성 (파싱·렌더·데이터 일치)

**의도**: 모든 knob 값이 md → JSON → 화면에서 정확히 일치하고, 단위/스케일이 명확하며, 데이터 손실=0.

| 기준 ID | 기준명 | 검증 방법 | 임계치 | 점수 산정 |
|---------|--------|---------|--------|---------|
| data-2.1-parser-contract-knob-accuracy | 파서가 md signal_chain JSON을 정확히 추출. knob(name/value/unit) 필드 손실=0. 소수점 정밀도 ±0.01 허용 | Vitest: oasis 패치 md 파싱 → `patches.generated.ts` 타입 상수 → 각 knob 필드 일치 검증. 예: {name:'Gain', value:5.5} vs parsed {name:'Gain', value:5.50000001} 비교 (parseFloat 후 toFixed(2)) | 모든 knob 필드 100% 일치(소수점 2자리 반올림 후) | 5점: 완전 일치 / 0점: 필드 누락 또는 값 오류 |
| data-2.2-unit-rendering-consistency | knob.unit 있으면 ('ms'/'%'/'s' 등) 반드시 화면에 표시. unit 없으면 스케일 범위 명시 ('(0–10)' 또는 '(0–100)') | Vitest: unit 필드 조건문 검증. Playwright: 각 knob 텍스트 → regex 'value\\s+(ms|%|s|Hz)' (unit 있을 때) 또는 'value\\s*\\(0–1[0]0?\\)' (없을 때) | unit 있는 모든 knob 단위 표시 + unit 없는 모든 knob 스케일 표시 | 5점: 100% / 2점: 50% 미달 |
| data-2.3-footswitch-metadata-parse | switching 메타필드가 있으면, 파서가 A/B 키를 추출하고 해당 block들과 자동 매핑 | Vitest: JSON 형식 검증 (switching.A와 switching.B 구조). 각 blockModels 배열에 실제 signal_chain block이 존재하는지 확인 | switching 필드 있으면 파싱 성공 + blockModels 배열 검증 성공 + 미스매치=0 | 5점: 완전 / 0점: 필드 누락 또는 참조 오류 |
| data-2.4-markdown-json-screen-sync | 패치 md 줄글의 knob 설명 vs JSON 값 vs 화면 렌더가 일치. 예: 'Gain 설정 5.5' (md) ↔ {value: 5.5} (JSON) ↔ 'Gain: 5.5 (0–10)' (screen) | 수동 QA(자동화 어려움): oasis 패치 모든 변주의 knob 설명을 md에서 읽고, JSON과 화면과 비교. 체크리스트 작성 | md 줄글과 JSON 값 100% 일치 + 화면 렌더 정확 | 5점: 완전 일치 / 0점: 불일치 3개 이상 |
| data-2.5-disabled-block-values-display | enabled=false 블록의 knob 값도 화면에 표시(읽기 전용). 희미해도 data 손실 금지 | Playwright: enabled=false block의 knob 텍스트 추출 → 내용 존재 확인. computed style opacity ≤40%이나 텍스트 기록 완전 | enabled=false block의 knob 값 100% 표시 | 5점: 모두 표시 / 3점: 일부 생략 |
| data-2.6-empty-knobs-handling | CAB처럼 knobs=[] (빈 배열)일 때 crash 없이 정상 처리. '노브 설정 없음' 명시 또는 빈 영역 깔끔 | Vitest: knobs=[] block의 렌더 함수 → map() 실행 → 에러 0 + DOM 노드 생성(비어있어도). Playwright: CAB 블록 영역 스냅샷 → 깔끔한 상태 또는 '없음' 메시지 | map() 에러=0 + 렌더 성공 + UI 혼동=0 | 5점: 완전 처리 / 2점: 렌더만 하고 사용자 가이드 없음 |
| data-2.7-knob-value-range-validation | 모든 knob 값이 기대 범위 내(0–10 또는 0–100 또는 unit 범위). 극단값(0, 최대) 표기 형식 일관 | Vitest: value 필드 min/max 검증(schema via parser-contract). 극단값 테스트 케이스(value:0, value:10 등) | 범위 위반=0 + 극단값 형식 일관(모두 정수 또는 모두 소수점 2자리) | 5점: 완전 / 2점: 범위 위반 없으나 형식 불일관 |
| data-2.8-variation-data-independence | 같은 곡의 여러 변주 간 knob 값이 독립적(변주 A 수정이 변주 B에 영향 없음). 렌더 시 데이터 혼합=0 | Vitest: variations 배열의 각 항목이 독립적 signal_chain 참조 (객체 공유 아님). 심화: 변주 A 렌더 후 B 렌더 → 값 비교(B의 값 = B JSON, A영향 없음) | 모든 변주 데이터 독립적 + 렌더 순서 무관 | 5점: 완전 / 2점: 일부 참조 공유 |
| data-2.9-parser-contract-compliance | 빌드 타임 파서가 `docs/parser-contract.md`의 5가지 규칙을 코드로 구현. 위반 시 빌드 실패 + 명확한 에러 메시지 | npm run build: (1) 정상 패치 → success (exit 0). (2) frontmatter 누락 → error '파일:L1 frontmatter missing'. (3) signal_chain 없음 → error '파일:L10 signal_chain required'. (4) knob.value 숫자 아님 → error '파일:L25 knob.value must be number' | 정상 md 빌드 성공 + 오류 3가지 모두 빌드 실패 + 메시지 명확 | 5점: 완전 구현 / 2점: 부분 검증만 함 |
| data-2.10-floating-point-consistency | 모든 부동소수점(5.5, 6.5, 0.8) 값이 md → JSON → 화면에서 동일 자릿수로 표기. 반올림=0, 소수점 truncation=0 | Vitest: 부동소수점 배열 테스트 {5.5, 0.8, 6.234} → parsed → rendered 일치 확인. Playwright: 화면 텍스트 추출 → regex '[0-9]+\\.[0-9]{1,2}' 추출 후 md 원본과 비교 | 모든 부동소수점 자릿수 일치(±0.01 허용) | 5점: 완전 일치 / 2점: 일부 반올림/truncation |

**목적 2 통과 기준**: 10개 기준 평균 ≥4.0/5.0. 단, 기준 data-2.1(parser accuracy)과 data-2.9(compliance)는 필수 ≥4점.

---

### 목적 3: 엣지케이스 안정성 (반응형·파싱 견고성)

**의도**: 웹이 극단 조건(모바일, 긴 이름, 빈 배열, 검색 0결과, 장애 상황)에서 graceful하게 처리하고 가독성 유지.

| 기준 ID | 기준명 | 검증 방법 | 임계치 | 점수 산정 |
|---------|--------|---------|--------|---------|
| edge-3.1-responsive-no-overflow-5bp | 5개 breakpoint(320/375/768/1024/1440)에서 horizontal overflow 없음. `document.body.scrollWidth ≤ viewport width` | Playwright: 각 bp별 `page.evaluate(() => document.body.scrollWidth > window.innerWidth)` → false 확인. 스냅샷 시각 검증 | 5개 모두 overflow=false + 시각 클리핑=0 | 5점: 완전 / 3점: 1개 bp 미달 / 1점: 2개 이상 미달 |
| edge-3.2-long-model-name-wrap | 모델명 30+ 글자일 때 line wrap 또는 abbreviate. 극단 예시: 'Guitar EQ with Bass & Treble Shelving' (40글자) | Playwright: 모델명 테스트 패치(수동 생성) → 320px에서 스냅샷 → text overflow 없음 또는 tooltip 표시 | 모든 모델명 화면 fit + 가독성 유지 | 5점: wrap 적용 / 3점: 일부만 처리 |
| edge-3.3-empty-knobs-no-crash | knobs=[] (CAB, IR-only) block의 맵 함수가 에러 없이 실행. DOM 렌더도 깔끔 | Vitest: knobs.map() 호출 → 에러 log=0. Playwright: CAB 블록 표시 확인 | map 에러=0 + DOM 렌더 완료 | 5점: 완전 / 2점: 렌더는 하나 에러 로그 있음 |
| edge-3.4-disabled-state-render-all-types | 각 block type(OD/AMP/CAB/DLY/RVB)을 enabled=false로 설정했을 때 모두 정상 렌더(opacity/grayscale 적용) | Vitest: 각 type별 enabled=false mock data → 렌더 함수 → className/style 포함 확인. Playwright: 5개 type 모두 disabled 스냅샷 | 모든 type의 disabled 렌더 성공 + style 적용 | 5점: 완전 / 3점: 3개 이상 type 누락 |
| edge-3.5-extreme-knob-values | value=0, value=10, value=0.1, value=99.9 극단값이 정상 렌더되고 unit 표기 일관 | Vitest: 극단값 테스트 케이스 (0, 10, 0.1, 99.9) → 포맷 확인. Playwright: 스냅샷 텍스트 추출 → 정상 표기 확인 | 모든 극단값 렌더 성공 + format 일관 | 5점: 완전 / 3점: 1개 값 형식 이상 |
| edge-3.6-search-zero-results-ui | 검색 결과 0개 페이지가 '검색 결과 없음' 메시지 + 다시 시작 링크 표시. crash=0 | Playwright E2E: 검색창에 'zzzzzzzz' 입력 → 0 결과 페이지 로드 → 메시지 표시 + 링크 클릭 가능 확인 | 0결과 페이지 렌더 성공 + 메시지 + 복구 경로 존재 | 5점: 완전 / 3점: 메시지만 있고 복구 경로 없음 |
| edge-3.7-keyboard-tab-order-logical | Tab 키로 모든 상호작용 요소(탭, 포커스 가능 영역) 순환. focus ring 보임. | Playwright a11y: Tab 순서 트레이스 → 시각 순서와 일치 확인. :focus-visible 대비 ≥4.5:1 | Tab 순서 논리적 + focus ring 명확 + 순환 에러=0 | 5점: 완전 / 2점: focus ring 없거나 순서 혼란 |
| edge-3.8-variation-count-flexible | 변주 1개, 2개, 3개, 5개 패치에서 모두 정상 렌더. 탭 UI overflow 처리 | 테스트 패치 생성(variation 개수별) → Playwright: 각각 로드 → 탭 overflow/scroll 처리 확인 | 모든 변주 개수 렌더 성공 + UI 오버플로 처리 | 5점: 모두 처리 / 3점: 5개 이상에서 오버플로 미처리 |
| edge-3.9-signal-chain-length-extremes | 블록 1개, 5개, 10개 패치에서 모두 정상. 레이아웃 collapse=0 | 테스트 패치(block 개수별) → Playwright: 각 bp에서 스냅샷 → 레이아웃 깨짐=0 | 모든 block 개수 정상 렌더 + 레이아웃 무결 | 5점: 완전 / 2점: 10개 이상에서 오버플로 |
| edge-3.10-malformed-json-build-fail | 빌드 타임에 malformed signal_chain JSON 감지 → 빌드 실패 + 명확한 에러(파일명, 행번호, 문제 설명) | Integration test: 잘못된 JSON (중괄호 누락, 콤마 오류 등) md 생성 → npm run build → exit code ≠0 + 에러 메시지 명확 | malformed JSON 100% catch + 메시지 ≥3줄(파일, 행, 원인) | 5점: 완전 / 2점: catch하나 메시지 모호 |
| edge-3.11-a11y-color-only-not-sufficient | 접근성: 활성화/비활성화 상태를 색상만으로 구분 금지. 추가 신호 필요(아이콘, 텍스트, opacity, 패턴) | axe DevTools + 수동: color-only 시뮬레이션(desaturate 이미지) → block 상태 식별 가능한가. aria-disabled 또는 텍스트 label 필요 | axe color-contrast violations=0 + 색맹 모드(grayscale 필터)에서도 상태 구분 가능 | 5점: 다중 신호 적용 / 2점: 색상+opacity만 적용 |

**목적 3 통과 기준**: 11개 기준 평균 ≥3.5/5.0 (변수 많음을 고려한 낮춘 임계). 단, edge-3.1(responsive), edge-3.10(build fail)은 필수 ≥4점.

---

### 목적 4: 풋스위치 전환 명확성

**의도**: 웹이 GP-150의 CTRL A/B 토글을 시각적으로 명확히 표현하여, 사용자가 화면만 보고 어느 블록이 어느 풋스위치로 켜지는지 이해 가능.

| 기준 ID | 기준명 | 검증 방법 | 임계치 | 점수 산정 |
|---------|--------|---------|--------|---------|
| fs-4.1-badge-render-all-types | footswitch:A 또는 B인 모든 block에 배지(텍스트 'A'/'B' 또는 아이콘) 렌더. footswitch 없는 block은 배지 영역 clean | Playwright: 각 block의 우상단 영역 스냅샷 → 배지 존재 여부 확인(OCR 또는 aria-label text). oasis 패치 적용 | footswitch 있는 모든 block 배지 표시 + footswitch 없는 block 배지=0 | 5점: 100% / 3점: 95% 이상 |
| fs-4.2-switching-description-accurate | switching 메타필드 설명(예: '솔로 — TS-808 + Slapback ON')이 웹에 정확히 표시되고, 포함된 블록 모델명과 signal_chain 일치 | Playwright: 페이지에서 switching 텍스트 영역 찾음 → 포함된 블록명(TS-808, Slapback) 추출 → signal_chain과 비교 | switching 설명이 정확히 렌더 + 포함 블록명 100% 일치 | 5점: 완전 일치 / 2점: 텍스트만 렌더되고 검증 미시행 |
| fs-4.3-footswitch-block-grouping | 같은 footswitch(A)에 여러 블록(TS-808, Slapback)이 할당되면, UI에서 같은 색상/섹션으로 시각적 그룹화 | Playwright: footswitch:A 블록들의 배경색/border/section 요소 비교 → 같은 그룹임을 시각적으로 구분 | 같은 footswitch block들이 시각적 그룹 마킹(색상, 섹션, class name) | 5점: 명확한 그룹화 / 3점: 배지만 있고 그룹 시각 없음 |
| fs-4.4-enabled-vs-footswitch-distinction | enabled(기본 ON/OFF) 상태와 footswitch(토글 할당) 상태를 시각적으로 명확히 구분. enabled=false+footswitch:A와 enabled=true+no-switch를 헷갈리지 않게 | Playwright: 예시 block 쌍 스냅샷 (enabled:false+A vs enabled:true+none) → 상태 명확 구분 확인 | 두 상태가 UI에서 100% 구분 가능 (색상/opacity/아이콘 조합) | 5점: 완전 구분 / 2점: 색상이 겹침 |
| fs-4.5-footswitch-knob-independence | footswitch 표시(배지)와 knob 값 표시가 섞이지 않고 독립적 배치. 극단 예: 블록 너비 320px에서도 knob 3개+footswitch 라벨이 한 행에 fit 또는 wrap 구분됨 | Playwright: 320px block 영역 스냅샷 → 배지 위치(우상단) + knob 위치(하단) 명확 분리 | footswitch와 knob 영역 visual separation clear | 5점: 완전 분리 / 3점: 겹침 없으나 여백 부족 |
| fs-4.6-switching-plan-section-location | switching 플랜(A/B 설명)이 signal_chain과 구분된 명확한 섹션에 표시(예: 헤더 아래, 또는 변주 카드 상단). 이름('스위칭 플랜', 'Footswitch Plan' 등) 명시 | Playwright: 페이지 구조 확인 → switching 섹션의 위치, heading(h2/h3), aria-label 존재 확인 | switching 섹션이 명확히 구분(heading + 위치) + 라벨 명시 | 5점: heading + 명확 배치 / 3점: 섹션 있으나 라벨 없음 |
| fs-4.7-variation-switching-independent | 같은 곡의 여러 변주 간 switching이 다를 때(변주 A: 'A만 ON' vs 변주 B: 'A/B 모두'), 탭 전환 시 switching 플랜 재렌더링 정확 + 혼동=0 | Playwright E2E: 변주 탭 전환 → 각 switching 섹션 내용 비교(다름을 확인) → 탭 역행(A→B→A) 후 원래 switching 복구 확인 | 각 변주의 switching이 독립적 렌더 + 탭 전환 성공 | 5점: 완전 독립적 / 2점: 탭 전환은 하나 데이터 혼합 우려 |
| fs-4.8-pickup-switching-separation | pickup 메타필드(픽업 선택, 예: '브릿지 험버커 포지션 1')와 switching(풋스위치) 필드가 UI에서 명확히 분리 표시 | Playwright: 변주 카드에서 pickup과 switching 섹션 찾음 → 별도 heading 또는 색상/여백 분리 확인 | pickup과 switching이 시각적/구조적으로 분리(heading/섹션 또는 색상) | 5점: 완전 분리 + 라벨 / 3점: 위치상 분리만 됨 |
| fs-4.9-a11y-aria-labels-footswitch | 시각 장애 사용자도 스크린리더로 footswitch 정보 이해. aria-label='CTRL A footswitch' 또는 aria-describedby로 설명 연결 | axe DevTools: aria 속성 검증. 수동 스크린리더(VoiceOver/NVDA): footswitch 배지 음성 읽음 → 'A footswitch' 명확히 들림 | axe violations=0 + 스크린리더로 footswitch 정보 100% 이해 가능 | 5점: aria 속성 완벽 / 2점: 시각적만 표현되고 aria 누락 |
| fs-4.10-footswitch-block-count-accuracy | 파서가 각 footswitch(A/B)에 할당된 블록 개수·타입을 정확히 추출. UI에서 '(N개 이펙트: 블록1, 블록2)' 형식으로 명시 | Vitest: switchingPlan.A.blockModels 배열 길이 + 각 항목 == signal_chain 내 footswitch:A인 block 개수·타입 일치 확인 | 모든 footswitch별 block 개수·타입 100% 정합 | 5점: 완전 / 2점: 개수만 맞고 타입 검증 미시행 |

**목적 4 통과 기준**: 10개 기준 평균 ≥4.0/5.0. 단, 기준 fs-4.1(badge render)과 fs-4.2(description accurate)는 필수 ≥4점.

---

### 목적 5: 교차 품질 (접근성·성능·비주얼 회귀)

**의도**: 웹이 WCAG AA·Core Web Vitals·스냅샷 일관성을 충족하고, 키보드·스크린리더·느린 네트워크·밝은 환경에서 견고.

| 기준 ID | 기준명 | 검증 방법 | 임계치 | 점수 산정 |
|---------|--------|---------|--------|---------|
| cross-5.1-wcag-aa-color-contrast | 모든 텍스트(body, label, knob 값)가 배경에 대해 WCAG AA 4.5:1 이상 대비 | axe DevTools + Playwright color contrast 계산(공식: (L1+0.05)/(L2+0.05)) | axe violations(contrast)=0 + 모든 텍스트 명도 비율 ≥4.5:1 | 5점: 완전 / 2점: 1~2개 요소 미달 |
| cross-5.2-wcag-a-keyboard-nav | 모든 상호작용(탭, 링크, 포커스 가능) Tab으로 순환 가능. focus ring 대비 ≥4.5:1 또는 시각적 명확 | Playwright a11y: Tab 순서 트레이스 + :focus-visible 스타일 대비 측정. 순환 에러=0 | Tab 순환 완전 + focus ring 대비 ≥4.5:1 또는 다른 시각 신호 | 5점: 완전 / 2점: focus ring 약함 |
| cross-5.3-wcag-a-semantic-html | 시맨틱 HTML 사용(section, article, nav, button, label 등). landmark 올바름. 아이콘 전용 버튼에 aria-label | DOM 검사: section/article/nav 비율 ≥80%. button 요소에 aria-label. input에 label 연결 확인 | landmark 올바름 + 모든 아이콘 버튼에 aria-label + input-label 연결 | 5점: 완전 / 2점: 일부 generic div 사용 |
| cross-5.4-wcag-aaa-reduced-motion | prefers-reduced-motion: reduce 활성 시 animation duration ≤0.1s(즉시) 또는 animation: none. 기능성 변화 없음 | Playwright: emulateMedia({reducedMotion:'reduce'}) → 각 animated 요소 computed style animation-duration 확인 → 값 ≤100ms 또는 'none' | prefers-reduced-motion 활성 후 animation 즉시(≤100ms) + 기능 변화=0 | 5점: 완전 / 2점: animation 남아있음 |
| cross-5.5-performance-lcp-2.5s | 오아시스 곡 상세(signal_chain 5블록 + 3변주)의 Largest Contentful Paint <2.5초 (3G Slow 기준) | Lighthouse (Playwright after networkidle) 또는 WebVitals PerformanceObserver. 3G Slow throttle 적용 | LCP ≤2.5s (Lighthouse score ≥85) | 5점: <2.0s / 4점: 2.0–2.5s / 2점: 2.5–3.0s |
| cross-5.6-performance-inp-200ms | 모든 상호작용(탭 클릭, 포커스)의 Interaction to Next Paint <200ms | Lighthouse INP metric 또는 interaction 수동 측정(performance.measure) | INP ≤200ms (Lighthouse score ≥90) | 5점: <100ms / 4점: 100–200ms / 2점: 200–300ms |
| cross-5.7-performance-cls-0.1 | Cumulative Layout Shift <0.1. 블록 추가/제거·이미지 로드로 인한 예기치 못한 시프트=0 | Lighthouse CLS metric. Playwright: 변주 탭 전환 후 layout 측정 → 시프트 추적 | CLS ≤0.1 (Lighthouse score ≥90) | 5점: <0.05 / 4점: 0.05–0.1 / 2점: 0.1–0.15 |
| cross-5.8-bundle-size-limits | 정적 빌드 JS 번들 <150kb gzipped, CSS <30kb gzipped (landing 기준) | npm run build → 빌드 산출물 분석(esbuild analyze, webpack-bundle-analyzer 등) | JS ≤150kb + CSS ≤30kb (gzipped) | 5점: JS<100kb, CSS<20kb / 4점: JS 100–150, CSS 20–30 |
| cross-5.9-visual-regression-snapshots | 주요 상태(OD, AMP, CAB, DLY, RVB 각각, enabled/disabled)의 Playwright 스냅샷이 일관(±2% 이미지 diff 허용) | Playwright snapshot test: 6개 block type × 2상태 = 12개 스냅샷. 각 breakpoint(320/768/1024/1440) 별도 | 4개 breakpoint 모두 스냅샷 일치(±2% pixel diff) + regression=0 | 5점: 완전 일치 / 3점: 1개 bp 미달 |
| cross-5.10-mobile-375-readability | 모바일(375px) 디바이스에서 signal_chain과 knob 값이 읽기 쉬움(font-size ≥12px, line-height ≥1.4, contrast ≥4.5:1) | Playwright: 375px viewport → computed style font-size/line-height 확인. 텍스트 스냅샷 시각 검증(큰 글자?) | font-size ≥12px + line-height ≥1.4 + contrast ≥4.5:1 | 5점: 모두 충족 / 2점: 1~2개 미달 |

**목적 5 통과 기준**: 10개 기준 평균 ≥4.0/5.0. 단, 기준 cross-5.1(contrast), cross-5.5(LCP), cross-5.7(CLS)은 필수 ≥4점.

---

## Loop-until-Pass 메커니즘

### 사이클 흐름

```
[검증 사이클 시작]
  ↓
[자동 검사 실행: Vitest, Playwright, axe, Lighthouse 스크립트 → 각 기준별 점수 계산]
  ↓
[수동 검증: oasis 패치 3변주 전수 확인 + 데이터 삼각검증]
  ↓
[5개 목적 모두 임계 충족?]
  ├─ YES → [통과 정의(DoD) 확인] → [완료]
  └─ NO → [임계 미달 목적 특정] → [피드백 생성] → [개발자 전달]
      ↓
  [개발자: TDD로 테스트 작성 → 구현 → 로컬 검증]
      ↓
  [QA 재검증 사이클 (반복, 최대 5회)]
      ↓
  [에스컬레이션 조건 체크: 같은 기준 3회 지적? 5회 초과?]
  ├─ YES → [아키텍처 리뷰/인원 추가]
  └─ NO → [계속 루프]
```

### 스코어 계산

각 기준을 0~5점으로 평가:
- **5점**: 기준 임계 100% 충족
- **4점**: 임계의 90% 이상 충족
- **3점**: 임계의 70~89% 충족
- **2점**: 임계의 50~69% 충족
- **1점**: 임계의 <50% 충족
- **0점**: 기준 관련 기능 미작동

### 임계치 정의

| 목적 | 기준 수 | 임계 | Pass 조건 |
|---|---|---|---|
| 목적 1: UI 시각화 | 9 | ≥4.0/5.0 | 기준 ui-1.1 필수 5점 |
| 목적 2: 값 정확성 | 10 | ≥4.0/5.0 | 기준 data-2.1, 2.9 필수 ≥4점 |
| 목적 3: 엣지케이스 | 11 | ≥3.5/5.0 | 기준 edge-3.1, 3.10 필수 ≥4점 |
| 목적 4: 풋스위치 | 10 | ≥4.0/5.0 | 기준 fs-4.1, 4.2 필수 ≥4점 |
| 목적 5: 교차 품질 | 10 | ≥4.0/5.0 | 기준 cross-5.1, 5.5, 5.7 필수 ≥4점 |

**Loop Pass**: 모든 5개 목적이 각각의 임계 충족.

### 피드백 포맷

```
[검증 사이클 N 결과 — FAIL]

==== 목적 1: UI 시각화 (3.2/5.0) — 미충족 ====

기준 ui-1.1 (색상 대비):
  스코어: 2/5
  결과: OD 블록 색상 대비 3.8:1 (필요: ≥4.5:1)
  수정:
    - 파일: web/lib/colors.ts
    - 변경: --color-od: #f97316 → #d97706 (밝기 낮춤)
    - 재검증: axe 스캔, Playwright 스냅샷
  예상 시간: 20분

기준 ui-1.3 (enabled-state-opacity):
  스코어: 3/5
  결과: grayscale 필터 미적용(opacity만 적용)
  수정:
    - 파일: web/components/Block.tsx
    - 변경: enabled=false일 때 opacity+filter:'grayscale(50%)' 추가
    - 재검증: Playwright 스냅샷 (enabled=false 블록 5개 type 모두)

==== 목적 2: 값 정확성 (4.1/5.0) — 통과 ====

==== 목적 3: 엣지케이스 (3.1/5.0) — 미충족 ====

기준 edge-3.1 (반응형 overflow):
  스코어: 3/5
  결과: 375px 모바일에서 footer 약간 오버플로
  수정:
    - 파일: web/components/SignalChain.css
    - 변경: padding-x: 16px → 12px
    - 재검증: Playwright 375px 스냅샷

==== 목적 4: 풋스위치 (2.8/5.0) — 미충족 ====
[... 상세 내용 ...]

==== 목적 5: 교차 품질 (4.2/5.0) — 통과 ====

==== 누적 이슈 추적 ====
사이클 1, 2에서 '반응형 overflow' 지적됨 (2회). 사이클 3에서도 미달하면 아키텍처 리뷰 추천.

==== 다음 사이클 ====
예상 시간: 1~2시간(자동 검사) + 개발자 1일
```

### 에스컬레이션 조건

다음 중 하나 발동 시 상위 아키텍처 리뷰 또는 범위 축소 고려:

1. **같은 기준 3회 이상 지적**: 설계 자체의 문제 가능성.
2. **5회 반복 후에도 임계 미달**: 점진적 개선 한계.
3. **5개 목적 중 2개 이상 0~1점**: 핵심 기능 미작동.

---

## 통과 정의 (Definition of Done)

모든 조건을 **동시에** 만족해야 함:

### 1. 루브릭 임계치 충족

- [ ] 목적 1: ≥4.0/5.0 (필수 기준 ui-1.1 = 5점)
- [ ] 목적 2: ≥4.0/5.0 (필수 기준 data-2.1, 2.9 ≥4점)
- [ ] 목적 3: ≥3.5/5.0 (필수 기준 edge-3.1, 3.10 ≥4점)
- [ ] 목적 4: ≥4.0/5.0 (필수 기준 fs-4.1, 4.2 ≥4점)
- [ ] 목적 5: ≥4.0/5.0 (필수 기준 cross-5.1, 5.5, 5.7 ≥4점)

### 2. 자동 체크 통과

- [ ] Vitest 전체 통과 (0 실패)
- [ ] Playwright E2E 전체 통과 (0 실패)
- [ ] axe 자동 스캔: violations=0 (critical/serious/moderate)
- [ ] Lighthouse: Performance ≥85, Accessibility ≥90
- [ ] 타입체크: `npm run typecheck` (tsgo / TS7 preview, 0 에러) + 커밋 전 `npm run typecheck:full` (tsc, 0 에러)
- [ ] Lint: `npm run lint` (eslint, 0 에러)
- [ ] 빌드: `npm run build` (success, exit 0)

### 3. 데이터 정합성

- [ ] Parser-contract.md 5가지 규칙 코드 구현 + Vitest 통과
- [ ] oasis 패치 (3변주, 5블록) 파싱 → 렌더 100% 정합
- [ ] knob 모든 값(20개+) 삼각검증(md vs JSON vs screen) 통과
- [ ] footswitch 메타필드 JSON 형식 검증 + 블록 매핑 일치

### 4. 커버리지

- [ ] 유닛 테스트: ≥80% (statement/branch/function)
- [ ] E2E 시나리오: 주요 페이지(곡 목록, 곡 상세 3변주, 0검색결과) 모두 통과

### 5. 코드 품질

- [ ] 파일 크기: 컴포넌트 <400줄, 유틸 <500줄
- [ ] console.log/debugger 0개
- [ ] 복잡한 함수에 JSDoc 주석
- [ ] 의존성 최소화 (번들 <150kb JS)

### 6. 문서화

- [ ] `docs/data-contract-ui.md` 작성 (knob 렌더 형식, 색상, 상태 스타일)
- [ ] `web/README.md` (구조, 명령어, 파서 계약 링크)

### 7. 배포 준비

- [ ] git 커밋: 사이클별 명확한 메시지
- [ ] 최종 커밋: "QA pass: 5개 목적 임계 충족"
- [ ] `.env.example` 작성 (필요한 환경 변수 명시)

---

## 사이클 체크리스트

### [사이클 시작 전]

- [ ] QA 담당자 + 개발자 지정
- [ ] 빌드 환경 정상(Node, npm, 의존성)
- [ ] git 상태 깨끗함

### [자동 검사 (30~45분)]

- [ ] Vitest 전체 실행 → 테스트 결과 기록
- [ ] Playwright 전체 실행 → 스크린샷/비디오 저장
- [ ] axe 스캔 → 위반 목록 추출
- [ ] Lighthouse CI → Core Web Vitals 기록
- [ ] TypeCheck, Lint → 에러 목록

### [수동 검증 (45~90분)]

- [ ] oasis 패치 3변주 전수 확인 (마우스+키보드)
- [ ] 데이터 삼각검증 (md vs JSON vs screen)
- [ ] 극단 케이스 (빈 배열, 긴 모델명, 0검색결과)
- [ ] 모바일(375px) + 밝은 배경 시뮬 가독성

### [스코어 계산 및 피드백 (30분)]

- [ ] 5개 목적 × N개 기준 스코어 합산
- [ ] 임계 충족 판정
- [ ] 구조화 피드백 생성

### [Pass/Fail 판정]

- [ ] 모든 목적 임계 충족 → 완료
- [ ] 미달 → 피드백 → 개발자 전달

---

## 필수 사전 작업 (웹 부트스트랩 전)

1. **색상 팔레트**: 6개 block type별 색상값(hex/hsl) + 명도 범위 정의.
2. **상태 스타일**: enabled/disabled/footswitch 시각 규칙(opacity, filter, 텍스트).
3. **데이터 계약**: `docs/data-contract-ui.md` (knob 렌더 형식, switching JSON 구조).
4. **아이콘 라이브러리**: block type + footswitch 배지 아이콘 출처 지정.

---

## 루프 종료 신호

- 5개 목적 모두 임계 충족
- 모든 자동 체크(타입, lint, 테스트, 빌드) 통과
- DoD 모든 항목 체크
- git 최종 커밋 + 배포 준비 완료
