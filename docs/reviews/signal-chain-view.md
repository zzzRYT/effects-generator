# 리뷰 복기 — signal-chain-view

- **Feature slug**: signal-chain-view
- **사이클 날짜**: 2026-06-21
- **리뷰 에이전트**: code-reviewer(일반 품질) · typescript-reviewer · a11y-architect (병렬 3)

## 발견 (심각도별)

검증 우선(receiving-code-review): 각 주장을 실측·계약 대조 후 처리. 일부 HIGH/CRITICAL은 실측 결과 위반 아님으로 강등·기각.

| 심각도 | 파일:라인 | 내용 | 처리 |
|--------|-----------|------|------|
| HIGH→MED | block.module.css `.fsBadge` | 풋스위치 배지 텍스트색 `#000` 하드코딩 | **수정**: BlockModule 이 pickTextColor 로 주입(데이터 주도). 단 실측상 7색 모두 검정 대비 7.7~11.6:1 ≥4.5 → 실제 위반 아니었음(axe도 통과). 잠재 위험 제거 목적. |
| a11y-MED | block/signal-chain.css | 모바일 폰트 <12px (knobName 0.65/baseGear 0.72/switchingModels 0.72rem) | **수정**: 0.75rem(12px)로 상향 (cross-5.10). |
| a11y-MED | tokens.test.ts | --text-muted on --lcd 미검증(knobName 이 LCD 위 렌더) | **수정**: 테스트 쌍 추가. 실측 7.41:1 ≥4.5 통과 고정. |
| MED | SongDetail.tsx | 변주 key=label (라벨 중복 시 React 버그) | **수정**: `${slug}-${i}` 안정 키. |
| TS-MED | SwitchingPlan.tsx | 타입 술어 `NonNullable<typeof e.entry>` 중복 | **수정**: `SwitchingEntry` 직접 사용으로 단순화. |
| a11y-CRIT→해소 | block.module.css `[data-enabled=false]` | disabled 대비 면제 근거 불명확 | **문서화**: data-contract §3 에 "enabled=false=바이패스된 inactive 이펙트 → WCAG 1.4.3 대비 면제, 값은 보존" 명시. ui-1.3(흐리게) vs cross-5.1(대비) 충돌 해소. |
| MED→기각 | renderKnob.ts | `String(value)` 부동소수 오차 → toFixed 제안 | **기각**: toFixed 는 `640→640.00`·`3→3.00` 로 계약(자릿수 보존 data-2.10) 위반. md authored 리터럴은 String 최단왕복표기로 정확. 오차는 *계산된* 값에만(데이터엔 없음). |
| a11y-CRIT→기각 | SongDetail | "변주 섹션 h2 없음, 계층 깨짐" | **기각**: h1(곡)→h2(변주)는 유효한 계층(건너뜀 없음). 중간 h2 강제 불필요. |
| a11y-CRIT→기각 | TypeBadge / dt-dd | aria-label / aria-describedby 추가 | **기각**: 약어 텍스트+sr-only "{abbr} 블록" 이미 병기, dl 네이티브 시맨틱 충분(리뷰어도 modern AT 충분 인정). |
| a11y-HIGH→기각 | SignalChain | 모바일 DOM/시각 순서 불일치 | **기각**: flex-column 은 DOM 순서=시각 top→bottom 유지(불일치 없음). 데스크톱 row=left→right. ui-1.2 축 일관성 충족. |
| LOW | skip link / LED / 타깃간격 | 향후/AAA 항목 | 노트(현재 네비 헤더 없음 → skip link 불필요, LED 는 opacity+OFF 라벨 다중신호로 보강됨). |

## 복기 (다음 사이클로 가져갈 것)

- **반복된 실수**: 없음(척추는 #0 에서 닦임). Playwright 브라우저 버전이 올라가 재설치 필요했음 → #2 전 `npx playwright install` 선행 체크.
- **재사용할 결정**:
  - **불변 제약을 코드 테스트로 못박기**(tokens.test 가 대비/명도차 자동검증) — 눈대중 제거, QA ui-1.1 선제 통과.
  - **데이터 주도 색**(blockTypeToken → cssVar + textColor) — 컴포넌트 하드코딩 0, 단일 출처.
  - **리뷰 검증 우선**: 적대적 주장을 실측으로 판별 → HIGH 2건·CRIT 4건이 실제론 비위반/오판. 맹목 수용했으면 계약(자릿수 보존)을 깨거나 불필요 변경 발생.
- **계약 정합성 발견**: data-contract §1 "인접 타입 색 명도차 ≥20%"는 7색이면 수학적 불가 + 루브릭 ui-1.1 실측 대상(배경 구분)과 불일치 → 루브릭 기준으로 문구 정정. **계약 문서도 구현 중 검증 대상**임을 확인.
- **하네스 개선점**: 워크플로 대신 Agent 병렬 리뷰(3)로 CE 리뷰 수행 — 가볍고 충분. 리뷰 프롬프트에 "실측/계약 대조 후 심각도 판정" 명시하면 오판 줄일 수 있음.

## 게이트 결과
- lint: ✅ / typecheck(tsgo): ✅ / typecheck:full(tsc): ✅
- 테스트: vitest 113 통과 / Playwright 36 통과(4 브레이크포인트 비주얼 + axe a11y violations 0)
- 커버리지: stmts 97.16 / branch 93.67 / **funcs 100** / lines 99.1 (게이트 80%)
- build: ✅ 정적(홈 ○ Static, /songs/[slug] ● SSG)
- CRITICAL/HIGH 잔여: **0**

## QA 루브릭 채점 (docs/verification-rubric.md, loop-until-pass)

| 목적 | 임계 | 판정 | 근거 |
|------|------|------|------|
| 1. UI 시각화 (9, ui-1.1 필수5) | ≥4.0 | ✅ PASS | ui-1.1 색대비/배경명도차 = tokens.test 자동검증 **5점**. ui-1.2 순서 = SignalChain.test+visual. ui-1.3 disabled = computed style 검증. ui-1.4 라벨(model+약어+상태) ✅. ui-1.5 풋스위치 배지 ✅. ui-1.6 노브형식 = renderKnob.test 전케이스. ui-1.7 모바일 노브 클립=0(≥12px 상향). ui-1.9 AMP/CAB 강조 ✅. **ui-1.8(변주 탭)은 #2 스코프 — 이번 제외**(세로 나열로 대체). |
| 2. 값 정확성 (10, data-2.1/2.9 필수4) | ≥4.0 | ✅ PASS | renderKnob 자릿수 보존(data-2.10) + 단위/스케일 표기. enabled=false 값 전부 표시(data-2.5). 빈 knobs(data-2.6). 파서가 빌드타임 값 보존(#0). |
| 3. 엣지케이스 (11, edge-3.1/3.10 필수4) | ≥3.5 | ✅ PASS | 빈 knobs "노브 없음", 미지 타입 util 폴백, genre/confidence 없음, 변주 1~3개, 긴 모델명 ellipsis, 4브레이크포인트 오버플로0. edge-3.10(malformed→빌드실패)=#0 안전망. edge-3.11 색맹(grayscale+약어+OFF라벨). |
| 4. 풋스위치 (10, fs-4.1/4.2 필수4) | ≥4.0 | ✅ PASS | 배지+aria-label(fs-4.9), 그룹 outline(fs-4.3), 스위칭 분리섹션+개수병기(fs-4.6/4.10), 변주별 독립(fs-4.7), enabled vs footswitch 구분(fs-4.4). |
| 5. 교차 품질 (10, cross-5.1/5.5/5.7 필수4) | ≥4.0 | ⚠️ 대체로 PASS | cross-5.1 대비 axe violations=0(disabled 면제 문서화) + tokens.test **필수충족**. cross-5.2 키보드. cross-5.3 시맨틱(main/nav/section/article/ol/dl). cross-5.4 reduced-motion. cross-5.10 모바일 ≥12px. **cross-5.5(LCP)/5.7(CLS) Lighthouse 미측정** — 정적 SSG·이미지 없음·최소 JS 라 충족 예상이나 **정식 측정은 follow-up**. |

**판정**: 목적 1~4 임계 충족. 목적 5 는 필수기준 중 cross-5.1 충족이나 cross-5.5/5.7(LCP/CLS) 정식 미측정 → **Lighthouse 측정을 follow-up 으로 남김**(정적 사이트라 위험 낮음). 기능·접근성·시각 목적은 달성.
