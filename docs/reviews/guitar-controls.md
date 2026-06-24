# 복기 — 사이클 #6 `guitar-controls`

설계: `docs/plans/2026-06-23-guitar-controls-design.md` · 계약: `docs/parser-contract.md` · UI계약: `docs/data-contract-ui.md`

## 무엇을 / 왜

사용자 요청: 곡 상세에 GP-150 이펙터 패치 **외에** 기타 본체 컨트롤(볼륨/톤 노브, HSS 5-way 셀렉터 위치="험싱싱", 코일 스플릿 푸시풀)을 어떻게 다룰지도 보여주기.
기존엔 변주별 `pickup:` **자유 문자열** 한 줄에 셀렉터·볼륨 롤백·코일스플릿이 다 뒤섞여 값으로 못 썼다.

→ 변주별 **구조화 `guitar:` JSON**(셀렉터/볼륨/톤/코일스플릿/메모)으로 교체. 셀렉터 **이름표는 rig→기타모델 5-way 맵에서 빌드 타임 파생**(기타 비종속·드리프트 없음). 화면은 신호 출발점(체인 위)에 "기타 세팅" 박스.

**설계 결정은 사용자 AskUserQuestion 4문으로 수렴**(브레인스토밍): ① 데이터 = 기본1벌+변화메모, ② 라벨 = 기타모델 파생, ③ 렌더 = 별도 박스, ④ 백필 = pickup 완전교체+전체.

## 변경 범위 (척추=데이터 계약)

- 계약: `parser-contract.md`(guitar 필드·검증규칙6·라벨파생·변경이력), `data-contract-ui.md`(§4.4 박스 규칙 gs-1~5).
- 타입: `web/lib/types.ts` — `GuitarSetting` + `Variation.guitar?`(pickup 제거).
- 파서: `guitarRegistry.ts`(신규 — rig/기타md → 5-way 맵·코일스플릿 지원, 순수), `parsePatch.ts`(`parseGuitar` — JSON·범위·라벨·rig가드·코일스플릿경고), `extractVariations.ts`(`guitar:` 추출), `index.ts`(registry 주입), `gen-patches.ts`(rigs/·models/guitars/ 읽어 registry 생성).
- 렌더: `GuitarSetting.tsx`(신규 — 라벨-값 dl, 위치 칩, 있는 행만, coilSplit=true만) + css, `VariationPanel.tsx`(체인 위 배치), `SwitchingPlan.tsx`(pickup 제거, aria-label 화).
- 데이터: 패치 8파일 24변주 전체 백필(pickup→guitar, 섹션변화는 note, 볼륨롤백은 baseline 10+note) + `patches.generated.ts` 재생성.
- 스킬: `tone-builder/SKILL.md`(변주마다 `guitar:` 항상 출력 규칙).

## CE 병렬 리뷰 (3) 결과 — 최종 CRITICAL/HIGH = 0

| 리뷰어 | 결과 |
|--------|------|
| correctness | HIGH 1(coilSplit-only+rig 미해결 시 검증 누락), MEDIUM 2(오해성 rig 메시지·불완전 5-way 맵), LOW 2. |
| project-standards | HIGH 1: GuitarSetting 이 signal_chain **뒤**에 렌더(gs-1 "신호 출발점=위" 위반). |
| typescript | **승인**. 타입안전·불변·순수·React 분기 정상. CRITICAL/HIGH 0. |

### 수렴 → 수정한 것 (HIGH 2 + MEDIUM 1)

1. **배치(HIGH, project-standards)**: `VariationPanel`에서 `GuitarSetting`을 `SignalChain` **위**로 이동(신호 출발점=기타). UI계약 gs-1·설계와 코드 일치. 스냅샷 4bp 재생성.
2. **rig 가드(HIGH, correctness)**: `parseGuitar`가 `info`(rig→기타모델)를 **1회 해석**하고, registry+rig 있는데 미해결이면 **selector 유무 무관 빌드 실패**. 이전엔 selector 있을 때만 검사 → coilSplit만 있는 guitar는 잘못된 rig가 조용히 통과 + 경고도 누락. 이제 닫힘.
3. **오해성 메시지(MEDIUM)**: rig 미정 시 `"undefined의 기타 모델..."` 대신 라벨 파생을 건너뛴다(frontmatter 규칙이 누락 rig를 이미 잡으므로 중복/오해 제거).
4. 테스트 보강: coilSplit-only+빈registry 실패, coilSplit:true+미지원 기타 경고(비실패).

### 기각/보류 (verify-first)

- **불완전 5-way 맵 빌드실패(MEDIUM)**: 보류. 기타 모델 md는 손으로 쓰는 안정 자산이고 둘 다 5개 완비. 누락 위치는 패치가 **그 위치를 쓸 때 loud 실패**(map.get→undefined→guitar-field)하므로 조용한 손상 아님. 빌드실패 추가는 안정 모델 파일에 과한 스코프.
- **coilSplit false=undefined 구분 불가(LOW)**: 설계 §7 의도(false=숨김). 버그 아님.
- **에러 라인이 헤더 가리킴(LOW)**: guitarRaw 존재 시 guitarLine 정확히 셋. 부재 시 에러 자체가 없음(선택 필드). 비이슈.

## 다음에 피할/재사용할 패턴

- **재사용**: 파생 가능한 표시값(셀렉터 이름표)은 패치에 중복 저장하지 말고 **상위 SoT(기타모델)에서 빌드 타임 파생해 생성상수에 구워 넣기**. 렌더러는 룩업 없이 dumb, 재빌드하면 수렴(드리프트 0). `selectorLabel` = 이 전략.
- **재사용**: 새 메타필드는 `parseSwitching` 대칭(`undefined`=없음 / `false`=실패 / 객체=성공)으로 짜면 일관·검증 누락 적다. 단 **외부 의존(registry) 해석은 분기 진입 전 1회**로 끌어올려 "특정 필드 있을 때만 검사"되는 사각 제거(correctness HIGH의 교훈).
- **재사용**: 신호 흐름 도메인은 화면 순서도 흐름대로(기타→이펙터→풋스위치). UI계약에 "왜 이 순서인지"(신호 출발점) 근거를 적어두면 배치 회귀를 리뷰가 잡는다.
- **주의(교훈)**: 의도된 시각 변경(박스 추가·위치 이동)은 `--update-snapshots`로 재생성. functional 단언은 구조 기반이라 무변. (백로그 #3·#5 교훈 재확인.)

## 게이트 (최종)

lint ✓ · tsgo ✓ · **vitest 258** ✓ · tsc full ✓ · **next build**(8곡/24변주, ●SSG) ✓ · **Playwright 170**(axe a11y=0, 오아시스 스냅샷 4bp 갱신) ✓.
