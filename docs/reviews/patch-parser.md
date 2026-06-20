# 리뷰 복기 — patch-parser (사이클 #0)

- **Feature slug**: patch-parser
- **사이클 날짜**: 2026-06-20
- **리뷰 에이전트**: correctness · maintainability · testing · kieran-typescript · project-standards (Workflow 병렬 5 + 적대적 검증 + 루브릭 QA)

## 발견 (심각도별)

CE 리뷰 15건 → 적대적 검증으로 CRITICAL/HIGH 3건 확정(CRITICAL 0).

| 심각도 | 파일:라인 | 내용 | 처리 |
|--------|-----------|------|------|
| **HIGH** | extractVariations.ts:90 | **실버그** — EOF/다음 변주까지 `\`\`\`` 안 닫힌 펜스가 `fenceCount=1`로 통과(검증 우회) | **수정함**: 닫힘 감지(`closed`) → 안 닫히면 `signalChainRaw=null` → 규칙2가 "펜스 안 닫힘" 에러. 테스트 `UNCLOSED_FENCE` 추가 |
| **HIGH** | validate.ts:47 (test gap) | 잘못된 footswitch 값(A\|B 아님) 분기 미테스트 | **수정함**: `BLOCK_BAD_FOOTSWITCH` 픽스처·테스트 추가 |
| **HIGH→MED** | parsePatch.ts:114 (test gap) | signal_chain 이 배열 아닌 객체일 때 분기 미테스트 | **수정함**: `JSON_NOT_ARRAY` 픽스처·테스트 추가 |
| MEDIUM | parsePatch.ts:164 | optional 필드가 `null`이면 `String(null)="null"`로 샘 | **수정함**: `present()` 헬퍼(undefined·null 모두 "없음") + `NULL_BASE_GEAR` 테스트 |
| MEDIUM ×2 | parsePatch.ts:110,201 | `(e as Error).message` 비안전 캐스트 | **수정함**: `errMsg()`(`e instanceof Error ? … : String(e)`) |
| MEDIUM ×2 | validate.ts:34,55 (test gap) | block/knob 가 배열일 때 분기 미테스트 | **수정함**: `BLOCK_IS_ARRAY`·`KNOB_IS_ARRAY` 테스트 |
| MEDIUM | slug.ts / serialize.ts | "단일 사용 → 인라인" (조기 추상화) | **보류(반론)**: 둘 다 **독립 유닛 테스트** 대상이고 CLAUDE.md "작은 파일 다수" 원칙에 부합. gen-patches 를 얇게 유지. 유지 결정 |
| MEDIUM | parsePatch.ts (error array 변이) | 공유 가변 errors 배열 변이가 dataflow 흐림 | **보류(반론)**: "모든 에러 한 번에 보고"(좋은 DX)를 위한 의도적 accumulator. 반환-병합은 보일러플레이트만 늘림 |
| LOW | scale union 캐스트 / naming(rv,b,k) / gray-matter catch / switching 에러 라인 | 방어적·스타일 | **노트**: scale 은 주석으로 "렌더 측·검증 안 함" 명시. 나머지는 현 상태 수용(저가치 churn 회피) |

## 복기 (다음 사이클로 가져갈 것)

- **반복된 실수 (다음엔 처음부터)**:
  - **라인 스캐너의 "종료 조건 ≠ 성공 조건"**: while 루프가 `조건 A 또는 경계`로 끝날 때, 경계로 끝난 경우를 성공처럼 처리하지 말 것. 닫힘/매칭은 **명시 플래그**로 구분. (unclosed fence 버그의 근원)
  - **optional 직렬화는 `undefined`만 보지 말고 `null`도**: 외부 데이터(JSON/YAML)는 `null`을 보낸다. 항상 `present()` 같은 헬퍼로.
  - **분기마다 픽스처**: 검증 술어의 *모든 거부 경로*(배열-아님/타입-밖/누락)에 픽스처를 1:1로. 커버리지 게이트(branch)가 이 공백을 정확히 드러냄.
- **재사용할 결정**:
  - **순수 lib/parser + 얇은 scripts 래퍼** 분리 → 유닛 테스트가 쉬웠고 빌드 안전망(exit 1)도 깔끔.
  - **합성 픽스처 + 실데이터(오아시스) 이중 검증** → 계약 규칙(합성)과 정합성(실데이터)을 둘 다 잡음.
  - **Workflow 병렬 리뷰 + 적대적 검증**: 15건 중 false-positive를 걸러 3건으로 수렴. 특히 실버그 1건을 correctness 렌즈가 잡아냄 → **다음 사이클도 동일 하네스**.
  - **리뷰 반론은 근거와 함께 기록**(slug/serialize 유지) → 맹목적 수용 회피.
- **하네스 개선점**:
  - **Workflow 에이전트가 작업 디렉터리에 잔재 파일을 남길 수 있음**(QA 에이전트가 `web/test_json_object.js`, 임시 broken `.md` 생성). 정리는 했으나, 다음엔 **에이전트에게 임시파일은 `/tmp`에만** 만들도록 프롬프트에 명시 → 잔재·lint 오염 예방.

## 게이트 결과

- lint: ✅(0) / typecheck(tsgo): ✅(0) / typecheck:full(tsc): ✅(0) / build: ✅(static)
- 테스트: **45 pass** (리뷰 후 +6) / 커버리지: **stmts 96.8 · branch 93.1 · funcs 100 · lines 98.8**
- QA(루브릭 파서 기준 9개): 전부 **5/5**, 필수(data-2.1·2.9·edge-3.10) 모두 ≥4, overallPass=✅
- **CRITICAL/HIGH 잔여: 0**
