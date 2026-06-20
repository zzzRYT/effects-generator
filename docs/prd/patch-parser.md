# PRD — patch-parser (사이클 #0)

- **Feature slug**: patch-parser
- **Brainstorm**: docs/brainstorm/patch-parser.md
- **상태**: DRAFT

## 무엇 (What)

빌드 타임에 `patches/**/*.md` 를 파싱해 **검증된 타입 상수** `web/lib/patches.generated.ts` 로 굽는 순수 파서. `docs/parser-contract.md`(입력 계약)를 코드로 구현하고, 산출 타입은 `web/lib/types.ts` 로 단일 정의해 렌더러(#1+)가 공유한다. 잘못된 패치는 **빌드를 실패**시켜 조용히 빠지지 않게 한다.

## 왜 (Why) / 누구를 위해

웹(소비 레이어)이 md(SoT)를 화면에 그리려면, md → 타입 상수 변환이 **신뢰 가능**해야 한다. 이 척추가 흔들리면 #1~#4 전부 흔들린다. DB 없이 "md 고치고 재빌드 = 수렴"을 보장하는 결정적 파서가 목표. 깨진 패치가 말없이 사라지면 톤 라이브러리의 신뢰가 무너지므로, **빌드 실패 + 명확한 에러**가 핵심 가치.

## 수용 기준 (측정 가능 — 테스트로 검증)

- [ ] **AC1** 정상 패치(오아시스 3변주) 파싱 → 모든 knob 필드(name/value/unit) 100% 일치, 소수점 ±0.01. `[rubric data-2.1]`
- [ ] **AC2** 각 변주의 `signal_chain` 이 **순서 보존** 배열로 추출되고, `block.type` 은 허용 16종만 통과. `[parser-contract 규칙 4]`
- [ ] **AC3** `switching` → `SwitchingPlan{A?,B?}` 추출 + `blockModels` 가 해당 변주에서 `footswitch===key` 인 블록 `model` 로 **자동 추출**. `[data-2.3, fs-4.10]`
- [ ] **AC4** `knobs:[]`(IR-only CAB)가 crash 없이 빈 배열로 보존. `[data-2.6, edge-3.3]`
- [ ] **AC5** `unit`(ms/s/%/Hz/kHz/dB 등) 보존. `unit` 없는 노브는 그대로(스케일 표기는 렌더 책임). `[data-2.2 입력측]`
- [ ] **AC6** 부동소수점(5.5/0.8/1.5/6.5) 자릿수 보존 — 반올림·절삭 0. `[data-2.10]`
- [ ] **AC7** 검증 5규칙 위반 시 `npm run build` **exit≠0** + 에러에 **파일·라인·규칙ID·메시지** 포함. 정상 패치는 exit 0. `[data-2.9, edge-3.10]`
- [ ] **AC8** 산출물은 `web/lib/patches.generated.ts` 타입 상수이며 `web/lib/types.ts` 타입과 일치(`tsgo`·`tsc` 통과).
- [ ] **AC9** **결정적**: 같은 md → 바이트 동일 산출물(2회 실행 비교).
- [ ] **AC10** 변주 데이터 **독립**: 변주 간 객체 참조 공유 없음(한 변주 변경이 다른 변주에 영향 0). `[data-2.8]`
- [ ] **AC11** `patches/**/*.md` glob 전수 파싱(현재 1곡, N 지원).
- [ ] **AC12** 유닛 커버리지 ≥80% (`lib/parser`), 게이트 `lint`+`typecheck`(tsgo) green.

## 비목표 (Non-goals)

- UI·렌더링(블록/노브 시각화) — 사이클 #1.
- `models/`·`rigs/` 메타 보강(value_scale, base_gear 설명 조인) — 필요 시 #1.
- 노브 스케일(0–10/0–100) 표기 토글 — 렌더 책임(#1).
- 곡 제보, 검색, 변주 비교 UI.
- 사람용 줄글 파싱(파서는 frontmatter + 펜스 + pickup/switching 라인만 읽음).

## 열린 질문 (TRD 에서 확정)

- `serialize` 출력 형태: 단일 `readonly Song[]` vs slug 맵 → **TRD 에서 단일 배열로 확정 예정**.
- 에러 `line`: frontmatter/펜스 시작 행 기준 정밀도 → TRD.
- `switching.description` 이 언급한 모델이 chain 에 없을 때: **빌드 실패 아님, 경고**(fs-4.2) → TRD 에서 경고 채널 정의.
