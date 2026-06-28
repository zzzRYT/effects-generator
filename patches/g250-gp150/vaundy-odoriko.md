---
artist: Vaundy (バウンディ)
title: 踊り子 (Odoriko / 무희)
rig: g250-gp150
genre: J-POP / 시티팝 클린 — 코러스 머금은 글래시 미드 커팅, 드라이브 없음 / G장조·157 BPM·4/4
confidence: 보통~높음 — 조성(G장조)·템포(157 BPM, 하프타임 ≈ 79)는 다수 BPM DB로 확정. 톤 캐릭터(클린·코러스 필수·드라이브 없음·싱글코일/미드 중심·어쿠스틱+일렉 레이어)는 일본 기재 해설·연주 Q&A 다수로 일관 확인. 단 원곡 스튜디오 실장비(앰프/페달 모델)는 비공개(스튜디오는 플러그인·멀티트랙) → 앰프는 캐릭터 매칭(VOX AC30 1순위, JC-120 2순위, Twin Reverb 3순위). 세 변주 모두 클린.
---

# Vaundy – 踊り子 (Odoriko / 무희)

Vaundy의 대표곡(2021). 춤추듯 흘러가는 미디엄-업 J-POP/시티팝으로, 기타는 처음부터 끝까지 **드라이브 없는 클린**이다. 핵심은 **상시 코러스** — 일본 기재 해설·연주 Q&A가 한결같이 "최소한의 이펙트는 코러스, 리버브도 좋다"고 짚는다. 오버드라이브·디스토션은 쓰지 않는다. 원곡은 **싱글코일 스트랫**의 글래시한 클린으로 코드를 끊어 치고(미드 중심), 어쿠스틱과 겹쳐 일렉은 로우엔드를 줄이고 중역에 앉힌다.

세 변주 모두 클린이라 풋스위치는 드라이브 토글이 아니라 **A = 후반부 공간 확장(딜레이 ON)**, **B = 코러스 토글**로 같은 손동작을 유지한다. 픽업은 스트랫 싱글의 글래시 커팅을 G250 HSS로 옮긴 **미들+넥(pos 4)**이 기본 — 벌스에서 더 둥글게 받치려면 **넥 싱글(pos 5)**로 내린다. (이 패치는 XT-450도 동일 HSS라 [[xt-450-gp150]] rig로 그대로 옮겨도 픽업 운용이 같다.)

곡은 **157 BPM · G장조 · 4/4**. 공간계를 탭템포로 맞출 때 기준: **점8분 ≈ 287ms**(60000÷157×0.75), **8분 ≈ 191ms**, **4분 ≈ 382ms**. 아래 딜레이 Time이 이 값들이다 — 클린 커팅이 촘촘한 곡이라 딜레이는 기본 OFF로 두고 후렴/아웃트로에서만 옅게 얹는다.

## Variation: 정석 — VOX 코러스 클린 (AC30 Top Boost)
가장 원곡에 가까운 해석. **Foxy 30TB(VOX AC30 Top Boost)**의 챙챙한(chimey) 클린이 미드를 살리면서 고역이 반짝여 글래시 커팅이 또렷하게 끊긴다. Gain은 3으로 브레이크업 직전까지만(클린 유지), Treble 7로 챔을 열고 Bass 5로 로우엔드를 줄여 일렉을 중역에 앉힌다. Tone cut은 3.5로 낮춰 고역을 살리고, Char는 **Cool**(더 맑고 타이트). **G-Chorus**를 상시로 깔아 — Depth 4.5 · Rate 3 — 코드가 좌우로 번지게 한다. 리버브는 **Room**을 옅게(Mix 18%)만. 딜레이는 점8분(287ms)으로 후렴에서만 ON.
체인: 기타(미들+넥) → AMP(Foxy 30TB) → CAB → Chorus(상시) → Delay(점8분 287ms, FS A) → Reverb(Room).

```signal_chain
[
  {"type":"AMP","model":"Foxy 30TB","base_gear":"VOX AC30HW Top Boost","enabled":true,
   "knobs":[{"name":"Gain","value":3},{"name":"Bass","value":5},{"name":"Treble","value":7},
            {"name":"Tone cut","value":3.5},{"name":"Volume","value":6}]},
  {"type":"CAB","model":"Foxy 2x12","base_gear":"VOX AC30","enabled":true,"knobs":[]},
  {"type":"MOD","model":"G-Chorus","base_gear":"앙상블 코러스","enabled":true,"footswitch":"B",
   "knobs":[{"name":"Depth","value":4.5},{"name":"Rate","value":3},{"name":"Volume","value":5}]},
  {"type":"DLY","model":"Digital Delay S","enabled":false,"footswitch":"A",
   "knobs":[{"name":"Time","value":287,"unit":"ms"},{"name":"Feedback","value":15,"unit":"%"},
            {"name":"Mix","value":14,"unit":"%"}]},
  {"type":"RVB","model":"Room","enabled":true,
   "knobs":[{"name":"Mix","value":18,"unit":"%"},{"name":"Pre Delay","value":15,"unit":"ms"},
            {"name":"Decay","value":0.9,"unit":"s"}]}
]
```
pickup: 미들+넥(pos 4) 글래시 커팅 — 벌스 받침은 넥 싱글(pos 5)
switching: {"A":"후렴/아웃트로 — Delay ON (점8분 287ms, 공간 확장)","B":"코러스 토글 (드라이한 구간엔 OFF)"}

## Variation: 합주 안정 — 재즈코러스 (JC-120)
밴드에서 가장 안전하게 자리 잡는 버전. **J-120 CL(Roland JC-120)**의 차갑고 투명한 클린은 보컬과 부딪히지 않고 깨끗하게 묻혀, '코러스 내장 앰프' 본연의 결을 그대로 가져온다. Mid를 5.5로 살짝 받쳐 합주 속 존재감을 주고, Treble 6.5로 커팅을 또렷하게. **G-Chorus**(Depth 4 · Rate 2.8)를 상시로 깔아 JC 특유의 코러스 폭을 재현한다. 딜레이는 8분(191ms)으로 더 짧고 옅게, 리버브는 작은 **Room**(Mix 15%)으로만. 가장 재현성 높은 '실패 없는' 선택.
체인: 기타(미들/넥) → AMP(J-120 CL) → CAB → Chorus(상시) → Delay(8분 191ms, FS A) → Reverb(Room).

```signal_chain
[
  {"type":"AMP","model":"J-120 CL","base_gear":"Roland Jazz Chorus","enabled":true,
   "knobs":[{"name":"Gain","value":3},{"name":"Bass","value":5},{"name":"Mid","value":5.5},
            {"name":"Treble","value":6.5}]},
  {"type":"CAB","model":"J-120 2x12","base_gear":"Roland Jazz Chorus 2x12","enabled":true,"knobs":[]},
  {"type":"MOD","model":"G-Chorus","base_gear":"앙상블 코러스","enabled":true,"footswitch":"B",
   "knobs":[{"name":"Depth","value":4},{"name":"Rate","value":2.8},{"name":"Volume","value":5}]},
  {"type":"DLY","model":"Digital Delay S","enabled":false,"footswitch":"A",
   "knobs":[{"name":"Time","value":191,"unit":"ms"},{"name":"Feedback","value":18,"unit":"%"},
            {"name":"Mix","value":12,"unit":"%"}]},
  {"type":"RVB","model":"Room","enabled":true,
   "knobs":[{"name":"Mix","value":15,"unit":"%"},{"name":"Pre Delay","value":12,"unit":"ms"},
            {"name":"Decay","value":0.8,"unit":"s"}]}
]
```
pickup: 미들(pos 3) 글래시 클린 — 더 따뜻하게는 넥 싱글(pos 5)
switching: {"A":"후렴/아웃트로 — Delay ON (8분 191ms)","B":"코러스 토글"}

## Variation: 글래시 — 펜더 청량 (Twin Reverb + Plate)
가장 밝고 공기감 있는 해석. **Dark Twin(Fender '65 Twin Reverb)**의 넓은 헤드룸 클린을 Gain 2.5로 한껏 투명하게, Mid 4.5로 살짝 스쿱해 스트랫식 글래시 '쿼킹'을 강조한다. 코러스(Depth 4.5 · Rate 3.2)를 더 넓게 깔고, 공간은 **Plate**(Mix 20% · Decay 1.2s)로 매끈하게 반짝이게 — 청량한 후렴에서 코드가 공기 중에 퍼진다. 딜레이는 점8분(287ms)으로 옅게. 무대가 밝거나 곡을 더 시원하게 가져가고 싶을 때.
체인: 기타(미들+넥) → AMP(Dark Twin) → CAB → Chorus(상시) → Delay(점8분 287ms, FS A) → Reverb(Plate).

```signal_chain
[
  {"type":"AMP","model":"Dark Twin","base_gear":"Fender '65 Twin Reverb","enabled":true,
   "knobs":[{"name":"Gain","value":2.5},{"name":"Bass","value":5},{"name":"Mid","value":4.5},
            {"name":"Treble","value":6.5},{"name":"Volume","value":6}]},
  {"type":"CAB","model":"Twin 2x12","base_gear":"Fender '65 Twin Reverb","enabled":true,"knobs":[]},
  {"type":"MOD","model":"G-Chorus","base_gear":"앙상블 코러스","enabled":true,"footswitch":"B",
   "knobs":[{"name":"Depth","value":4.5},{"name":"Rate","value":3.2},{"name":"Volume","value":5}]},
  {"type":"DLY","model":"Digital Delay S","enabled":false,"footswitch":"A",
   "knobs":[{"name":"Time","value":287,"unit":"ms"},{"name":"Feedback","value":16,"unit":"%"},
            {"name":"Mix","value":13,"unit":"%"}]},
  {"type":"RVB","model":"Plate","enabled":true,
   "knobs":[{"name":"Mix","value":20,"unit":"%"},{"name":"Decay","value":1.2,"unit":"s"},
            {"name":"High Damp","value":5}]}
]
```
pickup: 미들+넥(pos 4) 글래시 쿼킹 — 또는 미들(pos 3)
switching: {"A":"후렴/아웃트로 — Delay ON (점8분 287ms)","B":"코러스 토글"}
