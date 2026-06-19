# GP-150 이펙트 블록 레퍼런스

AMP/CAB 외 모든 이펙트 모듈(NR · PRE · WAH · DST · EQ · MOD · DLY · RVB · VOL)의 전체 모델 목록.
모델명은 상표 회피 변형이며 괄호에 실제 기반 기기를 적었다. 체인 순서·DSP 규칙은 [[gp150-hardware]] 참고.

---

# 앰프 앞단 (NR · PRE · WAH · DST)

## NR — 노이즈 게이트

- **Gate 1** (기반: ISP Decimator) — 선형 릴리즈(LTVP). 노브: Threshold
- **Gate 2** — 어택/릴리즈 조절 가능한 유연한 게이트. 노브: Threshold, Attack, Release
- **Gate 3** — Inverse Expander, 서스테인·다이내믹 보존하며 정밀 차단. 노브: Threshold, Attack, Release, Hold

## COMP — 컴프레서

- **Comp** (기반: Ross Compressor) — 컴프 효과의 원조, 자연스럽고 부드러움. 노브: Sustain, Volume
- **COMP4** (기반: Keeley C4) — 4노브 스튜디오급, 맑은 위계감+고역 강화. 노브: Sustain, Attack, Volume, Clipping

## Boost — 부스트

- **Micro Boost** (기반: MXR M133 Micro Amp) — 20dB, 톤 유지 부스트. 노브: Gain
- **B-Boost** (기반: Xotic BB Preamp) — 최대 30dB, 두껍고 크리미. 노브: Gain, Volume, Bass/Treble
- **14 Boost** (기반: Fortin Grind) — 20dB, 타이트+어그레션, 저노이즈. 노브: Gain
- **EP Booster** (기반: Xotic EP Booster) — 20dB, 강한 저역+밝은 고역. 노브: Gain, +3dB, Bright

## OD — 오버드라이브

- **TS-808** (기반: Ibanez TS-808 Tube Screamer) — 전설의 투명 OD, 따뜻하고 섬세. 노브: Gain, Tone, Volume
- **TS9** (기반: Ibanez TS9 Tube Screamer) — 프리앰프 푸시, 순수 OD/크런치. 노브: Gain, Tone, Volume
- **OD 9** (기반: Ibanez TS9) — TS9 변형. 노브: Gain, Tone, Volume
- **Yellow OD** — 비대칭 회로, 원음에 가까운 70년대 톤. 노브: Gain, Volume
- **Penesas** (기반: Klon Centaur) — 앰프 인 어 박스, 미니 게인=클린 부스트. 노브: Gain, Tone, Volume
- **Super OD** — 비대칭, 따뜻하고 유쾌한 OD. 노브: Gain, Tone, Volume
- **Blues OD** — 자연 OD~풀 디스토션, 표현력 넓음. 노브: Gain, Tone, Volume
- **Scream OD** (기반: Tube Screamer 스타일) — Fat 노브 추가. 노브: Gain, Volume, Tone, Fat
- **Force** (기반: Fulltone OCD) — 풀하고 튜브 같은 응답. 노브: Gain, Tone, Volume, Mode
- **Tube Clipper** (기반: 12AX7 튜브 OD) — 바이올린 같은 서스테인. 노브: Gain, Vol, Bass, Treble
- **TaiChi OD** (기반: Hermida Zendrive) — 튜브 같은 톤, 포화/배음 균형. 노브: Gain, Tone, Volume, Voice

## Fuzz — 퍼즈

- **Lazaro** (기반: EHX Big Muff Pi) — 따뜻하고 두꺼운 사운드. 노브: Sustain, Tone, Volume
- **Fuzz Face** (기반: Dallas-Arbiter Fuzz Face) — 1966 전설, 무겁고 예리. 노브: Fuzz, Volume
- **Plustortion** (기반: MXR M104 Distortion+) — 게르마늄 소프트 클리핑(Randy Rhoads). 노브: Gain, Volume

## DST — 디스토션

- **Red Haze** — 클래식 3노브 디스토션, 70~80년대 톤. 노브: Gain, Tone, Volume
- **SM Dist** — 클래식 3노브 디스토션, 70~80년대 톤. 노브: Gain, Tone, Volume
- **Darktale** (기반: ProCo RAT, LM308) — 넓은 필터, 밝고 컴팩트. 노브: Gain, Filter, Volume
- **Chief** (기반: Marshall Guv'nor) — 1988 마샬 튜브 사운드, 컴프레션 터치. 노브: Gain, Volume, Bass/Middle/Treble
- **La Charger** (기반: Marshall Guv'nor) — 컴팩트 마샬 톤. 노브: Gain, Tone, Volume
- **Flagman Dist** — 모던 영국 하이게인, 직관적 조작. 노브: Gain, Volume, Bass/Treble, Presence, Tight

## Filter — 필터 (PRE)

- **T-Wah** — 터치 민감 엔벨로프 필터(터치 와). 노브: Sens, Range, Q, Mix, Mode(Guitar/Bass)
- **Auto Filter** — 레이트로 자동 반복되는 오토 와. 노브: Depth, Rate, Volume, Low, High, Q, Sync
- **Step Filter** — 4스텝 오토 필터, 신스 사운드. 노브: Step 1–4, Rate, Sync

## Pitch — 피치 (PRE)

- **OCTA** — 폴리포닉 옥타브. 노브: Low Oct, High Oct, Dry
- **P-Bend** — 폴리포닉 피치 시프터/하모나이저. 노브: Low/Hi Pitch, Dry, Low/Hi Vol (변형: Wet, Range)
- **A-Wah** — 오토 와 스타일 피치 효과.
- **Hammy** (기반: DigiTech Whammy) — 모노 피치 시프터, 익스프레션 페달 제어. 노브: Range, Harmony, Volume, Position

## WAH — 와우 페달

- **V-Wah** (기반: VOX V846) — 가장 오래된 와, 진정성 있는 톤. 노브: Range, Q, Volume
- **C-Wah** (기반: VOX V846) — V846 또 다른 변형. 노브: Range, Q, Volume
- **B-Wah** — 베이스 전용 와. 노브: Range, Q, Volume

> 와우는 익스프레션 페달에 Position을 먼저 할당해야 동작. → [[gp150-hardware]]

## Special / Simulator (PRE)

- **Ring Mod** — 비조화 주파수(벨/차임) 링 모듈레이터. 노브: Mix, Freq, Fine, Tone
- **Saturate** — 빈티지 테이프 포화, 아날로그 온기. 노브: Mix, Volume, High Cut
- **AC Sim** — 어쿠스틱 기타 시뮬. 노브: Body, Top, Volume, Mode(Standard/Jumbo/Enhanced/Piezo)
- **H to S** — ST 스타일 브릿지 픽업 시뮬(험→싱글). 노브: Volume, Tone
- **S to H** — LP 스타일 브릿지 픽업 시뮬(싱글→험). 노브: Volume, Tone

---

# 앰프 뒤단 (EQ · MOD · DLY · RVB · VOL)

## EQ — 이퀄라이저

- **Guitar EQ 1** — 기타 5밴드(125Hz/400Hz/800Hz/1.6kHz/4kHz). 노브: Band 1–5, Volume
- **Guitar EQ 2** — 기타 5밴드(100Hz/500Hz/1kHz/3kHz/6kHz). 노브: Band 1–5, Volume
- **Bass EQ 1** — 베이스 5밴드(33Hz/150Hz/600Hz/2kHz/8kHz). 노브: Band 1–5, Volume
- **Mess EQ** (기반: Mesa/Boogie 5밴드) — 클래식 V자 사운드(80Hz/240Hz/750Hz/2.2kHz/6.6kHz). 노브: Band 1–5

## MOD — 모듈레이션

### 코러스 / 비브라토
- **G-Chorus** (기반: 70년대 말 앙상블 코러스) — 풍부하고 샤이머링. 노브: Depth, Rate, Volume, Sync
- **C-Chorus** (기반: 4버튼 퍼플 스테레오 코러스) — 풍부한 디테일. 노브: Mode(4종)
- **B-Chorus** (기반: 동) — 비브라토 모드, 음향 확장. 노브: Depth, Rate, Volume, Sync
- **V-Roto** (기반: BBD 블루 비브라토) — 자연스러운 아날로그. 노브: Depth, Rate, Sync
- **Vibrato** — 클래식 비브라토, 넓은 범위. 노브: Depth, Rate, Volume, Sync
- **Detune** — 미세 피치 이동 코러스(±50센트). 노브: Dry/Wet, Detune

### 플랜저
- **Jet** (기반: 클래식 플랜저) — 풍부하고 자연스러움. 노브: Depth, Rate, Pre Delay, Feedback, Sync
- **B-Jet** — 베이스용 플랜저. 노브: Depth, Rate, Pre Delay, Feedback, Sync

### 페이저
- **O-Phase** (기반: MXR M101 Phase 90) — EVH Eruption 사운드. 노브: Rate, Sync
- **Vibe** (기반: Shin-Ei Uni-Vibe) — Hendrix·Gilmour 클래식 페이징/코러스. 노브: Depth, Rate, Volume, Mode(Chorus/Vibrato), Sync

### 트레몰로
- **O-Trem** (기반: Demeter TRM-1 Tremulator) — 옵토 트레몰로(1982 Ry Cooder). 노브: Depth, Rate, Sync
- **Sine Trem** — 사인파 트레몰로. 노브: Depth, Rate, Volume, Sync
- **Triangle Trem** — 삼각파 트레몰로. 노브: Depth, Rate, Volume, Sync
- **Bias Trem** — 바이어스 트레몰로. 노브: Depth, Rate, Volume, Sync, Bias

### 특수 모듈
- **Auto Swell** — 자동 볼륨 스웰(바이올린 어택). 노브: Attack, Curve(Line/Exp/Log)
- **Hold** — 짧은 구간 프리즈/루프(EXP 페달 할당 가능). 노브: Volume, Activate
- **Freeze** — 활성 순간부터 사운드 루프(EXP 페달 할당). 노브: Volume, Attack, Release, Activate

## DLY — 딜레이

- **BBD Delay S** — 스테레오 아날로그(BBD), 따뜻함. 노브: Mix, Feedback, Time, Time R%, Spread, Level, Sync, Trail
- **Digital Delay S** — 스테레오 디지털, 깨끗·정확. 노브: Mix, Feedback, Time, Time R%, Spread, Level, Sync, Trail
- **Pure** — 순수·정밀 딜레이. 노브: Mix, Feedback, Time, Sync, Trail
- **Tape** — 솔리드스테이트 테이프 에코. 노브: Mix, Feedback, Time, Sync, Trail
- **Ping Pong** — 좌우 핑퐁 바운싱. 노브: Mix, Feedback, Time, Sync, Trail
- **Slapback** — 클래식 슬랩백. 노브: Mix, Feedback, Time, Trail
- **Sweep Echo** — 스윕 필터 모듈레이션 리피트. 노브: Mix, Feedback, Time, Sweep Depth/Rate, Swp Sync, Time Sync, Trail
- **Ring Echo** — 링 모듈레이션 리피트. 노브: Dly Mix, Feedback, Time, Ring Mix, Freq, Tone, Sync, Trail
- **Tube** — 튜브 드리븐 테이프 에코. 노브: Mix, Feedback, Time, Sync, Trail
- **Sweet Echo** (기반: 81~84 아날로그 딜레이) — 20~300ms 따뜻함. 노브: Mix, Feedback, Time, Sync, Trail
- **999 Echo** (기반: Maxon AD900) — 100% 아날로그, 유기적. 노브: Mix, Feedback, Time, Sync, Trail
- **Vintage Rack** — 80년대 랙 딜레이(샘플 감소). 노브: Mix, Feedback, Time, Mod, Tone, Sync, Trail
- **Rev Echo** — 역방향 피드백 딜레이. 노브: Mix, Feedback, Time, Volume, Sync, Trail
- **Dual Echo** — L/R 독립 듀얼 딜레이. 노브: Mix A/FB A/Time A, Mix B/FB B/Time B, A Sync, B Sync, Trail

> 곡 BPM에 맞춰 Sync(탭템포)로 1/4·점8분 노트값 지정. **Trail** 켜면 패치 전환 시 잔향 유지.

## RVB — 리버브

- **Room** — 방 공간감. 노브: Mix, Pre Delay, Decay, Trail
- **Hall** — 공연장 공간감. 노브: Mix, Pre Delay, Decay, Trail
- **Church** — 교회 공간감. 노브: Mix, Pre Delay, Decay, Trail
- **Plate** — 빈티지 플레이트. 노브: Mix, Decay, High Damp, Trail
- **Spring** — 빈티지 스프링(서프/빈티지 클린). 노브: Mix, Decay, Tone, Trail
- **Tube Spring** — 튜브 드리븐 스프링. 노브: Mix, Pre Delay, Decay, Low/Hi Damp, Mod, Trail
- **Concert** — 콘서트홀. 노브: Mix, Pre Delay, Decay, Low/Hi Damp, Mod, Trail
- **N-Star** — 특별 튜닝, 밝고 풍부한 데케이. 노브: Mix, Decay, Trail
- **Deepsea** — 깊고 광활한 데케이. 노브: Mix, Decay, Trail
- **Sweet Space** — 모듈레이션 리버브, 부드러움. 노브: Mix, Pre Delay, Decay, Low/High End, Trail
- **Shimmer** — 반짝이는 옥타브 리버브(앰비언트/포스트록). 노브: Mix, Pre Delay, Decay, Low/High End, Trail

## VOL — 볼륨 페달

- **Volume** — 톤 변화 없는 순수 볼륨. 노브: Volume

---

## 사용 원칙

- 곡에 실제로 들리는 이펙트만 넣는다. 안 들리면 빼는 게 톤·DSP에 이롭다.
- 공간계(DLY/RVB) Mix는 합주에서 묻히지 않게 과하지 않게.
- 곡 중 톤이 바뀌면 패치의 스위칭 플랜에 풋스위치(CTRL) 할당 명시. → [[gp150-hardware]]
