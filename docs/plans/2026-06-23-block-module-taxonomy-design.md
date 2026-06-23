# 사이클 #5 — block-module-taxonomy 설계

> 방향 확정은 사용자 Q&A(AskUserQuestion)로 수렴했다(= brainstorm 단계 대체).
> 이 문서가 PRD/TRD lite. 루프: `docs/web-harness.md`.

## 0. 문제 (왜)

`signal_chain` block의 `type`이 **효과 카테고리**(`OD`/`BOOST`/`FUZZ`/`COMP`/`FILTER`/`PITCH`...)로 정의돼 있다.
하지만 실제 Valeton GP-150은 **12개 모듈 슬롯**만 있고(`models/processors/valeton-gp150/hardware.md` 권위):

```
NR → PRE → WAH → DST → N→S → AMP → CAB → EQ → MOD → DLY → RVB → VOL
```

- **PRE** = 컴프 / 부스트 / 필터 / 피치 (앰프 앞단)
- **DST** = 드라이브(OD) / 디스토션 / 퍼즈

즉 "OD 모듈"·"BOOST 모듈"은 하드웨어에 **존재하지 않는다.** TS-808은 OD 모듈이 아니라 **DST 모듈의 한 모델**이다.
현재 데이터(`type:"OD"`)는 기계에 없는 슬롯을 가리키므로, "GP-150 기계 화면처럼 시각화"(CLAUDE.md)라는 목표와 어긋난다.

## 1. 방향 (확정)

`type`을 **실제 12모듈**로 바꾸고, OD/부스트/퍼즈 같은 효과 종류는 **`category` 필드**로 분리한다.
화면은 모듈 슬롯을 1차축(기계 화면 1:1), 효과종류+모델을 부제로 표기.

```jsonc
// DST 모듈 (드라이브)
{ "type":"DST", "category":"OD", "model":"TS-808", "base_gear":"Ibanez TS-808", "enabled":false, "knobs":[...] }
// 화면:  [DST] 오버드라이브 · TS-808

// PRE 모듈 (부스트)
{ "type":"PRE", "category":"BOOST", "model":"Micro Boost" }
// 화면:  [PRE] 부스트 · Micro Boost
```

버린 대안:
- **type=모듈만**(category 없음): 가장 단순하나 "OD/BOOST" 명시 라벨이 사라짐 → 사용자 요구("OD/BOOST가 표현될 때 명확히")와 어긋남.
- **현행 type 유지 + module 필드 추가**: 1차축이 여전히 효과종류 → "GP-150엔 OD 모듈 없다"는 핵심과 모순.

## 2. 데이터 모델

### BlockType (12 모듈)
`NR | PRE | WAH | DST | NS | AMP | CAB | EQ | MOD | DLY | RVB | VOL`
(`NS` = N→S/SnapTone. 현재 패치 미사용이나 계약 완전성 위해 포함.)

### BlockCategory (선택, PRE/DST 하위 종류)
`COMP | BOOST | FILTER | PITCH`(PRE)  ·  `OD | DST | FUZZ`(DST)
- 그 외 모듈(AMP/CAB/EQ/MOD/DLY/RVB/VOL/WAH/NR)은 category 없음(단일 의미).

### 색 그룹 해석 (category-aware)
`category` 있으면 우선: `OD/DST/FUZZ/BOOST → od`, `COMP → util`, `FILTER/PITCH → mod`.
없으면 type 기준: `AMP→amp, CAB→cab, DLY→dly, RVB→rvb, MOD→mod, WAH→mod, NR/EQ/VOL/PRE→util, DST→od, NS→amp`.
(PRE가 boost일 땐 od색, comp일 땐 util색 — 그래서 category가 색 결정에 필요.)

## 3. 마이그레이션 맵 (현행 → 신규)

| 현행 type | model(실측) | → type | category |
|---|---|---|---|
| OD | TS-808·Blues OD·Force | DST | OD |
| FUZZ | Fuzz Face·Lazaro | DST | FUZZ |
| DST | Chief(Guv'nor) | DST | DST |
| BOOST | Micro Boost·EP Booster | PRE | BOOST |
| COMP | Comp(Ross) | PRE | COMP |

대상 파일(5): oasis / yb(g250) / yb(xt-450) / muse / dear-cloud. (effects.md 분류와 전부 일치.)

## 4. 변경 파일

- **계약**: `docs/parser-contract.md`(type enum·category·매핑표·예시·검증규칙), `docs/data-contract-ui.md`(§1 표·category 라벨).
- **타입**: `web/lib/types.ts`.
- **파서**: `web/lib/parser/validate.ts`(ALLOWED_TYPES·ALLOWED_CATEGORIES), `web/lib/parser/parsePatch.ts`(category 스레딩).
- **렌더**: `web/lib/blockType.ts`(그룹·라벨), `web/components/signal-chain/BlockModule.tsx`, `web/components/ui/TypeBadge.tsx`, `block.module.css`.
- **데이터**: 패치 5개 + `web/lib/patches.generated.ts`(재생성).
- **테스트**: `blockType.test.ts`, `BlockModule.test.tsx`, `fixtures.ts`, (정합) `oasis.test.ts`·`SignalChain.test.tsx`.

## 5. 수용 기준 (측정 가능)

1. `ALLOWED_TYPES` = 12모듈. 기존 `OD/BOOST/...`는 type으로 거부(허용목록 밖).
2. `category` 있으면 허용목록 검증, 없으면 통과(선택).
3. 패치 5개 파싱 → 에러 0 / 경고 0. 오아시스 블록·노브 카운트 불변(16블록/44노브).
4. 화면: DST/PRE 모듈 블록이 모듈 배지 + 효과종류 라벨(오버드라이브/부스트…) + 모델 동시 표기.
5. 드라이브 계열(category OD/DST/FUZZ/BOOST)은 여전히 `--color-od` 그룹.
6. lint/tsgo/tsc/vitest(≥80%)/build/test:visual green.

## 6. 엣지케이스

- category 없는 블록(AMP 등) — 정상, 라벨 미표기.
- 알 수 없는 type/category — util 폴백 + 원본 약어(crash 0) 유지.
- `enabled=false` 드라이브 — 기존 OFF 다중신호 그대로.
- 색맹/grayscale — 모듈 배지 약어 + category 텍스트로 색 비의존.

## 7. 비목표

- 새 효과 모델 추가/패치 톤 변경 없음(순수 표현 계약 변경).
- DB·런타임 편집 없음(불변).
