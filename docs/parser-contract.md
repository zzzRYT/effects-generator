# 파서 입력 계약 (md → 타입 상수)

패치 md를 빌드 타임에 **타입 상수**로 굽기 위한 **권위 스펙.** 생산자(`tone-builder` 스킬)와 소비자(빌드 파서)가 둘 다 이 문서를 따른다. DB·런타임 스토어 없음 — 파서 산출물은 정적 TS 상수다.

원칙: **사람이 읽는 줄글은 그대로 두고**, 기계가 읽는 부분만 구조화한다. 파서는 frontmatter와 `signal_chain` 펜스만 읽고 줄글은 파싱하지 않는다 → 줄글이 어떻게 바뀌어도 안 깨진다.

## 파일 단위

- 한 곡 = 한 파일: `patches/<rig>/<artist>-<song>.md`
- 파일 안에 **변주 N개**(권장 3). 변주 = `## Variation:` 헤더 단위.

## 레이아웃

````markdown
---
artist: Oasis
title: Don't Look Back in Anger
rig: g250-gp150
genre: 브릿팝
confidence: 보통~높음        # 높음 | 보통 | 낮음 (+ 자유 텍스트 허용)
---

# Oasis – Don't Look Back in Anger   <!-- 사람용 제목, 파서 무시 -->

## Variation: 정석 JCM800
정석 마샬 크런치. 미드 푸시가 핵심. (사람이 읽는 줄글 — 파서 무시)

```signal_chain
[
  {"type":"DST","category":"OD","model":"Green OD","base_gear":"Ibanez TS-808","enabled":false,"footswitch":"A",
   "knobs":[{"name":"Gain","value":2},{"name":"Tone","value":6},{"name":"Volume","value":6.5}]},
  {"type":"AMP","model":"UK 800","base_gear":"Marshall JCM800","enabled":true,
   "knobs":[{"name":"Gain","value":5.5},{"name":"Bass","value":5},{"name":"Mid","value":7},
            {"name":"Treble","value":6},{"name":"Presence","value":5.5}]},
  {"type":"CAB","model":"UK 30","base_gear":"Marshall 1960A","enabled":true,"knobs":[]},
  {"type":"DLY","model":"Slapback","enabled":false,"footswitch":"A",
   "knobs":[{"name":"Time","value":120,"unit":"ms"},{"name":"Feedback","value":15,"unit":"%"},
            {"name":"Mix","value":20,"unit":"%"}]},
  {"type":"RVB","model":"Room","enabled":true,
   "knobs":[{"name":"Mix","value":15,"unit":"%"},{"name":"Pre Delay","value":15,"unit":"ms"},
            {"name":"Decay","value":0.8,"unit":"s"}]}
]
```
guitar: {"selector":1,"volume":10,"tone":7,"coilSplit":false,"note":"벌스 볼륨 6~7 롤백, 후렴 풀"}
switching: {"A":"솔로 — Green OD + Slapback ON","B":"EQ 미드 부스트 토글"}

## Variation: 빈티지 Plexi
… (같은 형태: 줄글 → signal_chain 펜스 → guitar → switching)
````

## 필드 정의

### frontmatter (필수)
| 키 | 필수 | 설명 |
|----|------|------|
| `artist` | ✓ | 아티스트 |
| `title` | ✓ | 곡 제목 |
| `rig` | ✓ | `rigs/<rig>.md`의 slug |
| `genre` | – | 장르/톤 한 줄 |
| `confidence` | – | 확신도 |

### 변주 블록
- `## Variation: <label>` — label이 변주 이름. 파일에 변주 1개여도 헤더 필수.
- `signal_chain` 펜스 1개 (필수, JSON 배열).
- `guitar:` 한 줄 (선택, JSON 객체 — 기타 본체 세팅). ↓ "guitar 필드" 참조.
- `switching:` 한 줄 (선택, JSON 객체 `{풋스위치: 설명}`).

### guitar (기타 본체 세팅) — 변주별 한 줄, JSON 객체

signal_chain(GP-150 이펙터)과 별개로, 톤의 출발점인 **기타 컨트롤**을 담는다. 모든 키 선택.

| 키 | 타입 | 설명 |
|----|------|------|
| `selector` | number | 5-way 셀렉터 위치 **1–5** (원시 숫자만). 이름표는 빌드 타임 파생(아래). |
| `volume` | number | 기타 볼륨 노브 **0–10**. 곡 메인(가장 큰) 상태 기준. 섹션 롤백은 `note`로. |
| `tone` | number | 기타 톤 노브 **0–10**. 근거 있을 때만(추측 금지). |
| `coilSplit` | bool | 푸시-풀 코일 스플릿 걸림 여부. 메인에서 걸 때만 `true`(옵션은 `note`). |
| `note` | string | 섹션별 변화·대안 자유 메모(예: `"벌스 볼륨 6~7 롤백, 후렴 풀"`). |

**셀렉터 이름표 파생(빌드 타임).** 패치엔 `selector` 숫자만 적는다. `①=브릿지 험버커` 같은 이름은
`rig` → `rigs/<rig>.md`(frontmatter `guitar:`) → `models/guitars/<guitar>.md`의 `## 5-way 셀렉터` 목록에서
파생해 생성 상수의 `selectorLabel`로 구워 넣는다(기타 비종속 — 기타 모델이 SoT, 재빌드하면 수렴).

### block (signal_chain 배열 요소)
| 키 | 필수 | 타입 | 설명 |
|----|------|------|------|
| `type` | ✓ | string | **GP-150 실제 모듈 슬롯.** `NR·PRE·WAH·DST·NS·AMP·CAB·EQ·MOD·DLY·RVB·VOL` 중 하나 (대문자). ↓ "모듈 ↔ 효과" 표 참조. |
| `category` | – | string | 모듈 안의 **효과 종류**. PRE: `COMP·BOOST·FILTER·PITCH` / DST: `OD·DST·FUZZ`. 단일 의미 모듈(AMP·CAB·EQ·MOD·DLY·RVB·VOL·WAH·NR·NS)은 생략. |
| `model` | ✓ | string | GP-150 모델명 = 매뉴얼 Effect List의 **FX Title** (예: `UK 800`, `Green OD`). 실기 이름 금지(그건 `base_gear`). CAB도 `model`로 통일. |
| `base_gear` | – | string | 원본 실기 (예: `Marshall JCM800`, `Ibanez TS-808`). |
| `enabled` | ✓ | bool | 기본 ON/OFF. 솔로 전용 등은 false. |
| `footswitch` | – | string | 풋스위치 할당 (`A`/`B`). 없으면 생략. |
| `knobs` | ✓ | array | 노브 배열 (빈 배열 허용, 예: IR-only CAB). |

#### 모듈 ↔ 효과 (왜 type이 효과명이 아니라 모듈인가)

GP-150은 **12개 모듈 슬롯**만 있다(`models/processors/valeton-gp150/hardware.md` 권위). 오버드라이브·부스트·퍼즈는 **독립 슬롯이 아니라** 모듈 안의 모델이다. 그래서 `type`은 슬롯(모듈), `category`+`model`이 그 안의 효과를 가리킨다. (예: `Green OD`(Ibanez TS-808 기반)는 "OD 모듈"이 아니라 **DST 모듈의 오버드라이브 모델**.)

```
NR → PRE → WAH → DST → N→S(NS) → AMP → CAB → EQ → MOD → DLY → RVB → VOL
```

| type | 모듈 | 안에 담기는 효과(category) | 비고 |
|------|------|--------------------------|------|
| `NR` | Noise Gate | – | 게이트 |
| `PRE` | Pre-Effects | `COMP` 컴프 · `BOOST` 부스트 · `FILTER` 필터 · `PITCH` 피치 | 앰프 앞단 |
| `WAH` | Wah | – | 와우 |
| `DST` | Distortion/OD | `OD` 오버드라이브 · `DST` 디스토션 · `FUZZ` 퍼즈 | 드라이브 |
| `NS` | SnapTone | – | N→S, 앰프 캐릭터 보조 |
| `AMP` | Amp Sim | – | 앰프 |
| `CAB` | Cab Sim | – | 캐비넷/IR |
| `EQ` | Equalizer | – | EQ |
| `MOD` | Modulation | – | 코러스/플랜저/페이저/트레몰로 |
| `DLY` | Delay | – | 딜레이 |
| `RVB` | Reverb | – | 리버브 |
| `VOL` | Volume | – | 볼륨 페달 |

> 부스트(클린 게인)는 **PRE**, 드라이브/디스토션/퍼즈는 **DST**다. 이 둘을 헷갈리지 말 것.

### knob (knobs 배열 요소) — 생성 상수의 knobs 배열과 동일 모양
| 키 | 필수 | 타입 | 설명 |
|----|------|------|------|
| `name` | ✓ | string | 노브 이름 (예: `Gain`, `Pre Delay`). |
| `value` | ✓ | number | 값. 단위 없으면 0–10 게인성 노브로 간주. |
| `unit` | – | string | `ms` `s` `%` `Hz` `kHz`. 없으면 스케일 노브(0–10/0–100). |

> 스케일: 0–10 감각으로 적되, 기기 화면이 0–100이면 ×10. 렌더러가 `processors.value_scale`로 표기 단위 토글.

## 검증 규칙 (파서)

곡 단위로 검사. 하나라도 실패하면 **빌드를 실패**시키고 어느 파일·어느 규칙인지 에러로 출력(잘못된 패치가 조용히 빠지지 않게):

1. frontmatter에 `artist`/`title`/`rig` 존재.
2. 변주 ≥ 1개, 각 변주에 `signal_chain` 펜스 정확히 1개.
3. `signal_chain` JSON 파싱 성공 + 배열.
4. 각 block에 `type`(12모듈 허용 목록 중)·`model`·`enabled`·`knobs` 존재. `category` 있으면 **그 `type`에 허용된 종류** 중(PRE→`COMP·BOOST·FILTER·PITCH`, DST→`OD·DST·FUZZ`). 그 외 모듈에 `category`가 붙으면 실패(의미상 잘못된 조합 차단).
5. 각 knob에 `name`·`value`(number) 존재.
6. `guitar:` 있으면 — JSON 객체여야 함(깨지면 `guitar-json` 실패). `selector`는 1–5 정수 + **그 기타 모델 5-way 맵에 존재**(빌드 컨텍스트), `volume`/`tone`은 0–10, `coilSplit`은 bool. 위반 시 `guitar-field` 실패. rig에 맞는 기타 모델이 없으면 실패. `coilSplit:true`인데 기타 모델에 코일 스플릿 지원이 명시 안 됐으면 **경고**(실패 아님).
7. 각 block의 `model`이 그 패치 rig 의 **프로세서 카탈로그**(`models/processors/<proc>/{amps,cabs,effects}.md` 의 모델명 = 매뉴얼 FX Title)에 존재. 실기/페달 이름(base-gear)을 `model`에 넣으면 `model-unknown`으로 실패(base-gear 는 `base_gear` 필드 전용). rig→프로세서는 `rigs/<rig>.md` frontmatter 의 `processor`로 해석. (카탈로그 매핑을 못 찾으면 이 검사만 스킵 — 신규 프로세서 부트스트랩 중 빌드가 막히지 않게.) 캐논·투영 시대엔 동일 규칙이 **투영 산출 검증**으로 재사용된다 → [캐논·투영 설계](plans/2026-06-28-canonical-projection-architecture-design.md) §4·§11.

## 빌드 동작

- 빌드 타임에 `patches/**/*.md`를 전부 파싱 → `web/lib/patches.generated.ts` 타입 상수로 출력.
- 순수 함수: 같은 md → 같은 산출물. 런타임 상태 없음.
- md(git)가 항상 진실 → 빌드는 언제든 재실행하면 수렴. 패치 변경 = md 수정 + 재빌드/배포.

## 변경 이력

- **사이클 #0**: 오아시스 패치에 frontmatter + `## Variation:` + `signal_chain` 펜스 추가(데이터 모델 검증).
- **사이클 #5 (block-module-taxonomy)**: `type`을 효과 카테고리(`OD`/`BOOST`/...)에서 **GP-150 실제 12모듈**(`NR·PRE·WAH·DST·NS·AMP·CAB·EQ·MOD·DLY·RVB·VOL`)로 교체하고, 효과 종류는 선택 필드 `category`로 분리. 근거·매핑은 위 "모듈 ↔ 효과" 표. 설계: `docs/plans/2026-06-23-block-module-taxonomy-design.md`.
- **사이클 #6 (guitar-controls)**: 변주별 `pickup:` 자유 문자열을 **구조화 `guitar:` JSON**(셀렉터/볼륨/톤/코일스플릿/메모)으로 교체. 셀렉터 이름표는 rig→기타모델 5-way 맵에서 빌드 타임 파생(`selectorLabel`). 검증 규칙 6 추가. 기존 패치 전체 백필. 설계: `docs/plans/2026-06-23-guitar-controls-design.md`.
- **P7 (main 정합, 2026-06-28)**: `model`을 매뉴얼 FX Title로 교정(`TS-808`→`Green OD`, `Fuzz Face`→`Red Haze`, `EP Booster`→`Boost`, `Comp`→`COMP`, CAB `Fender '65 Twin Reverb`→`Twin 2x12`; 실기명은 `base_gear`). 검증 규칙 7(model ↔ 프로세서 카탈로그) 추가 — base-gear 이름을 빌드에서 차단, 캐논·투영의 투영 검증으로 재사용. 그라운딩(`system-prompt.md`)·씨앗 패치·카탈로그 md 표기 정렬. 설계: `docs/plans/2026-06-28-canonical-projection-architecture-design.md` §11.
