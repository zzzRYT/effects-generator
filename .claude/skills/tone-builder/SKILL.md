---
name: tone-builder
description: 곡 이름/아티스트를 받으면 그 곡의 실제 기타 톤을 조사해 Cort G250 + Valeton GP-150용 풀 시그널 체인 패치로 매핑하고, patches/에 곡별 파일로 저장한다. 일렉기타 톤 세팅, 앰프 추천, "이 곡 톤 만들어줘" 요청에 사용.
---

# Tone Builder — 곡 → GP-150 패치

곡 이름을 받아 Cort G250(HSS) + Valeton GP-150 기준 풀 시그널 체인 패치를 만든다.

## Rig 선택

패치는 **rig(기타 + 프로세서 조합)** 단위로 만든다. 요청에 rig가 명시되면 그 rig를, 없으면 `rigs/`에서 `default: true`인 rig(현재 `g250-gp150`)를 사용한다.

- rig 정의: `rigs/<rig>.md` — 어떤 기타 모델 + 어떤 프로세서 모델인지
- 기타 모델: `models/guitars/<guitar>.md` — 픽업/셀렉터/픽업 선택 가이드
- 프로세서 모델: `models/processors/<processor>/` — profile + amps/cabs/effects/hardware

## 먼저 읽을 것

매번 추천 전에 선택한 rig가 가리키는 모델 파일을 읽는다 (기본 rig 기준 경로 예시):

1. `rigs/g250-gp150.md` — 사용할 조합 확인
2. `models/guitars/cort-g250.md` — 기타 스펙, 픽업 선택 가이드
3. `models/processors/valeton-gp150/profile.md` — 프로세서 개요 + 시그널 체인 규칙
4. `models/processors/valeton-gp150/amps.md` — 앰프 모델 ↔ 캐릭터 매핑 (매칭의 핵심)
5. `models/processors/valeton-gp150/effects.md` — 이펙트 블록 캐릭터

## 동작 순서

### 1. 곡 톤 조사
곡 이름/아티스트를 받으면 원곡의 기타 톤을 조사한다 (필요시 웹 검색):
- 쓰인 앰프/이펙트, 장르
- 클린 / 크런치 / 하이게인 정도
- 특징적 이펙트 (코러스, 딜레이, 와우 등)
- 곡 안에서 사운드가 바뀌는 구간 (벌스 클린 → 솔로 부스트 등)

### 2. 앰프 매칭
조사한 캐릭터를 프로세서 모델의 `amps.md`와 대조해 가장 가까운 앰프 모델 1~2개 선택.
근거(왜 이 앰프인지)를 짧게 남긴다.

### 3. 풀 체인 구성
프로세서 모델 프로필의 시그널 체인 규칙에 따라 구성하고 **구체적 노브 값**을 제시:
- 앰프: 게인, Bass/Mid/Treble, Presence, Level
- 캐비닛/IR
- 이펙트 블록별 핵심 파라미터 (딜레이 타임·피드백·믹스, 리버브 믹스 등)
- 기타 픽업 포지션 (rig의 기타 모델 픽업 가이드 사용)

#### 수치 표기 규칙 (필수)
"짧게 / 길게 / 살짝 / 깊게" 같은 **모호한 표현으로 끝내지 않는다.** 시간·주파수·비율 파라미터는 항상 **구체 숫자 + 단위**로 적는다.
- 시간(딜레이 Time, 리버브 Pre Delay·Decay): **ms 또는 s** — 예: Delay Time `120ms`, Pre Delay `15ms`, Decay `0.8s`
- 믹스/피드백/게인 등 비율: **% 또는 0–10** — 예: Mix `20%`, Feedback `15%`, Gain `5.5`
- 주파수(EQ, Low/High Cut): **Hz/kHz** — 예: Low Cut `90Hz`, High Cut `7kHz`
- 확신이 낮으면 단일값 대신 **범위**로 — 예: Pre Delay `20~40ms`. 그래도 숫자로 적는다.
- 참고 감각값 — 리버브 Decay: Room ≈ `0.6~1.0s`, Plate ≈ `1.0~1.5s`, Hall ≈ `1.5~2.5s`, Shimmer/앰비언트 ≈ `3s+`. 슬랩백 딜레이 ≈ `80~140ms`, 일반 리듬 딜레이는 곡 BPM의 1/4·점8분에 맞춤.

### 4. 스위칭 플랜 (선택)
곡 안에서 사운드 전환이 필요하면 풋스위치 2개 + 익스프레션 페달로 현실적 전환안 작성.
전환이 없으면 이 섹션 생략.

### 5. 저장
- `patches/<rig>/<artist>-<song>.md` 생성 (아래 템플릿). rig 폴더가 없으면 만든다.
- `patches/INDEX.md` 표에 한 줄 추가 (Rig 컬럼 포함)
- 파일명은 소문자-하이픈 (예: `oasis-wonderwall.md`)
- **변주 2~3개를 권장한다** — 비슷하지만 뉘앙스가 다른 세팅(예: 정석 / 더 빈티지 / 합주용 미드 푸시)을 골라 칠 수 있게.

#### 기계 판독 블록 (필수)
패치는 사람용 줄글 **외에** 기계가 읽는 구조 데이터를 함께 쓴다. 웹 빌드 파서(md → 타입 상수)가 이 부분만 읽는다.
- 포맷·필드·검증 규칙은 **`docs/parser-contract.md`가 권위 스펙.** 매번 그걸 따른다.
- 핵심: frontmatter(`artist`/`title`/`rig` 필수) + 변주마다 `## Variation: <label>` + ```` ```signal_chain ```` JSON 펜스 + `pickup:` + `switching:` 한 줄.
- `signal_chain`의 block/knob 모양이 그대로 웹의 타입 상수가 된다. 줄글 값과 펜스 값이 **일치**해야 한다.

## 불확실성 처리 (중요)

- 곡 톤을 못 찾거나 확신이 낮으면 **추측으로 노브 값을 채우지 않는다.**
- "이 부분은 확신 낮음"이라고 표시하고 대안(앰프 후보 2개 등)을 같이 제시한다.
- GP-150 풋스위치는 물리적으로 2개뿐 — 그 제약 안에서 전환안을 짠다.

## 패치 파일 템플릿

frontmatter + 변주마다 (줄글 → `signal_chain` 펜스 → pickup → switching). 전체 규칙은 `docs/parser-contract.md`.

````markdown
---
artist: <Artist>
title: <Song>
rig: <rig slug>
genre: <장르/톤 한 줄>
confidence: 높음 | 보통 | 낮음 + 근거
---

# <Artist> – <Song>

## Variation: <라벨>
<이 변주의 캐릭터·왜 이 앰프인지·연주 팁 — 사람용 줄글. 시그널 체인 순서도 여기 적어 가독성 확보.>

```signal_chain
[
  {"type":"AMP","model":"<GP-150 모델>","base_gear":"<실제 앰프>","enabled":true,
   "knobs":[{"name":"Gain","value":5.5},{"name":"Bass","value":5},{"name":"Mid","value":7},
            {"name":"Treble","value":6},{"name":"Presence","value":5.5}]},
  {"type":"CAB","model":"<IR/캐비닛>","enabled":true,"knobs":[]},
  {"type":"DLY","model":"<딜레이>","enabled":false,"footswitch":"A",
   "knobs":[{"name":"Time","value":120,"unit":"ms"},{"name":"Mix","value":20,"unit":"%"}]}
]
```
pickup: <5-way 위치 / 코일스플릿 여부>
switching: {"A":"<풋스위치 A 동작>","B":"<풋스위치 B 동작>"}

## Variation: <두 번째 라벨>
<같은 형태로 2~3개>
````

- block `type`은 `docs/parser-contract.md`의 허용 목록(대문자)에서. 시간·비율·주파수 노브는 `unit` 포함.
- 줄글에 적은 노브 값과 `signal_chain` 펜스 값은 **반드시 일치**.

## 검증

새 패치는 실제로 GP-150에 입력해 귀로 듣고 피드백하는 것이 진짜 검증이다.
사용자 피드백이 오면 해당 패치 파일과(원인이 데이터면) 레퍼런스를 함께 보정한다.
