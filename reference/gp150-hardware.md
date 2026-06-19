# GP-150 하드웨어 · 시그널 체인 레퍼런스

Valeton GP-150 (펌웨어 V1.0.5) 매뉴얼 기준. 패치를 짤 때 알아야 할 본체 구조·조작계·이펙트 체인 규칙 정리.

## 전면/측면 패널 (번호는 매뉴얼 기준)

| # | 컨트롤 | 기능 |
|---|--------|------|
| 1 | LCD Display | 컬러 LCD. 패치 번호·이름·동작 정보 표시 |
| 2 | Charging Indicator | 충전 중 적색 점등 |
| 3 | **MASTER Knob** | 메인 출력 볼륨 |
| 4 | **PARA Knob** (누름 버튼 겸용) | 메인 화면: 돌려서 패치 전환 / 편집 화면: 커서 이동·길게 눌러 모듈 순서 변경·눌러 파라미터 페이지 전환 |
| 5 | **Quick Access Knobs** (3개) | 화면 하단에 표시된 파라미터 조정. 표시 항목에 따라 기능이 바뀜 |
| 6 | BACK 버튼 | 이전 화면으로 |
| 7 | GLOBAL 버튼 | 글로벌 설정 화면 진입 |
| 8 | BT 버튼 | 블루투스 무선 on/off |
| 9 | EDIT 버튼 | 편집 화면(이펙트 체인) 진입 |
| 10 | SAVE 버튼 | 저장/이름변경/복사. 길게 = 퀵세이브 |
| 11 | DRUM 버튼 | 드럼 재생. 길게 = 드럼 머신 화면 |
| 12 | EXP Indicator | 익스프레션 페달 상태(2색) |
| 13 | BT Indicator | 블루투스 상태 |
| 14 | **풋스위치 2개 (A/B)** | 패치 전환·이펙트 on/off·탭템포 등 |
| 15 | **익스프레션 페달** | 볼륨 포함 이펙트 파라미터 제어. 발끝으로 꾹 = EXP 상태 전환 |
| 16 | EXP/FS Jack | 1/4" TRS. 외부 익스프레션/풋스위치 컨트롤러. MIDI IN 호환 |
| 17 | IN Jack | 1/4" TS. 기타/악기 입력 |
| 18 | OUT (L) Jack | 1/4" TS 언밸런스 출력. 모노는 L만 사용 |
| 19 | OUT (R) Jack | 1/4" TRS. 밸런스/언밸런스 출력 모두 지원 |
| 20 | PHONES/MIC Jack | 1/8" TRRS. 헤드폰/헤드셋 |
| 21 | USB Jack | USB 2.0 Type-C. 오디오 인터페이스·데이터 전송·충전·역충전 |
| 22 | POWER 버튼 | 전원 on/off·리셋 |
| 23 | DC 9V Jack | 전원/충전 |

## 이펙트 체인 (12개 모듈 슬롯)

기본 신호 순서:

```
NR → PRE → WAH → DST → N→S → AMP → CAB → EQ → MOD → DLY → RVB → VOL
```

| 약어 | 모듈 | 역할 |
|------|------|------|
| NR | Noise Gate | 노이즈 게이트 |
| PRE | Pre-Effects | 컴프/부스트/필터/피치 등 앰프 앞단 |
| WAH | Wah-Wah Pedal | 와우 |
| DST | Distortion/Overdrive | 드라이브·디스토션·퍼즈 |
| N→S | SnapTone | 스냅톤(앰프 캐릭터 보조) |
| AMP | Amp Sim | 앰프 시뮬 |
| CAB | Cab Sim | 캐비넷/스피커 시뮬 |
| EQ | Equalizer | 이퀄라이저 |
| MOD | Modulation | 코러스/플랜저/페이저/트레몰로 등 |
| DLY | Delay | 딜레이 |
| RVB | Reverb | 리버브 |
| VOL | Volume Pedal | 볼륨 페달 |

- **모듈 순서 변경**: 편집 화면에서 모듈 선택 후 PARA 노브 길게 눌러 이동 → 돌려서 위치 지정 → 눌러 확정. 순서가 톤에 크게 영향.
- **VOL 위치 주의**: VOL이 체인 맨 뒤면 볼륨을 줄일 때 딜레이/리버브/모듈레이션 잔향까지 즉시 잘림. 자연스러운 감쇠를 원하면 공간계 **앞쪽**에 VOL 배치.
- **DSP 부하**: 이펙트를 많이 켤수록 DSP %가 올라감. 100% 초과 불가 — 초과되면 효과 이름이 회색으로 비활성화됨. 안 쓰는 모듈은 **None**으로 설정해 DSP 확보.

## 풋스위치 모드

- **Patch Mode**: A/B로 패치 전환(해당 LED 링 점멸). PARA로도 전환 가능.
- **Stomp Mode**: 풋스위치가 모듈 on/off(CTRL) 수행. 풋스위치 B 길게 또는 글로벌 설정으로 모드 전환.
- **CTRL (풋스위치 모듈 제어)**: 패치당 최대 6개 모듈 제어. 한 모듈은 한 풋스위치에만 할당. 풋스위치 1개가 최대 3개 모듈 동시 토글. CTRL A(풋스위치 A) / CTRL B(풋스위치 B). LED 링 색(녹/적)이 묶인 모듈들의 종합 on/off 상태 표시.

## 익스프레션 페달 (EXP)

- 한 상태당 최대 **3개 파라미터** 동시 제어.
- 3가지 상태: **EXP 1-A**(내장 페달, 파란 EXP LED) / **EXP 1-B**(내장 페달, 주황 EXP LED, 발끝 꾹 눌러 토글) / **EXP 2**(EXP/FS 잭에 연결한 외부 페달).
- 각 파라미터에 Min/Max 지정(0~100) → heel-down/toe-down 응답 정의. 기본 Min=0, Max=100.
- 기본값: EXP 1-A 첫 파라미터가 VOL 모듈을 0~100 제어 → EXP LED 파란색일 때 내장 페달이 볼륨 페달로 동작.

## 퀵 액세스 노브 커스터마이즈

- 화면 하단 노브 3개(좌→우)에 임의 파라미터 매핑. 메인 화면에서만 적용.
- Module 1~3 옵션: Off, Patch Volume, BPM, VOL 제외 체인 내 임의 모듈.
- 기본: Knob1 = P-VOL(패치 볼륨), Knob2 = BPM, Knob3 = Off.

## 패치 설정값

- **Patch Volume**: 0~100 (기본 50)
- **BPM**: 40~300 (기본 120). 드럼 머신과 동기화 가능(Drum Sync).

## 글로벌 EQ

마스터 출력 직전 글로벌 EQ. **Low/High Cut 필터 + 4밴드 파라메트릭 EQ + 마스터 이펙트 볼륨**.

- Enable/Disable, Volume(글로벌 EQ 출력)
- High-Pass Filter(저역 컷), Low-Pass Filter(고역 컷)
- 4밴드 Peak Filter(각 밴드 주파수/게인/Q)
- 주의: 글로벌 EQ는 **USB 오디오 출력에는 적용되지 않음**.

## 출력 모드 / CAB 운용 (연결 환경별 권장)

- **No CAB Mode (L/R)**: CAB 모듈을 원터치로 on/off 하는 출력 설정. 채널별 오디오 응답 정의.
- **풀레인지 모니터/PA/녹음**: AMP·CAB 모듈 **ON**, No CAB Mode **OFF** 유지가 최선.
- **기타 앰프 INPUT 연결**: AMP·CAB 모듈 **OFF**가 톤상 유리(TS 케이블).
- **기타 앰프 FX Return / 파워앰프**: EQ·MOD·DLY·RVB 모듈만 쓰는 것을 권장, AMP·CAB OFF.
- **Auto CAB Match**: 켜면 AMP 모듈을 바꿀 때 CAB 선택이 자동으로 따라 바뀜.

## 튜너 / 탭템포 / 드럼

- **튜너**: 풋스위치 A+B 동시 진입. 모드 Bypass/Mute(기본 Mute), 기준 피치 설정, 튜닝 템플릿 선택.
- **탭템포(TAP)**: 메인 화면에서 풋스위치 A 길게 진입. 누르는 간격으로 BPM 설정.
- **드럼 머신**: 장르 리듬(Funk/R&B/Jazz 등) + 패치 BPM 동기화.
