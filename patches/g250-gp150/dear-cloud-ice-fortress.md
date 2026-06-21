---
artist: 디어클라우드 (The Dear Cloud)
title: 얼음요새 (Ice Fortress)
rig: g250-gp150
genre: 한국 모던/얼터너티브 록 — 차갑고 공간감 있는 클린 벌스 → 디스토션 벽 코러스, 레이어드 기타 / C장조·약 144 BPM(하프타임 ≈ 72)·세컨 기타 관점
confidence: 보통 — 템포(143.95 BPM)·조성(C장조)은 BPM/코드 DB로 확인. 톤 캐릭터(2007 데뷔작, 아토모스페릭 모던록, 클린 벌스가 빌드업해 디스토션 후렴 벽으로 터지는 다이내믹·두 대의 기타 레이어)는 음원·장르로 일관 확인. 단 디어클라우드 1집 스튜디오 실장비(앰프/페달 모델)는 비공개 → 앰프는 캐릭터 매칭. 또한 이 패치는 **합주용 세컨 기타** 관점으로 설계 — 리드(퍼스트) 기타를 덮지 않게 미드 중심·공간계 절제. 세컨이 어느 레이어를 맡느냐에 따라 변주 3개가 갈린다.
---

# 디어클라우드 – 얼음요새 (Ice Fortress)

디어클라우드 2007 데뷔작의 대표곡. **차갑고 넓은 클린 아르페지오 벌스 → 디스토션이 벽처럼 차오르는 후렴**으로 다이내믹이 크게 벌어지는 한국식 아토모스페릭 모던록이다. 곡 자체가 기타를 **두 대 이상 레이어**로 쌓아 공간을 채우는 사운드라, "세컨 기타"의 일이 명확하다 — 퍼스트(리드) 기타가 메인 모티프·리드 라인을 끌고 갈 때, **세컨은 (1) 벌스에서 차가운 화성 베드를 깔고 (2) 후렴에서 벽을 두껍게 받친다.** 핵심은 **퍼스트와 주파수가 부딪히지 않게** 미드를 중심에 두고 공간계를 과하지 않게 쓰는 것.

세 변주 모두 풋스위치 손동작을 통일했다 — **A = 드라이브 ON(벌스 클린/약크런치 → 후렴 벽)**, **B = 딜레이 ON(간주·앰비언트 구간 공간 확장)**. 픽업은 벌스 **넥 싱글(pos 5)** 또는 **미들+넥(pos 4)**, 후렴은 **브릿지 험버커(pos 1)**로 옮긴다.

곡은 **약 144 BPM · C장조 · 4/4**(드럼은 하프타임 ≈ 72 느낌). 공간계 탭템포 기준: **4분 ≈ 417ms**(60000÷144), **점8분 ≈ 313ms**, **8분 ≈ 208ms**. 아래 Delay Time이 이 값들이다.

## Variation: 합주 메인 — JC 클린 + 마샬 크런치 토글 (추천)
가장 안전하고 재현성 높은 세컨 기타 한 패치. **J-120 CL(Roland JC-120)**의 차갑고 투명한 클린을 베이스로 깔아 벌스 아르페지오가 '얼음요새'다운 글래시·클리니컬한 결을 갖게 한다(Bright ON, Gain 3, Bass 4.5·Mid 5.5·Treble 6.5 — 베이스 기타와 안 뭉치게 로우 살짝 깎고 미드는 합주 존재감으로 5.5). 가벼운 **Comp**(Sustain 4·Volume 5.5)로 아르페지오 입자를 고르게. 후렴은 풋스위치 A로 **Chief(Marshall Guv'nor 디스토션)**를 밟아 미드 푸시(Gain 5.5·Mid 6.5) 크런치 벽을 만든다 — JC는 클린 그대로 두고 페달이 게인을 담당하는 정석 페달 플랫폼 운용. 상시 **G-Chorus**(Depth 3.5)로 차가운 시머를, 공간은 **Hall**(Mix 20%·Decay 1.6s)로 넓게(단 합주에 묻히지 않게 절제). 간주·빌드업에선 B로 점8분(313ms) 딜레이를 연다.
체인: 기타(넥/미들) → Comp(상시) → DST(Chief, FS A) → AMP(J-120 CL) → CAB → Chorus(상시 옅게) → Delay(점8분 313ms, FS B) → Reverb(Hall).

```signal_chain
[
  {"type":"COMP","model":"Comp","base_gear":"Ross Compressor","enabled":true,
   "knobs":[{"name":"Sustain","value":4},{"name":"Volume","value":5.5}]},
  {"type":"DST","model":"Chief","base_gear":"Marshall Guv'nor","enabled":false,"footswitch":"A",
   "knobs":[{"name":"Gain","value":5.5},{"name":"Bass","value":5},{"name":"Mid","value":6.5},
            {"name":"Treble","value":6},{"name":"Volume","value":6}]},
  {"type":"AMP","model":"J-120 CL","base_gear":"Roland Jazz Chorus","enabled":true,
   "knobs":[{"name":"Gain","value":3},{"name":"Bass","value":4.5},{"name":"Mid","value":5.5},
            {"name":"Treble","value":6.5}]},
  {"type":"CAB","model":"J-120 2x12","base_gear":"Roland Jazz Chorus 2x12","enabled":true,"knobs":[]},
  {"type":"MOD","model":"G-Chorus","base_gear":"앙상블 코러스","enabled":true,
   "knobs":[{"name":"Depth","value":3.5},{"name":"Rate","value":2.8},{"name":"Volume","value":5}]},
  {"type":"DLY","model":"Digital Delay S","enabled":false,"footswitch":"B",
   "knobs":[{"name":"Time","value":313,"unit":"ms"},{"name":"Feedback","value":22,"unit":"%"},
            {"name":"Mix","value":14,"unit":"%"}]},
  {"type":"RVB","model":"Hall","enabled":true,
   "knobs":[{"name":"Mix","value":20,"unit":"%"},{"name":"Pre Delay","value":18,"unit":"ms"},
            {"name":"Decay","value":1.6,"unit":"s"}]}
]
```
pickup: 벌스 넥 싱글(pos 5) 따뜻한 클린 또는 미들+넥(pos 4) 글래시 / 후렴 브릿지 험버커(pos 1)
switching: {"A":"후렴 — Chief 디스토션 ON (미드 푸시 크런치 벽)","B":"간주/앰비언트 — Delay ON (점8분 313ms 공간 확장)"}

## Variation: 두꺼운 벽 — 마샬 크런치 베이스 (JCM900, 더 록킹)
세컨이 후렴 벽을 더 많이 짊어져야 할 때(퍼스트가 리드/리프에 집중). **UK 900(Marshall JCM900)**을 크런치 직전으로 깔고, 벌스는 **넥 싱글 + 기타 볼륨을 ≈6–7로 다운**해 완전 클린은 아니지만 부드럽게 받친다(아토모스페릭보다 록킹한 해석). 후렴은 볼륨 풀 + 브릿지 험버커로 벽, 풋스위치 A의 **TS-808**(Gain 3·Tone 6)으로 저역을 조이고 게인을 밀어 파워코드 윤곽을 또렷하게. **Mid 7**로 미드를 강하게 밀어 합주 믹스에서 베이스·보컬과 안 뭉개지고 칼같이 자리 잡는다 — 세컨 기타의 핵심. 모듈레이션은 빼 타이트하게, 공간은 짧은 **Room**(Mix 16%·Decay 1.0s)만. 간주는 B로 점8분 딜레이.
체인: 기타(넥→브릿지) → OD(TS-808, FS A) → AMP(UK 900) → CAB(UK 30) → Delay(점8분 313ms, FS B) → Reverb(Room).

```signal_chain
[
  {"type":"OD","model":"TS-808","base_gear":"Ibanez TS-808","enabled":false,"footswitch":"A",
   "knobs":[{"name":"Gain","value":3},{"name":"Tone","value":6},{"name":"Volume","value":6.5}]},
  {"type":"AMP","model":"UK 900","base_gear":"Marshall JCM900","enabled":true,
   "knobs":[{"name":"Gain","value":5.5},{"name":"Bass","value":4.5},{"name":"Mid","value":7},
            {"name":"Treble","value":6.5},{"name":"Presence","value":5.5},{"name":"Volume","value":5.5}]},
  {"type":"CAB","model":"UK 30","base_gear":"Marshall 1960A","enabled":true,"knobs":[]},
  {"type":"DLY","model":"Digital Delay S","enabled":false,"footswitch":"B",
   "knobs":[{"name":"Time","value":313,"unit":"ms"},{"name":"Feedback","value":20,"unit":"%"},
            {"name":"Mix","value":13,"unit":"%"}]},
  {"type":"RVB","model":"Room","enabled":true,
   "knobs":[{"name":"Mix","value":16,"unit":"%"},{"name":"Pre Delay","value":15,"unit":"ms"},
            {"name":"Decay","value":1.0,"unit":"s"}]}
]
```
pickup: 벌스 넥 싱글(pos 5) + 기타 볼륨 ≈6–7(클린업) / 후렴 브릿지 험버커(pos 1) 볼륨 풀
switching: {"A":"후렴 — TS-808 ON (저역 타이트 + 게인 푸시)","B":"간주 — Delay ON (점8분 313ms)"}

## Variation: 앰비언트 레이어 — AC30 챙챙 + 큰 공간계 (텍스처 세컨)
세컨이 리듬보다 **공간을 칠하는 레이어**를 맡을 때. **Foxy 30TB(VOX AC30 Top Boost)**의 챙챙한(chimey) 클린을 Char **Cool**로 맑게, Gain 3.5로 브레이크업 직전까지만 — 아르페지오·스웰이 차갑게 번진다. 큰 딜레이(**4분 417ms**, Feedback 32%)와 **Shimmer** 리버브(옥타브 위가 반짝이는 앰비언트 — '얼음'의 결빙 질감)로 곡의 넓은 공간을 채운다. 후렴엔 풋스위치 A의 **TS-808**(Gain 2.5)으로 AC30 특유의 챙챙 크런치 파워코드를 살짝 얹고, B로 4분 딜레이 워시를 연다. **퍼스트가 드라이브 벽을 맡을 때** 가장 잘 어울리는 텍스처 역할 — 단 Shimmer/딜레이 Mix는 합주에서 과하면 묻으니 18~20%로 절제.
체인: 기타(미들+넥) → OD(TS-808, FS A) → AMP(Foxy 30TB) → CAB(Foxy 2x12) → Chorus(상시) → Delay(4분 417ms, FS B) → Reverb(Shimmer).

```signal_chain
[
  {"type":"OD","model":"TS-808","base_gear":"Ibanez TS-808","enabled":false,"footswitch":"A",
   "knobs":[{"name":"Gain","value":2.5},{"name":"Tone","value":6},{"name":"Volume","value":6}]},
  {"type":"AMP","model":"Foxy 30TB","base_gear":"VOX AC30HW Top Boost","enabled":true,
   "knobs":[{"name":"Gain","value":3.5},{"name":"Bass","value":5},{"name":"Treble","value":7},
            {"name":"Tone cut","value":4},{"name":"Volume","value":6}]},
  {"type":"CAB","model":"Foxy 2x12","base_gear":"VOX AC30","enabled":true,"knobs":[]},
  {"type":"MOD","model":"G-Chorus","base_gear":"앙상블 코러스","enabled":true,
   "knobs":[{"name":"Depth","value":4},{"name":"Rate","value":3},{"name":"Volume","value":5}]},
  {"type":"DLY","model":"Digital Delay S","enabled":false,"footswitch":"B",
   "knobs":[{"name":"Time","value":417,"unit":"ms"},{"name":"Feedback","value":32,"unit":"%"},
            {"name":"Mix","value":20,"unit":"%"}]},
  {"type":"RVB","model":"Shimmer","enabled":true,
   "knobs":[{"name":"Mix","value":18,"unit":"%"},{"name":"Pre Delay","value":20,"unit":"ms"},
            {"name":"Decay","value":3.0,"unit":"s"},{"name":"High End","value":6}]}
]
```
pickup: 미들+넥(pos 4) 글래시 아르페지오 — 더 따뜻하게는 넥 싱글(pos 5)
switching: {"A":"후렴 — TS-808 ON (AC30 챙챙 크런치)","B":"앰비언트 — Delay ON (4분 417ms 워시)"}
