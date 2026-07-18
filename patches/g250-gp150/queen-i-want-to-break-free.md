---
artist: Queen
title: I Want to Break Free
rig: g250-gp150
genre: 글램/팝 록 (Queen, 1984, 작곡 John Deacon) — 신스(Roland Jupiter-8) 주도 곡, 기타는 후렴 파워코드 + 브라이언 메이 솔로 담당. 레퍼런스 톤 = Red Special → 트레블 부스터 → VOX AC30. E장조·약 109 BPM·세컨(리듬) 기타 관점
confidence: 보통 — BPM(약 109)·조성(E장조)은 BPM/탭 DB로 확인. 브라이언 메이 톤 방향(VOX AC30 Top Boost + 트레블 부스터, 미드·베이스 올려 트레블을 매끄럽게, 게인은 과하지 않게 — 너무 크면 crackly)은 가이드(prosoundhq)로 확인. 단 (1) 이 곡은 기타가 곡 전체를 끌지 않고 후렴·솔로 위주라 "세컨 기타"가 정확히 무엇을 맡는지는 커버 편곡에 달림(키보드 유무 등) → 변주로 분기, (2) 요청자가 언급한 "외국 여자 보컬 커버(밴드 엔터프라이즈)"의 실제 사용 장비는 미확인 → 원곡 기타 파트를 세컨/리듬 관점으로 매핑. 합주에서 듣고 보정 권장.
---

# Queen – I Want to Break Free

원곡은 **신스(Jupiter-8)가 메인 훅**을 끌고, 기타(브라이언 메이, Red Special)는 **후렴의 파워코드 받침**과 **노래하는 듯한 솔로**를 맡는다. 즉 이 곡에서 "세컨(리듬) 기타"의 일은 셋 중 하나다 — **(1) 후렴 크런치 코드를 따뜻하게 받친다, (2) 키보드가 없으면 그 상징적인 하강 훅·벌스 베드를 기타로 칠한다, (3) 시끄러운 합주에서 리듬이 묻히지 않게 미드를 밀어 벽을 세운다.** 변주 3개가 이 셋에 대응한다.

레퍼런스 톤은 브라이언 메이의 **VOX AC30 Top Boost + 트레블 부스터**다 — 게인은 크림처럼 매끄럽게(과하면 crackly), **미드·베이스를 올려 트레블을 다듬고**, 노래하듯 서스테인이 붙는 톤. AC30에는 미드 노브가 없어 **Tone cut을 내려(≈4.5) 미드를 앞으로** 끌어낸다.

곡은 **약 109 BPM · E장조 · 4/4**. 공간계 탭템포 기준: **4분 ≈ 550ms**(60000÷109), **점8분 ≈ 413ms**, **8분 ≈ 275ms**. 아래 Delay Time이 이 값들이다.

세 변주의 풋스위치 손동작은 통일했다 — **A = 드라이브 푸시 ON**(마지막 후렴 벽 / 리드 더블링), **B = 딜레이 ON**(간주·솔로 구간 공간 확장).

## Variation: 정석 AC30 Top Boost 크런치 — 후렴 리듬 메인 (추천)
브라이언 메이 직계 톤. **Foxy 30TB(VOX AC30 Top Boost)**를 크림 크런치 직전(Gain 4.5)으로 두고, 앞단에 **Boost(트레블 부스터 역할, Gain 4.5·Bright ON)**를 상시 걸어 노래하는 서스테인과 광택을 더한다 — 이게 메이 톤의 핵심 레시피(클린 부스트로 AC30를 밀기). 가이드대로 **Bass 6**으로 두툼하게, **Treble 5.5 + Tone cut 4.5**로 고역을 매끄럽게 다듬어 crackly하지 않게(미드가 앞으로 나옴), Char는 **Hot**으로 두께를. 공간은 빈티지하게 **Spring**(Mix 18%·Decay 1.0s)만 옅게. 마지막 후렴/리드 더블링은 풋스위치 A의 **Green OD**(Gain 3)로 한 단 더 밀고, 간주는 B로 점8분(413ms) 딜레이를 연다.
체인: 기타(브릿지 코일스플릿/험버커) → Boost(상시) → Green OD(FS A) → AMP(Foxy 30TB) → CAB → Delay(점8분 413ms, FS B) → Reverb(Spring).

```signal_chain
[
  {"type":"PRE","category":"BOOST","model":"Boost","base_gear":"Xotic EP Booster","enabled":true,
   "knobs":[{"name":"Gain","value":4.5}]},
  {"type":"DST","category":"OD","model":"Green OD","base_gear":"Ibanez TS-808","enabled":false,"footswitch":"A",
   "knobs":[{"name":"Gain","value":3},{"name":"Tone","value":6},{"name":"Volume","value":6.5}]},
  {"type":"AMP","model":"Foxy 30TB","base_gear":"VOX AC30HW Top Boost","enabled":true,
   "knobs":[{"name":"Gain","value":4.5},{"name":"Bass","value":6},{"name":"Treble","value":5.5},
            {"name":"Tone cut","value":4.5},{"name":"Volume","value":6}]},
  {"type":"CAB","model":"Foxy 2x12","base_gear":"VOX AC30","enabled":true,"knobs":[]},
  {"type":"DLY","model":"Digital Delay S","enabled":false,"footswitch":"B",
   "knobs":[{"name":"Time","value":413,"unit":"ms"},{"name":"Feedback","value":20,"unit":"%"},
            {"name":"Mix","value":15,"unit":"%"}]},
  {"type":"RVB","model":"Spring","enabled":true,
   "knobs":[{"name":"Mix","value":18,"unit":"%"},{"name":"Decay","value":1.0,"unit":"s"},{"name":"Tone","value":6}]}
]
```
guitar: {"selector":1,"volume":10,"coilSplit":true,"note":"후렴 파워코드 — 브릿지 험버커 코일 스플릿(Red Special 싱글코일 결, 챙챙) / 더 두껍게는 스플릿 해제"}
switching: {"A":"마지막 후렴·리드 더블링 — Green OD ON (게인 한 단 푸시)","B":"간주/솔로 — Delay ON (점8분 413ms 공간 확장)"}

## Variation: 신스 훅 커버 — 글래시 클린 + 코러스/딜레이 (키보드 없을 때)
커버 밴드에 키보드가 없어 **세컨 기타가 그 상징적인 하강 훅·벌스 베드를 대신 칠** 때. **J-120 CL(Roland JC-120)**의 차갑고 투명한 클린을 베이스로, **G-Chorus**(Depth 4)로 신스다운 시머를, 짧은 **Delay**(8분 275ms·Mix 14%)와 **Room**(Mix 18%·Decay 1.2s)으로 신스의 서스테인·번짐을 흉내 낸다. 가벼운 **Comp**(Sustain 4)로 훅의 음 입자를 고르게. 벌스는 이 클린으로 베드를 깔고, 후렴에서 코드 크런치가 필요하면 풋스위치 A의 **Green OD**(Gain 2.5)로 약크런치 전환, 타이트한 부분은 B로 딜레이를 끈다.
체인: 기타(미들+넥) → Comp(상시) → Green OD(FS A) → AMP(J-120 CL, Bright ON) → CAB → Chorus(상시) → Delay(8분 275ms, FS B) → Reverb(Room).

```signal_chain
[
  {"type":"PRE","category":"COMP","model":"COMP","base_gear":"Ross Compressor","enabled":true,
   "knobs":[{"name":"Sustain","value":4},{"name":"Volume","value":5.5}]},
  {"type":"DST","category":"OD","model":"Green OD","base_gear":"Ibanez TS-808","enabled":false,"footswitch":"A",
   "knobs":[{"name":"Gain","value":2.5},{"name":"Tone","value":6},{"name":"Volume","value":6}]},
  {"type":"AMP","model":"J-120 CL","base_gear":"Roland Jazz Chorus","enabled":true,
   "knobs":[{"name":"Gain","value":3},{"name":"Bass","value":5},{"name":"Mid","value":5.5},
            {"name":"Treble","value":6.5}]},
  {"type":"CAB","model":"J-120 2x12","base_gear":"Roland Jazz Chorus 2x12","enabled":true,"knobs":[]},
  {"type":"MOD","model":"G-Chorus","base_gear":"앙상블 코러스","enabled":true,
   "knobs":[{"name":"Depth","value":4},{"name":"Rate","value":3},{"name":"Volume","value":5}]},
  {"type":"DLY","model":"Digital Delay S","enabled":true,"footswitch":"B",
   "knobs":[{"name":"Time","value":275,"unit":"ms"},{"name":"Feedback","value":18,"unit":"%"},
            {"name":"Mix","value":14,"unit":"%"}]},
  {"type":"RVB","model":"Room","enabled":true,
   "knobs":[{"name":"Mix","value":18,"unit":"%"},{"name":"Pre Delay","value":18,"unit":"ms"},
            {"name":"Decay","value":1.2,"unit":"s"}]}
]
```
guitar: {"selector":4,"volume":10,"note":"훅/벌스 베드 — 미들+넥(pos 4) 또는 미들(pos 3) 커팅 / 따뜻하게는 넥 싱글(pos 5)"}
switching: {"A":"후렴 코드 — Green OD ON (글래시 클린 → 약크런치)","B":"Delay ON/OFF (훅엔 ON, 타이트 코드엔 OFF)"}

## Variation: 합주 미드 푸시 — 두꺼운 리듬 벽 (마샬 JTM45, 더 록킹)
시끄러운 합주에서 AC30가 묻힐 때, 세컨이 후렴 벽을 더 단단히 받쳐야 할 때. **UK 45(Marshall JTM45)**를 크런치로 깔고 **Mid 7**로 미드를 강하게 밀어 베이스·보컬·퍼스트 기타 사이에서 칼같이 자리 잡게 한다 — 톤 충실도보다 **합주 관통력** 우선(브라이언 메이의 AC30 결은 변주 1, 이건 밴드 믹스용 해석). 풋스위치 A의 **Green OD**(Gain 3·Tone 6)으로 저역을 조여 파워코드 윤곽을 또렷이. 모듈레이션은 빼 타이트하게, 공간은 짧은 **Room**(Mix 15%·Decay 0.9s)만. 간주는 B로 점8분(413ms) 딜레이.
체인: 기타(브릿지 험버커) → Green OD(FS A) → AMP(UK 45) → CAB(UK 30) → Delay(점8분 413ms, FS B) → Reverb(Room).

```signal_chain
[
  {"type":"DST","category":"OD","model":"Green OD","base_gear":"Ibanez TS-808","enabled":false,"footswitch":"A",
   "knobs":[{"name":"Gain","value":3},{"name":"Tone","value":6},{"name":"Volume","value":6.5}]},
  {"type":"AMP","model":"UK 45","base_gear":"Marshall JTM45","enabled":true,
   "knobs":[{"name":"Gain","value":5},{"name":"Bass","value":5},{"name":"Mid","value":7},
            {"name":"Treble","value":6},{"name":"Presence","value":5.5},{"name":"Volume","value":5.5}]},
  {"type":"CAB","model":"UK 30","base_gear":"Marshall 1960A","enabled":true,"knobs":[]},
  {"type":"DLY","model":"Digital Delay S","enabled":false,"footswitch":"B",
   "knobs":[{"name":"Time","value":413,"unit":"ms"},{"name":"Feedback","value":18,"unit":"%"},
            {"name":"Mix","value":12,"unit":"%"}]},
  {"type":"RVB","model":"Room","enabled":true,
   "knobs":[{"name":"Mix","value":15,"unit":"%"},{"name":"Pre Delay","value":15,"unit":"ms"},
            {"name":"Decay","value":0.9,"unit":"s"}]}
]
```
guitar: {"selector":1,"volume":10,"note":"파워코드 두께"}
switching: {"A":"마지막 후렴 벽 — Green OD ON (저역 타이트 + 게인 푸시)","B":"간주/솔로 — Delay ON (점8분 413ms)"}
