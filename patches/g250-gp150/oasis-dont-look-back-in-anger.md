---
artist: Oasis
title: Don't Look Back in Anger
rig: g250-gp150
genre: 브릿팝 — 미드 푸시 마샬 크런치 + 솔로 부스트
confidence: 보통~높음 — Oasis = Marshall(JCM/Plexi) 크런치는 정설. 변주별 확신도는 각 변주 본문 참고. 정확한 노브 값은 기기에서 귀로 보정.
---

# Oasis – Don't Look Back in Anger

오아시스 = **Marshall + 두꺼운 험버커**의 "월 오브 사운드". 모듈레이션은 거의 없고, 미드가 풍부한 크런치 리듬 + 서스테인 긴 솔로가 핵심.
원곡은 기타가 여러 겹이라 합주에서 한 대로 칠 땐 미드를 키우고 저역을 줄여 자리를 확보한다.

세 변주는 **같은 곡의 다른 리그 해석**이다(연주 상태 토글이 아니라 앰프·캐릭터 자체가 다름):
- **정석 JCM800** — 80년대 록/브릿팝 크런치의 정점. 가장 안전한 기본값.
- **빈티지 Plexi** — 더 트이고 빈티지하게. 게인 낮고 다이내믹이 살아, 솔로는 부스트로 민다.
- **합주용 미드 푸시** — 밴드에서 묻힐 때. 미드를 더 밀고 저역을 줄여 한 대로도 자리를 잡는다.

공통 픽업: **브릿지 험버커 (pos 1)** — 오아시스 특유의 두께(리듬·솔로 공통). 인트로/조용한 차임은 브릿지 **코일 스플릿**으로 살짝 트이게.
공통 다이내믹 팁: 벌스를 더 클린하게는 **기타 볼륨을 6~7로 롤백**(마샬은 볼륨으로 잘 클린업). 코러스/솔로에서 풀업.

---

## Variation: 정석 JCM800

정석 마샬 크런치. **미드 푸시가 핵심**(Mid 7). 리듬은 다운스트로크로 단단하게, 솔로는 게인을 더 올리기보다 **TS-808 부스트로 미드를 밀어** 서스테인을 얻는 게 노엘 톤에 가깝다.
체인: 기타 → [TS-808 (솔로, 기본 OFF)] → [AMP: UK 800] → [CAB: UK 30] → [DLY: Slapback (솔로)] → [RVB: Room] → 출력.
확신도: **보통~높음** — JCM800은 오아시스 크런치의 정설. 노브 값은 줄글 리서치 전사.

```signal_chain
[
  {"type":"DST","category":"OD","model":"TS-808","base_gear":"Ibanez TS-808","enabled":false,"footswitch":"A",
   "knobs":[{"name":"Gain","value":2},{"name":"Tone","value":6},{"name":"Volume","value":6.5}]},
  {"type":"AMP","model":"UK 800","base_gear":"Marshall JCM800","enabled":true,
   "knobs":[{"name":"Gain","value":5.5},{"name":"Bass","value":5},{"name":"Mid","value":7},{"name":"Treble","value":6},{"name":"Presence","value":5.5}]},
  {"type":"CAB","model":"UK 30","base_gear":"Marshall 1960A","enabled":true,"knobs":[]},
  {"type":"DLY","model":"Slapback","enabled":false,"footswitch":"A",
   "knobs":[{"name":"Time","value":120,"unit":"ms"},{"name":"Feedback","value":15,"unit":"%"},{"name":"Mix","value":20,"unit":"%"}]},
  {"type":"RVB","model":"Room","enabled":true,
   "knobs":[{"name":"Mix","value":15,"unit":"%"},{"name":"Pre Delay","value":15,"unit":"ms"},{"name":"Decay","value":0.8,"unit":"s"}]}
]
```
guitar: {"selector":1,"volume":10}
switching: {"A":"솔로 — TS-808 + Slapback ON"}

## Variation: 빈티지 Plexi

더 빈티지하고 트인 톤. **UK SLP(1959 Super Lead Plexi)**는 프리앰프 게인이 적어 크런치를 위해 Gain을 더 올리고(7), Treble·Presence를 키워 60~70년대식 개방감을 낸다. Mid는 JCM800보다 살짝 낮춰(6) 코를 덜 막고 트이게.
Plexi는 다이내믹이 커서 **솔로는 TS를 더 세게 밀어**(Volume 7) 서스테인을 확보한다.
확신도: **보통** — Plexi 해석은 타당한 대안이나 정확한 노브는 귀로 보정 권장.

```signal_chain
[
  {"type":"DST","category":"OD","model":"TS-808","base_gear":"Ibanez TS-808","enabled":false,"footswitch":"A",
   "knobs":[{"name":"Gain","value":2.5},{"name":"Tone","value":6},{"name":"Volume","value":7}]},
  {"type":"AMP","model":"UK SLP","base_gear":"Marshall 1959 Super Lead Plexi","enabled":true,
   "knobs":[{"name":"Gain","value":7},{"name":"Bass","value":5},{"name":"Mid","value":6},{"name":"Treble","value":6.5},{"name":"Presence","value":6.5}]},
  {"type":"CAB","model":"UK 30","base_gear":"Marshall 1960A","enabled":true,"knobs":[]},
  {"type":"DLY","model":"Slapback","enabled":false,"footswitch":"A",
   "knobs":[{"name":"Time","value":130,"unit":"ms"},{"name":"Feedback","value":18,"unit":"%"},{"name":"Mix","value":22,"unit":"%"}]},
  {"type":"RVB","model":"Room","enabled":true,
   "knobs":[{"name":"Mix","value":15,"unit":"%"},{"name":"Pre Delay","value":12,"unit":"ms"},{"name":"Decay","value":0.9,"unit":"s"}]}
]
```
guitar: {"selector":1,"volume":10,"coilSplit":false,"note":"인트로 차임은 코일 스플릿 옵션"}
switching: {"A":"솔로 — TS-808 + Slapback ON (Plexi는 더 세게 부스트)"}

## Variation: 합주용 미드 푸시 (UK 900)

밴드에서 한 대로 칠 때. **UK 900(JCM900)**으로 게인을 조금 더 얹고(6), **Mid 7.5 / Bass 4.5**로 미드를 밀고 저역을 줄여 베이스·보컬과 안 겹치게 한다. **TS-808을 상시 ON**(가벼운 부스트)으로 타이트함과 미드를 보강.
EQ(Guitar EQ 1)를 **풋스위치 B**에 걸어, 합주에서 묻힐 때 800Hz·1.6kHz를 더 밀어 노엘식 코맹맹이 미드를 강조한다.
확신도: **보통~낮음** — 합주 자리잡기용 편곡적 해석. 앰프/EQ 선택은 상황에 맞게 조정.

```signal_chain
[
  {"type":"DST","category":"OD","model":"TS-808","base_gear":"Ibanez TS-808","enabled":true,
   "knobs":[{"name":"Gain","value":2},{"name":"Tone","value":6.5},{"name":"Volume","value":7}]},
  {"type":"AMP","model":"UK 900","base_gear":"Marshall JCM900","enabled":true,
   "knobs":[{"name":"Gain","value":6},{"name":"Bass","value":4.5},{"name":"Mid","value":7.5},{"name":"Treble","value":6},{"name":"Presence","value":6}]},
  {"type":"CAB","model":"UK 30","base_gear":"Marshall 1960A","enabled":true,"knobs":[]},
  {"type":"EQ","model":"Guitar EQ 1","base_gear":"GP-150 5-band","enabled":false,"footswitch":"B",
   "knobs":[{"name":"800Hz","value":2,"unit":"dB"},{"name":"1.6kHz","value":1.5,"unit":"dB"}]},
  {"type":"DLY","model":"Slapback","enabled":false,"footswitch":"A",
   "knobs":[{"name":"Time","value":120,"unit":"ms"},{"name":"Feedback","value":15,"unit":"%"},{"name":"Mix","value":18,"unit":"%"}]},
  {"type":"RVB","model":"Room","enabled":true,
   "knobs":[{"name":"Mix","value":12,"unit":"%"},{"name":"Pre Delay","value":15,"unit":"ms"},{"name":"Decay","value":0.7,"unit":"s"}]}
]
```
guitar: {"selector":1,"volume":10}
switching: {"A":"솔로 — Slapback ON (TS는 상시 ON)","B":"EQ 미드 부스트 — 합주에서 묻힐 때"}

---

## 왜 이 앰프들인지 & 연주 팁 (공통)

- **모듈 매핑 (GP-150).** TS-808은 독립 "OD 모듈"이 아니라 **DST 모듈의 오버드라이브 모델**이다(GP-150엔 OD 슬롯이 따로 없음). 클린 게인 부스트가 필요하면 **PRE 모듈**의 Micro Boost/EP Booster를 쓴다. 웹 체인의 `[DST] 오버드라이브 · TS-808` 표기가 이 뜻 — 모듈(DST) · 효과종류(오버드라이브) · 모델(TS-808).
- **Marshall이 정답.** UK 800(JCM800)이 80~90년대 브릿팝 크런치의 정점이라 리듬·솔로 모두 커버 → 정석. 더 빈티지·개방적이면 UK SLP(Plexi), 합주 자리잡기엔 UK 900 + 미드 EQ.
- **솔로는 게인보다 부스트.** TS-808로 미드를 밀어 서스테인을 얻는 게 노엘 톤에 가깝다(특히 Plexi).
- **CAB은 IR-only(UK 30 = 1960A 4x12).** AMP 바꾸면 Auto CAB Match가 자동 매칭. 합주에서 저역/치찰음이 겹치면 Low Cut(~90Hz)·High Cut(~7kHz)로 정리.
- **공간계는 옅게.** Room 리버브는 드라이한 인-유어-페이스를 유지(Decay 0.7~0.9s). Slapback은 솔로에 공기감만.
- GP-150 풋스위치 2개를 Stomp 모드로: **A = 솔로(부스트/딜레이)**, **B = (V3) EQ 미드 부스트**.
