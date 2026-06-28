# 멀티 프로세서 뷰 — 설계 스케치 (큰 그림)

> 상태: **계획(brainstorm 시드)**. 실행은 `docs/web-harness.md` 루프(brainstorm→PRD→TRD→TDD→리뷰→QA)로. 이 문서는 방향·아키텍처·단계 분해를 잡아 다음 사이클(#7 `multi-processor-view`)이 바로 읽고 시작하게 한다.

## 목적

지금은 프로세서가 GP-150 하나뿐이라 웹이 GP-150 화면으로만 그린다. 앞으로 다른 멀티이펙터(예: HX Stomp, GT-1000, MS-3 …)가 추가될 때, **웹에서 프로세서/모델을 선택해 그 기기에 맞는 형태로** 패치를 보고, 그 기기의 모델 카탈로그를 둘러볼 수 있어야 한다.

핵심 원칙(CLAUDE.md): **프로세서 비종속.** 데이터·렌더 구조는 기기에 독립이고, 기기별 차이는 "스킨/프로필"로 주입한다.

## 이미 받쳐주는 것 (척추는 agnostic)

- **데이터 경로**: 패치 → `rig`(frontmatter) → `rigs/<rig>.md`의 `processor` → `models/processors/<proc>/`. 곡 데이터에 기기 하드코딩 없음.
- **렌더러**: 사이클 #1의 "범용 블록-체인 렌더러"는 `block.type`(12모듈)만 보고 그린다. *스킨*만 GP-150 전용(다크 패널·LCD·LED·풋스위치 배지).
- **모델 카탈로그 추출**: 사이클 #6의 `web/lib/parser/catalog.ts`(`extractCatalog`)가 `models/processors/<proc>/{amps,cabs,effects}.md`에서 프로세서별 모델 목록을 뽑는다 → **모델 브라우저/검증의 공용 소스**로 재사용.
- **모듈 순서·스케일의 출처**: `models/processors/<proc>/hardware.md`(모듈 슬롯 순서), `profile.md`(value_scale 등). 이미 md에 있다.

## 갭 (지금 GP-150에 묶인 곳)

1. **스킨이 하나**: 렌더 컴포넌트/CSS 토큰이 GP-150 패널을 가정.
2. **모듈 순서가 암묵적**: 렌더가 GP-150 순서를 가정할 수 있음 → 기기별 순서를 데이터로 받아야.
3. **프로세서 메타가 런타임에 없음**: 이름·모듈순서·value_scale·카탈로그가 빌드 상수로 구워져 있지 않음.
4. **선택 UX 부재**: 곡은 한 rig에 귀속돼 자동 렌더. "기기 선택/비교/카탈로그 탐색" 진입점이 없음.

## 큰 그림 아키텍처

### 1. 데이터 — `processors.generated.ts` (빌드 상수)
`gen:patches`와 같은 패턴으로 `models/processors/*/`를 파싱해 프로세서 레지스트리를 굽는다:
```
Processor = {
  id: "valeton-gp150",
  name: "Valeton GP-150",
  moduleOrder: ["NR","PRE","WAH","DST","NS","AMP","CAB","EQ","MOD","DLY","RVB","VOL"], // hardware.md
  valueScale: "0-100",                  // profile.md
  catalog: { amps:[…], cabs:[…], effects:[…] }, // 모델 브라우저용 (catalog.ts 재사용·확장)
}
```
- md가 SoT, 이건 빌드 산출물(런타임 DB 없음 — CLAUDE.md 준수).
- `rigs/*`도 함께 구워 `rig → processor` 노출(파서가 이미 읽음).

### 2. 렌더 — `ProcessorSkin` 추상
- `block.type`만 보던 범용 렌더러는 유지. 그 위에 **스킨 레이어**를 둔다:
  ```
  interface ProcessorSkin { panel, colorTokens, moduleLabel(type), layout(moduleOrder), … }
  ```
- `skinFor(processorId)` 로 선택. GP-150 스킨이 첫 구현, 기본값. 새 기기는 자기 스킨만 등록.
- 모듈 순서는 스킨이 아니라 **프로필(데이터)**에서 → 같은 스킨도 기기별 순서 반영.

### 3. 선택 UX (세 진입점)
- **(a) 패치 자동 스킨**: `/songs/[slug]`은 그 패치 rig 의 프로세서 스킨으로 자동 렌더(코드 변경 최소, 기존 흐름 유지).
- **(b) 같은 곡 · 기기 비교**: 한 곡이 여러 rig에 있으면(예: `yb-white-whale`가 g250·xt-450) 기기/리그 토글로 비교. 변주 비교(#2)와 동일 패턴 확장.
- **(c) 모델 카탈로그 브라우저**: `/processors/[id]` — 그 기기의 AMP/CAB/이펙트 목록을 모듈 맵으로. 사이클 #6 카탈로그를 그대로 소비. "이 기기엔 뭐가 들어있나"를 보는 레퍼런스 뷰.
- **(d) 곡 목록 필터**: 홈의 rig 칩(#3)을 프로세서 필터로 확장(`?proc=`).

## 단계 분해 (사이클 후보)
1. **#7a 프로세서 레지스트리**: `processors.generated.ts` 빌드 + 타입. UI 없음, 데이터 척추.
2. **#7b 스킨 추상화**: 현재 GP-150 렌더를 `ProcessorSkin`으로 리팩터(동작 동일, 회귀 가드). moduleOrder를 데이터에서.
3. **#7c 모델 카탈로그 브라우저** `/processors/[id]`.
4. **#7d 곡↔기기 선택/비교 UX** (b)(d).
> 각 단계는 독립 사이클(루프 통과). #7a가 먼저(데이터), 그 위에 b~d.

## 새 프로세서 추가 체크리스트 ("등록" 관점)
1. `models/processors/<new>/` 에 `profile.md`·`hardware.md`(모듈 순서)·`amps.md`·`cabs.md`·`effects.md` 작성(매뉴얼 FX Title 기준).
2. `rigs/<guitar>-<new>.md` 추가(`processor: <new>`).
3. `tone-builder` 로 패치 생성 → `gen:patches` 가 **자동으로** 그 기기 카탈로그로 `model` 검증(사이클 #6, 코드 변경 0).
4. (#7b 이후) 그 기기 스킨 등록. 스킨 없으면 GP-150/기본 스킨으로 폴백.

## 열린 질문
- 모듈 순서·모델 메타를 md(프로필) 표에서 **기계적으로** 뽑을지, 별도 frontmatter/구조 블록을 둘지(현재 카탈로그는 `**굵게**` 목록 컨벤션 — 순서·스케일은 표/산문이라 파싱 계약 필요).
- 기기마다 모듈 종류가 다름(12 슬롯은 GP-150 고유). `BlockType` union을 기기별로 확장? 아니면 공통 상위 분류 + 기기별 라벨?
- 스킨을 CSS 토큰 세트로 끝낼지(가벼움) 컴포넌트 분기까지 갈지(기기 패널이 많이 다를 때).

## 비목표
- 런타임 DB/편집(여전히 빌드 상수, md=SoT).
- 실기기 프리셋 임포트/익스포트(범위 밖).
- 단계 #7a 전의 스킨 욕심내기(데이터 먼저).
