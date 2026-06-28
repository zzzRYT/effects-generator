---
artist: Muse
title: Time Is Running Out
rig: g250-gp150
genre: 얼터너티브 록 — 타이트한 하이게인 리듬 + 게이티드 퍼즈 리드 (118 BPM, A단조)
confidence: 보통~높음 — 앰프(Diezel VH4)는 공개 자료로 명확하고 GP-150 Dizz VH로 직결 매칭(+Dizz 4x12), 딜레이도 Boss DD-3 디지털로 확인. 단 시그니처 퍼즈(Z.Vex Fuzz Factory)는 GP-150에 정확한 클론이 없어 캐릭터 근접치(Red Haze(Fuzz Face 기반))로 근사 — 이 한 블록만 확신 보통.
---

# Muse – Time Is Running Out

Matt Bellamy가 *Absolution* 전곡에서 쓴 **Diezel VH4**(GP-150의 **Dizz VH**)가 이 곡 톤의 척추다. 정의된 고역과 타이트한 저역의 하이게인이라, 게인을 높여도 파워코드가 뭉개지지 않는 게 핵심. 곡의 음향은 한 가지 앰프 세팅 위에서 **연주 다이내믹·기타 볼륨·풋스위치**로 갈린다:

- **벌스** — 절제된 톤. 기타 볼륨을 ~6–7로 내리고 팜뮤트로 타이트하게. (앰프를 클린으로 바꾸지 않는다 — Bellamy도 그렇게 안 함.)
- **후렴** — 기타 볼륨 풀, 브릿지 험버커로 벽 같은 디스토션 파워코드.
- **아웃트로/리드("you will be the death of me…")** — 게이티드 퍼즈 + 부스트로 피드백까지 밀어붙이는 클라이맥스.

→ 세 변주 모두 **풋스위치 A = 메인 더티 엔진(퍼즈/푸시) ON**, **풋스위치 B = 아웃트로 부스트(A 위에 얹음)**로 손동작을 통일했다. 픽업은 거의 **브릿지 험버커(pos 1)** 고정, 벌스는 볼륨/뮤트로 정리.

딜레이는 DD-3식의 옅은 앰비언트가 목적이라 Mix를 낮게. 118 BPM 기준 점8분 ≈ **381ms**, 8분 ≈ **254ms** — 탭템포로 맞추는 걸 권장(아래 값은 출발점).

## Variation: 정석 — Diezel VH4 + 게이티드 퍼즈 (실장비 직결)
가장 충실한 해석. 베이스 톤은 **Dizz VH(Diezel VH4)**의 타이트 하이게인 그대로 = 후렴 디스토션 벽. 벌스는 기타 볼륨/팜뮤트로 누른다. 풋스위치 A로 **Red Haze(Fuzz Face 기반)**를 켜 게이티드·공격적 퍼즈 리드(Fuzz Factory 자리)를 얹고, 아웃트로 클라이맥스는 풋스위치 B의 **Micro Boost**로 한 단계 더 밀어 피드백을 끌어낸다. 하이게인이라 앞단 **Gate 1**로 노이즈 정리.
체인: 기타 → Gate 1 → Red Haze(Fuzz Face 기반)(FS A) → Micro Boost(FS B) → AMP(Dizz VH) → CAB(Dizz 4x12) → Delay → Reverb(Room).

```signal_chain
[
  {"type":"NR","model":"Gate 1","base_gear":"ISP Decimator","enabled":true,
   "knobs":[{"name":"Threshold","value":6}]},
  {"type":"DST","category":"FUZZ","model":"Red Haze","base_gear":"Dallas-Arbiter Fuzz Face","enabled":false,"footswitch":"A",
   "knobs":[{"name":"Fuzz","value":7},{"name":"Volume","value":6}]},
  {"type":"PRE","category":"BOOST","model":"Micro Boost","base_gear":"MXR M133 Micro Amp","enabled":false,"footswitch":"B",
   "knobs":[{"name":"Gain","value":6}]},
  {"type":"AMP","model":"Dizz VH","base_gear":"Diezel VH4","enabled":true,
   "knobs":[{"name":"Gain","value":7.5},{"name":"Bass","value":4.5},{"name":"Mid","value":6.5},
            {"name":"Treble","value":7},{"name":"Presence","value":6},{"name":"Volume","value":5.5}]},
  {"type":"CAB","model":"Dizz 4x12","base_gear":"Diezel 4x12","enabled":true,"knobs":[]},
  {"type":"DLY","model":"Digital Delay S","base_gear":"Boss DD-3","enabled":true,
   "knobs":[{"name":"Time","value":381,"unit":"ms"},{"name":"Feedback","value":18,"unit":"%"},
            {"name":"Mix","value":15,"unit":"%"}]},
  {"type":"RVB","model":"Room","enabled":true,
   "knobs":[{"name":"Mix","value":12,"unit":"%"},{"name":"Pre Delay","value":12,"unit":"ms"},
            {"name":"Decay","value":0.8,"unit":"s"}]}
]
```
pickup: 브릿지 험버커(pos 1) 고정 — 벌스는 기타 볼륨 ≈6–7 + 팜뮤트, 후렴·아웃트로는 볼륨 풀
switching: {"A":"리드/후렴 — Red Haze(Fuzz Face 기반) ON (게이티드 퍼즈)","B":"아웃트로 클라이맥스 — Micro Boost ON (Fuzz 위에 얹어 피드백 부스트)"}

## Variation: 합주용 — 타이트 Marshall 하이게인 (믹스에서 또렷하게)
VH4급 포화는 라이브 합주 믹스에서 베이스·보컬과 뭉개지기 쉽다. 더 또렷한 **UK 900(Marshall JCM900)** 크런치를 베이스로 깔고, 앞단 **Green OD(TS-808)**으로 저역을 조여 파워코드 윤곽을 살린다. 벌스는 UK 900 크런치 그대로(볼륨/뮤트로 정리), 후렴은 풋스위치 A로 TS-808을 밟아 타이트하게 게인 푸시, 아웃트로는 B의 부스트로 리드 들어 올림. 퍼즈 대신 미드 푸시로 곡을 끌고 가는 합주 지향 해석.
체인: 기타 → Gate 1 → OD(Green OD, FS A) → Micro Boost(FS B) → AMP(UK 900) → CAB(UK 30) → Delay → Reverb(Room).

```signal_chain
[
  {"type":"NR","model":"Gate 1","base_gear":"ISP Decimator","enabled":true,
   "knobs":[{"name":"Threshold","value":5.5}]},
  {"type":"DST","category":"OD","model":"Green OD","base_gear":"Ibanez TS-808","enabled":false,"footswitch":"A",
   "knobs":[{"name":"Gain","value":2.5},{"name":"Tone","value":6.5},{"name":"Volume","value":7}]},
  {"type":"PRE","category":"BOOST","model":"Micro Boost","base_gear":"MXR M133 Micro Amp","enabled":false,"footswitch":"B",
   "knobs":[{"name":"Gain","value":6}]},
  {"type":"AMP","model":"UK 900","base_gear":"Marshall JCM900","enabled":true,
   "knobs":[{"name":"Gain","value":6},{"name":"Bass","value":4.5},{"name":"Mid","value":7},
            {"name":"Treble","value":6.5},{"name":"Presence","value":5.5},{"name":"Volume","value":5.5}]},
  {"type":"CAB","model":"UK 30","base_gear":"Marshall 1960A","enabled":true,"knobs":[]},
  {"type":"DLY","model":"Digital Delay S","base_gear":"Boss DD-3","enabled":true,
   "knobs":[{"name":"Time","value":254,"unit":"ms"},{"name":"Feedback","value":15,"unit":"%"},
            {"name":"Mix","value":12,"unit":"%"}]},
  {"type":"RVB","model":"Room","enabled":true,
   "knobs":[{"name":"Mix","value":12,"unit":"%"},{"name":"Pre Delay","value":12,"unit":"ms"},
            {"name":"Decay","value":0.7,"unit":"s"}]}
]
```
pickup: 브릿지 험버커(pos 1) — 벌스 기타 볼륨 ≈7 + 팜뮤트, 후렴·아웃트로 볼륨 풀
switching: {"A":"후렴 — Green OD(TS-808) ON (저역 타이트 + 게인 푸시)","B":"아웃트로 리드 — Micro Boost ON (TS 위에 얹어 부스트)"}

## Variation: 퍼즈 벽 — Big Muff + Plexi (사이키델릭/라이브 해석)
피드백에 잠긴 더 두껍고 사이키델릭한 라이브-뮤즈 벽. **Lazaro(Big Muff)**의 긴 서스테인 퍼즈를 **UK SLP(Marshall Super Lead Plexi)** 크런치에 꽂아 포화된 벽을 만들고, 공간계를 더 넓게(Line 6 DL4식 spacey delay + Hall). 베이스 Plexi 크런치 = 벌스/리듬, 풋스위치 A로 Big Muff 벽을 후렴·리드에 얹고, B의 부스트로 아웃트로를 띄운다.
※ Bellamy 실장비 퍼즈는 게이티드한 Fuzz Factory라 Big Muff는 **정확한 매칭이 아니라 더 두꺼운 톤 선택지**(서스테인↑, 게이트성↓). 충실도는 변주1이 우선.
체인: 기타 → Gate 1 → Fuzz(Lazaro, FS A) → Micro Boost(FS B) → AMP(UK SLP) → CAB(UK Vintage) → Delay → Reverb(Hall).

```signal_chain
[
  {"type":"NR","model":"Gate 1","base_gear":"ISP Decimator","enabled":true,
   "knobs":[{"name":"Threshold","value":5}]},
  {"type":"DST","category":"FUZZ","model":"Lazaro","base_gear":"EHX Big Muff Pi","enabled":false,"footswitch":"A",
   "knobs":[{"name":"Sustain","value":7},{"name":"Tone","value":6},{"name":"Volume","value":6}]},
  {"type":"PRE","category":"BOOST","model":"Micro Boost","base_gear":"MXR M133 Micro Amp","enabled":false,"footswitch":"B",
   "knobs":[{"name":"Gain","value":5}]},
  {"type":"AMP","model":"UK SLP","base_gear":"Marshall 1959HW Super Lead Plexi","enabled":true,
   "knobs":[{"name":"Gain","value":6},{"name":"Bass","value":5},{"name":"Mid","value":6},
            {"name":"Treble","value":6.5},{"name":"Presence","value":6},{"name":"Volume","value":6}]},
  {"type":"CAB","model":"UK Vintage","base_gear":"Marshall 4x12 빈티지","enabled":true,"knobs":[]},
  {"type":"DLY","model":"Digital Delay S","base_gear":"Line 6 DL4","enabled":true,
   "knobs":[{"name":"Time","value":381,"unit":"ms"},{"name":"Feedback","value":30,"unit":"%"},
            {"name":"Mix","value":22,"unit":"%"}]},
  {"type":"RVB","model":"Hall","enabled":true,
   "knobs":[{"name":"Mix","value":25,"unit":"%"},{"name":"Pre Delay","value":18,"unit":"ms"},
            {"name":"Decay","value":1.8,"unit":"s"}]}
]
```
pickup: 브릿지 험버커(pos 1) — 벌스 볼륨 ≈7 + 팜뮤트 / 후렴·리드 볼륨 풀, 피드백은 앰프 앞에서 유도
switching: {"A":"후렴/리드 — Big Muff(Lazaro) ON (퍼즈 벽)","B":"아웃트로 — Micro Boost ON (벽 위에 얹어 부스트)"}
