---
artist: YB
title: 흰수염고래
rig: xt-450-gp150
genre: 앤섬 발라드-록 (클린 빌드업 → 드라이브 클라이맥스)
confidence: 보통 — 곡의 음향 캐릭터(앰비언트 클린 벌스 → 벽 같은 드라이브 후렴/솔로)는 명확하나, 원곡 스튜디오 실장비는 공개 자료가 없어 캐릭터 매칭 기준
---

# YB – 흰수염고래 (XT-450 rig)

XT-450(HSS)는 G250와 같은 HSS 구성이라 GP-150 시그널 체인과 픽업 운용이 동일하다.
곡 전체가 **하나의 큰 빌드업**이다. 잔잔한 클린 아르페지오로 시작해(딜레이·리버브로 공간을 넓게), 후렴에서 크런치가 들어오고, 마지막 클라이맥스/솔로에서 서스테인 긴 드라이브로 터진다.
→ **풋스위치 A = 후렴 드라이브**, **풋스위치 B = 클라이맥스 부스트(A 위에 얹음)**. 벌스는 넥 싱글(따뜻한 클린), 후렴·솔로는 브릿지 험버커(두께·서스테인)로 픽업을 바꾼다.

BPM이 느린 곡(≈72)이라 딜레이는 **탭템포로 점8분에 맞추는 걸 권장**(아래 값은 ≈72 기준 출발점).

## Variation: 정석 — 클린 빌드업 (Twin + 풋스위치 드라이브)
가장 무난한 해석. 베이스는 **Dark Twin(Fender '65 Twin Reverb)**의 넓은 헤드룸 클린 — 발라드 아르페지오가 리버브·딜레이 안에서 깊게 깔린다. 후렴은 풋스위치 A로 **Force(OCD)**를 켜 트윈 위에 풀한 튜브 크런치를 얹고, 클라이맥스 솔로는 풋스위치 B로 **Micro Boost**를 더해 한 단계 더 밀어 올린다.
체인: 기타 → OD(Force, FS A) → Boost(Micro, FS B) → AMP(Dark Twin) → CAB → Delay → Reverb(Hall).

```signal_chain
[
  {"type":"OD","model":"Force","base_gear":"Fulltone OCD","enabled":false,"footswitch":"A",
   "knobs":[{"name":"Gain","value":4},{"name":"Tone","value":5.5},{"name":"Volume","value":6}]},
  {"type":"BOOST","model":"Micro Boost","base_gear":"MXR M133 Micro Amp","enabled":false,"footswitch":"B",
   "knobs":[{"name":"Gain","value":6}]},
  {"type":"AMP","model":"Dark Twin","base_gear":"Fender '65 Twin Reverb","enabled":true,
   "knobs":[{"name":"Gain","value":3},{"name":"Bass","value":5},{"name":"Mid","value":6},
            {"name":"Treble","value":6.5},{"name":"Volume","value":6}]},
  {"type":"CAB","model":"Fender '65 Twin Reverb","base_gear":"Fender 2x12","enabled":true,"knobs":[]},
  {"type":"DLY","model":"Digital Delay S","enabled":true,
   "knobs":[{"name":"Time","value":625,"unit":"ms"},{"name":"Feedback","value":30,"unit":"%"},
            {"name":"Mix","value":25,"unit":"%"}]},
  {"type":"RVB","model":"Hall","enabled":true,
   "knobs":[{"name":"Mix","value":30,"unit":"%"},{"name":"Pre Delay","value":20,"unit":"ms"},
            {"name":"Decay","value":2.0,"unit":"s"}]}
]
```
pickup: 벌스 넥 싱글(pos 5) 따뜻한 클린 / 후렴·솔로 브릿지 험버커(pos 1)
switching: {"A":"후렴 — Force ON (크런치)","B":"클라이맥스 솔로 — Micro Boost ON (+Force 위에 얹어 부스트)"}

## Variation: 합주용 — JCM900 게인 빌드 (미드 푸시)
합주에서 묻히지 않게 미드를 민 록 지향 해석. 베이스를 **UK 900(Marshall JCM900)** 크런치로 깔고, 벌스는 넥 싱글 + 기타 볼륨을 7쯤으로 줄여 정리한다(앰프단에서 자연스럽게 클린에 가깝게). 후렴은 풋스위치 A로 **TS-808**을 밟아 저역을 타이트하게 조이고 게인을 밀며, 솔로는 B의 부스트로 들어 올린다. 공간계는 합주에서 과하지 않게 얕게.
체인: 기타 → OD(TS-808, FS A) → Boost(Micro, FS B) → AMP(UK 900) → CAB(UK 30) → Delay → Reverb(Room).

```signal_chain
[
  {"type":"OD","model":"TS-808","base_gear":"Ibanez TS-808","enabled":false,"footswitch":"A",
   "knobs":[{"name":"Gain","value":2},{"name":"Tone","value":6},{"name":"Volume","value":7}]},
  {"type":"BOOST","model":"Micro Boost","base_gear":"MXR M133 Micro Amp","enabled":false,"footswitch":"B",
   "knobs":[{"name":"Gain","value":6}]},
  {"type":"AMP","model":"UK 900","base_gear":"Marshall JCM900","enabled":true,
   "knobs":[{"name":"Gain","value":5},{"name":"Bass","value":5},{"name":"Mid","value":6.5},
            {"name":"Treble","value":6},{"name":"Presence","value":5.5},{"name":"Volume","value":5.5}]},
  {"type":"CAB","model":"UK 30","base_gear":"Marshall 1960A","enabled":true,"knobs":[]},
  {"type":"DLY","model":"Digital Delay S","enabled":true,
   "knobs":[{"name":"Time","value":460,"unit":"ms"},{"name":"Feedback","value":25,"unit":"%"},
            {"name":"Mix","value":18,"unit":"%"}]},
  {"type":"RVB","model":"Room","enabled":true,
   "knobs":[{"name":"Mix","value":15,"unit":"%"},{"name":"Pre Delay","value":15,"unit":"ms"},
            {"name":"Decay","value":1.0,"unit":"s"}]}
]
```
pickup: 벌스 넥 싱글(pos 5) + 기타 볼륨 ≈7로 정리 / 후렴·솔로 브릿지 험버커(pos 1) 볼륨 풀
switching: {"A":"후렴 — TS-808 ON (타이트 푸시)","B":"솔로 — Micro Boost ON (리드 부스트)"}

## Variation: 앰비언트 — JC-120 + Shimmer (더 꿈결 같은 해석)
공간감을 극대화한 버전. **J-120 CL(Roland JC-120)**의 투명한 클린에 옅은 **G-Chorus**를 상시로 깔아 벌스 아르페지오를 더 넓고 차갑게 띄운다. 딜레이는 점8분으로 길게, 리버브는 **Shimmer**로 옥타브 잔향을 더해 앰비언트 질감. 후렴은 풋스위치 A의 **Blues OD**로 드라이브를 얹고(JC 클린만으론 클라이맥스가 안 터지므로), 솔로는 B의 **EP Booster**로 밀어 올린다.
체인: 기타 → OD(Blues OD, FS A) → Boost(EP, FS B) → AMP(J-120 CL) → CAB → Chorus → Delay → Reverb(Shimmer).

```signal_chain
[
  {"type":"OD","model":"Blues OD","enabled":false,"footswitch":"A",
   "knobs":[{"name":"Gain","value":4.5},{"name":"Tone","value":6},{"name":"Volume","value":6}]},
  {"type":"BOOST","model":"EP Booster","base_gear":"Xotic EP Booster","enabled":false,"footswitch":"B",
   "knobs":[{"name":"Gain","value":5}]},
  {"type":"AMP","model":"J-120 CL","base_gear":"Roland Jazz Chorus","enabled":true,
   "knobs":[{"name":"Gain","value":3},{"name":"Bass","value":5},{"name":"Mid","value":5.5},
            {"name":"Treble","value":6.5}]},
  {"type":"CAB","model":"J-120 2x12","base_gear":"Roland Jazz Chorus 2x12","enabled":true,"knobs":[]},
  {"type":"MOD","model":"G-Chorus","enabled":true,
   "knobs":[{"name":"Depth","value":3},{"name":"Rate","value":2.5},{"name":"Volume","value":5}]},
  {"type":"DLY","model":"Digital Delay S","enabled":true,
   "knobs":[{"name":"Time","value":625,"unit":"ms"},{"name":"Feedback","value":35,"unit":"%"},
            {"name":"Mix","value":28,"unit":"%"}]},
  {"type":"RVB","model":"Shimmer","enabled":true,
   "knobs":[{"name":"Mix","value":35,"unit":"%"},{"name":"Pre Delay","value":20,"unit":"ms"},
            {"name":"Decay","value":3.0,"unit":"s"}]}
]
```
pickup: 넥 싱글(pos 5) 거의 고정 / 솔로만 브릿지 험버커(pos 1)
switching: {"A":"후렴 — Blues OD ON (드라이브)","B":"솔로 — EP Booster ON (리드 부스트)"}
