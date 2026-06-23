# 복기 — 사이클 #5 `block-module-taxonomy`

설계: `docs/plans/2026-06-23-block-module-taxonomy-design.md` · 계약: `docs/parser-contract.md` · UI계약: `docs/data-contract-ui.md`

## 무엇을 / 왜

사용자가 "TS-808은 GP-150 OD에 없다 — 모듈은 NR·PRE·WAH·DST·N→S·AMP·CAB·EQ·MOD·DLY·RVB·VOL 12개뿐"이라고 지적.
기존 데이터 계약이 `block.type`을 **효과 카테고리**(OD/BOOST/FUZZ/COMP…)로 모델링해 하드웨어에 없는 슬롯을 가리키고 있었다.

→ `type`을 **GP-150 실제 12모듈**로 바꾸고, 효과 종류는 선택 필드 `category`(PRE: COMP·BOOST·FILTER·PITCH / DST: OD·DST·FUZZ)로 분리.
화면은 `[DST] 오버드라이브 · TS-808`처럼 모듈(1차축)·효과종류(부제)·모델을 함께 표기 → 기계 화면과 1:1.

**설계 결정은 사용자 AskUserQuestion으로 수렴**(브레인스토밍 대체): ① 데이터 모양 = type(모듈)+category, ② 범위 = 전체 마이그레이션(web-harness 루프).

## 변경 범위 (척추=데이터 계약)

- 계약: `parser-contract.md`(모듈↔효과 표·검증규칙·변경이력), `data-contract-ui.md`(§1 색그룹 = category 우선 해석).
- 타입: `web/lib/types.ts` — `BlockType`(12모듈) + `BlockCategory` + `Block.category?`.
- 파서: `validate.ts`(`ALLOWED_TYPES`·`TYPE_CATEGORIES`·per-type category 검증), `parsePatch.ts`(category 스레딩).
- 렌더: `blockType.ts`(category-aware 그룹 해석 + `categoryLabel`), `BlockModule.tsx`/`TypeBadge.tsx`(모듈 배지 + 효과종류 라벨), `block.module.css`(`.category`).
- 데이터: 패치 5개 펜스 마이그레이션(OD→DST+OD, BOOST→PRE+BOOST, FUZZ→DST+FUZZ, COMP→PRE+COMP, DST→+DST) + `patches.generated.ts` 재생성. Oasis 줄글에 모듈 매핑 명시.

## CE 병렬 리뷰 (4) 결과 — CRITICAL/HIGH = 0

| 리뷰어 | 결과 |
|--------|------|
| correctness | 발견 0. 마이그레이션 데이터·타입 안전성 정상. LOW 잔여(category optional=의도). |
| testing | 실질 0. 분기 커버 완전(3단 폴백·검증 분기·렌더 분기). MEDIUM 잔여 1: 카테고리 분포 회귀 가드 부재. |
| maintainability | MEDIUM 3: ①시맨틱 페어링 미검증 ②계약↔코드 드리프트 가드 부재 ③blockTypeToken 폴백 JSDoc. |
| kieran-typescript | MEDIUM 2: `satisfies`/exhaustiveness, `as` 캐스팅(=기존 `b.type as` 패턴과 동일). LOW: 브랜디드/discriminated union(YAGNI). |

### 수렴 → 수정한 것 (MEDIUM 3종, 저비용·고가치)

1. **시맨틱 페어링 검증**: 플랫 `ALLOWED_CATEGORIES` → 모듈별 `TYPE_CATEGORIES`(PRE/DST) 맵. `{type:"AMP",category:"OD"}` 같은 잘못된 조합을 **빌드에서 거른다**(fail-fast 파서 철학). `ALLOWED_CATEGORIES`는 이 맵의 합집합으로 파생(단일 출처).
2. **드리프트 가드 테스트**: `ALLOWED_TYPES`/`ALLOWED_CATEGORIES`(런타임 Set) ↔ `BlockType`/`BlockCategory`(컴파일 union)를 exhaustive 레지스트리로 못박음. union 멤버 추가 시 컴파일+테스트가 동시에 갱신을 강제. 기존 `tokens.test`(토큰 드리프트 가드)와 같은 결.
3. **마이그레이션 회귀 가드**: `oasis.test`에 TS-808=DST/OD, AMP=category 없음 고정 → 오매핑(TS-808→FUZZ 등) 차단.

### 기각/보류 (verify-first)

- 브랜디드 타입·discriminated union·`satisfies`: 현 규모에 YAGNI. `Record<BlockCategory, X>` 명시 타입이 이미 컴파일타임 exhaustiveness를 강제하므로 `satisfies`는 중복. 리뷰어들도 "현행 충분" 판정.
- `b.category as Block["category"]` 캐스팅: 바로 위 `validate` 통과를 전제로 한 좁히기. 기존 `b.type as` 와 동일 패턴이라 일관성 유지(타입 술어 도입은 보류).
- Infinity 노브 값(correctness LOW): 이번 변경과 무관한 기존 코드. 별건.

## 다음에 피할/재사용할 패턴

- **재사용**: SoT 데이터 계약을 바꿀 땐 *런타임 허용목록 ↔ TS union* 사이에 exhaustive-레지스트리 드리프트 가드를 깐다(Set은 union과 자동 연동 안 됨). `tokens.test` 색 드리프트 가드와 동일 전략.
- **재사용**: 분류 필드는 "플랫 허용목록"이 아니라 *상위 종류별 허용집합* 맵으로 모델링하면 의미상 잘못된 조합까지 파서가 거른다(fail-fast).
- **피할 것**: 하드웨어/도메인을 모델링할 때 "효과 카테고리"처럼 **사람이 말하는 분류**를 1차 키로 잡으면, 실제 기기 구조(모듈 슬롯)와 어긋난다. 권위 문서(`hardware.md`)의 물리 구조를 1차축으로.
- **주의(교훈)**: 비주얼 스냅샷이 있는 변경(배지 텍스트 OD→DST + 라벨 추가)은 의도된 시각 변경이므로 `--update-snapshots`로 재생성해야 한다(functional 단언은 구조 기반이라 무변). Playwright `reuseExistingServer:true` 라 갱신 전 `:3000` 스테일 서버를 먼저 종료(백로그 #3 교훈 재확인).

## 게이트 (최종)

lint ✓ · tsgo ✓ · **vitest 235**(커버리지 96%+) ✓ · tsc ✓ · **next build**(7곡/21변주 재검증, ●SSG) ✓ · **Playwright 188**(오아시스 스냅샷 4 bp 갱신, 나머지 드리프트 0) ✓.
