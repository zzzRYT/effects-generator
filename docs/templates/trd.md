# TRD — <피처 이름>

- **Feature slug**: <kebab-case>
- **PRD**: docs/prd/<slug>.md

## 설계 요약
<어떻게 만들 것인가 — 2~3 문단.>

## 컴포넌트 구조
```
<Feature>/                 # web/components/<feature>/
  <Component>.tsx
  <SubComponent>.tsx
  <feature>.css
```

## 파일 목록 (생성/수정)
| 파일 | 역할 |
|------|------|
| web/components/<feature>/<Component>.tsx | <역할> |
| web/lib/<util>.ts | <역할> |

## 데이터 흐름 / 타입
- 입력: <patches.generated.ts의 어떤 타입 — SignalChain/Block/Knob/Variation/Song>
- 변환: <순수 함수, 파일>
- 출력: <렌더>
- 타입 출처: web/lib/types.ts (`docs/parser-contract.md`와 일치)

## 상태 / 엣지케이스
- 빈 knobs, enabled=false, footswitch 없음
- 변주 1개뿐 / 3개
- 긴 모델명·곡명, 0 결과

## 수용 기준 ↔ 구현·테스트 매핑
| PRD 기준 | 컴포넌트 | 테스트 |
|----------|----------|--------|
| <기준 1> | <Component> | <vitest/playwright 케이스> |

## 테스트 계획
- 유닛(Vitest): <함수·컴포넌트>
- 비주얼(Playwright): <스냅샷 대상, 브레이크포인트>

## 새 의존성 (있으면 근거)
- <pkg> — <왜 직접 안 만들고 이걸 쓰는가>
