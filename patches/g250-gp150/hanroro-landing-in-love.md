---
artist: 한로로 (HANRORO)
title: 사랑하게 될 거야 (Landing in Love)
rig: g250-gp150
genre: 인디 발라드 (서정적 슈게이징) — 따뜻한 클린 아르페지오 + 공간계 / G장조·93 BPM·4/4
confidence: 보통~높음 — 템포(93 BPM)·조성(G장조·4/4)·편곡 성격(리버브·딜레이를 적층한 "서정적 슈게이징")은 다수 출처(악보·드럼탭 DB·평론)로 확정. 단 원곡 기타/앰프/페달 실장비는 공개 자료 없음(편곡 이새) → 앰프는 캐릭터 매칭(Dark Twin 1순위, Match CL 2순위). 정석 변주는 멀티에이전트 조사 + 적대적 검증으로 정밀화(딜레이를 93 BPM 점8분으로 재계산). 클린톤 요청에 맞춰 세 가지 클린 결 제시.
---

# 한로로 – 사랑하게 될 거야

감정선이 천천히 차오르는 인디 발라드(EP 〈이상비행〉 마지막 트랙, 작곡·작사 한로로 / 편곡 이새). 어머니의 어쿠스틱 기타 영향을 받은 곡답게 기타는 처음부터 끝까지 **따뜻한 클린 아르페지오**가 중심이고, 평론에서 "서정적 슈게이징"으로 불릴 만큼 **공간계(리버브·딜레이)로 넓게 띄우는** 톤이 핵심이다. 드라이브로 터뜨리기보다, 보컬을 받쳐주는 역할이라 미드는 자연스럽게, 고역은 살짝 열어 줄 분리를 살린다.

세 변주 모두 **드라이브 없이 클린**으로 닫혀 있다. 그래서 풋스위치는 드라이브 토글이 아니라 **A = 후반부 공간 확장(딜레이/코러스 ON)**, **B = 코러스(앰비언트) 토글**로 같은 손동작을 유지한다. 픽업은 **넥 싱글(pos 5)**의 따뜻하고 둥근 클린이 기본 — 줄을 더 또렷하게 커팅하고 싶으면 미들+넥(pos 4)으로 글래시하게.

곡은 **93 BPM · G장조 · 4/4**(다수 악보·드럼탭 DB 확정). 딜레이는 탭템포로 **점8분 ≈ 483ms**(60000÷93×0.75)에 맞추는 걸 권장 — 아래 정석의 Time 값이 이 기준이다.

## Variation: 정석 — 따뜻한 클린 (Twin Reverb)
가장 무난하고 안전한 해석 — 그리고 가장 '앰프 정석'에 가까운 선택. 베이스는 **Dark Twin(Fender '65 Twin Reverb)**의 넓은 헤드룸 클린으로, Gain을 2.5까지 낮춰 투명하고 부드러운 아르페지오가 단단하면서도 둥글게 깔린다. 미드를 6까지 약간 받쳐 보컬과 충돌하지 않게 따뜻함을 주고, 고역은 6으로 살짝 눌러 발라드의 결을 부드럽게 한다. 리버브는 **Spring** — Twin Reverb 실기의 내장 리버브가 바로 스프링이라 이 앰프엔 스프링이 가장 자연스럽고 정석이며, 곡의 "서정적 슈게이징" 공간감에도 맞는다. 딜레이는 93 BPM 점8분(483ms)으로 옅게 깔아 음 사이를 메운다.
체인: 기타(넥 싱글) → AMP(Dark Twin) → CAB → Delay(점8분 483ms, FS A) → Reverb(Spring).

```signal_chain
[
  {"type":"AMP","model":"Dark Twin","base_gear":"Fender '65 Twin Reverb","enabled":true,
   "knobs":[{"name":"Gain","value":2.5},{"name":"Bass","value":5},{"name":"Mid","value":6},
            {"name":"Treble","value":6},{"name":"Volume","value":6}]},
  {"type":"CAB","model":"Twin 2x12","base_gear":"Fender '65 Twin Reverb","enabled":true,"knobs":[]},
  {"type":"DLY","model":"Digital Delay S","enabled":false,"footswitch":"A",
   "knobs":[{"name":"Time","value":483,"unit":"ms"},{"name":"Feedback","value":22,"unit":"%"},
            {"name":"Mix","value":20,"unit":"%"}]},
  {"type":"RVB","model":"Spring","enabled":true,
   "knobs":[{"name":"Mix","value":28,"unit":"%"},{"name":"Decay","value":1.4,"unit":"s"},
            {"name":"Tone","value":5.5}]}
]
```
pickup: 넥 싱글(pos 5) 따뜻한 클린 — 더 또렷한 커팅은 미들+넥(pos 4)
switching: {"A":"후반부 — Delay ON (점8분 483ms, 공간 확장)","B":"미사용"}

## Variation: 앰비언트 — JC-120 + 코러스 (꿈결 같은 해석)
공간감을 극대화한 버전. **J-120 CL(Roland JC-120)**의 투명하고 차가운 클린에 옅은 **G-Chorus**를 상시로 깔아 아르페지오를 넓게 띄운다. 딜레이는 4분음표(93 BPM ≈ 645ms)로 길게, 리버브는 **Hall**로 잔향을 깊게 — 인디 특유의 몽환적 질감. 후반부 클라이맥스에서 풋스위치 A로 딜레이 믹스를 더 키운 두 번째 딜레이 감각을 ON.
체인: 기타(넥 싱글) → AMP(J-120 CL) → CAB → Chorus(상시) → Delay(4분음표 645ms, FS A) → Reverb(Hall).

```signal_chain
[
  {"type":"AMP","model":"J-120 CL","base_gear":"Roland Jazz Chorus","enabled":true,
   "knobs":[{"name":"Gain","value":3},{"name":"Bass","value":5},{"name":"Mid","value":5},
            {"name":"Treble","value":6.5}]},
  {"type":"CAB","model":"J-120 2x12","base_gear":"Roland Jazz Chorus 2x12","enabled":true,"knobs":[]},
  {"type":"MOD","model":"G-Chorus","base_gear":"앙상블 코러스","enabled":true,"footswitch":"B",
   "knobs":[{"name":"Depth","value":3},{"name":"Rate","value":2.5},{"name":"Volume","value":5}]},
  {"type":"DLY","model":"Digital Delay S","enabled":false,"footswitch":"A",
   "knobs":[{"name":"Time","value":645,"unit":"ms"},{"name":"Feedback","value":32,"unit":"%"},
            {"name":"Mix","value":28,"unit":"%"}]},
  {"type":"RVB","model":"Hall","enabled":true,
   "knobs":[{"name":"Mix","value":32,"unit":"%"},{"name":"Pre Delay","value":20,"unit":"ms"},
            {"name":"Decay","value":2.2,"unit":"s"}]}
]
```
pickup: 넥 싱글(pos 5) 고정 — 코러스가 폭을 넓혀줌
switching: {"A":"후반부 — Delay ON (공간 확장)","B":"코러스 토글 (드라이한 구간엔 OFF)"}

## Variation: 빈티지 제글리 — AC30 + Plate (스트러밍이 살아나는 결)
아르페지오뿐 아니라 스트럼/커팅도 또렷하게 살리고 싶을 때. **Foxy 30N(VOX AC30 Normal)**의 상징적 클린 — 살짝 스파클하고 미드가 풍부해 코드 스트로크가 입체적으로 들린다. 공간은 **Plate** 리버브로 빈티지하게 매끈하게, 딜레이는 짧게(점8분보다 슬랩백 쪽으로) 옅게만. 보컬 받침 위주의 구간에선 Treble을 한 칸 내려 부드럽게.
체인: 기타(넥 싱글 / 커팅 시 미들+넥) → AMP(Foxy 30N) → CAB → Delay(슬랩백 120ms, FS A) → Reverb(Plate).

```signal_chain
[
  {"type":"AMP","model":"Foxy 30N","base_gear":"VOX AC30HW Normal","enabled":true,
   "knobs":[{"name":"Gain","value":3.5},{"name":"Volume","value":5.5},{"name":"Tone cut","value":4}]},
  {"type":"CAB","model":"Foxy 2x12","base_gear":"VOX AC30","enabled":true,"knobs":[]},
  {"type":"DLY","model":"Slapback","base_gear":"클래식 슬랩백","enabled":false,"footswitch":"A",
   "knobs":[{"name":"Time","value":120,"unit":"ms"},{"name":"Feedback","value":18,"unit":"%"},
            {"name":"Mix","value":15,"unit":"%"}]},
  {"type":"RVB","model":"Plate","enabled":true,
   "knobs":[{"name":"Mix","value":25,"unit":"%"},{"name":"Decay","value":1.4,"unit":"s"},
            {"name":"High Damp","value":5}]}
]
```
pickup: 아르페지오 넥 싱글(pos 5) / 스트럼·커팅 미들+넥(pos 4)
switching: {"A":"후반부 — Slapback Delay ON","B":"미사용"}
