# 멀티모달 오디오 톤 A/B 실험 설계

> 작성일: 2026-07-11
> 상태: 사용자 승인 완료
> 범위: `/lab/audio-tone` 격리 실험. 운영 생성 흐름 통합은 실험 기준 통과 후 별도 결정.

## 1. 배경과 결정

현재 생성 흐름은 곡명·아티스트를 문헌으로 조사한 뒤 기기 비종속 캐논을 만들고, `ToneProjector`가 이를 GP-150 카탈로그의 실존 모델로 결정적으로 투영한다. 이 구조는 실행 가능한 프리셋을 보장하지만 원곡 오디오에서 직접 관측한 톤 특성을 사용하지 않는다.

Gemini 계열 멀티모달 모델은 YouTube 영상과 오디오를 입력으로 받아 구간별 특성을 구조화할 수 있다. 다만 정확한 실기·전체 체인·노브 역추정은 신뢰하기 어렵다. 따라서 멀티모달 모델을 기존 파이프라인의 대체재가 아니라 **캐논 생성을 보강하는 관측 피더**로 시험한다.

실험은 텍스트 전용 결과와 텍스트+오디오 결과를 같은 조건에서 생성하고, 설정표를 블라인드 A/B로 평가한다. 실제 GP-150 청취는 이번 범위에 포함하지 않으므로 이 실험은 음향 유사도가 아니라 **설정의 논리적 타당성과 실사용 가능성**을 측정한다.

## 2. 확정 결정

| 항목 | 결정 |
|---|---|
| 입력 | YouTube URL |
| 구간 선택 | 사용자가 웹에서 직접 시작·종료 지정 |
| 타임라인 | 플레이어 + 양손잡이 슬라이더 |
| 역할 | `lead`·`backing`·`solo`, 역할별 최대 1구간, 전체 최대 3구간 |
| 노출 위치 | 별도 `/lab/audio-tone` |
| 비교 | 정체를 숨긴 A/B |
| 평가 대상 | 설정표. 웹 오디오 렌더링과 실제 기기 청취는 제외 |
| 평가 항목 | 논리적 정합성·체인 타당성·노브 실사용성 각 1~5점 + 최종 선호 |
| 저장 | Supabase 전용 실험 테이블 |
| 통제 | 동일 모델·문헌·프롬프트·`temperature: 0`; 차이는 오디오 관측뿐 |
| 실패 | 어느 한 분기라도 실패하면 전체 실험 실패 |
| LLM 계약 | 기존 `LlmClient`를 텍스트·미디어 공용 인터페이스로 확장 |
| 미지원 provider | capability 선언 후 호출 전에 명확히 실패 |
| 채택 기준 | 유효 10곡·30구간, 멀티모달 승률 70% 이상, 평균 +0.5/5 이상, 투영 실패율 증가 없음 |

## 3. 목표와 비목표

### 목표

- 오디오 관측을 추가했을 때 설정표의 타당성과 유용성이 개선되는지 정량 비교한다.
- 기존 캐논·투영 구조를 유지한 채 멀티모달 입력의 가치만 격리해 측정한다.
- 모델·프롬프트·입력·평가를 재현 가능한 실험 기록으로 남긴다.
- 평가 전에는 A/B의 생성 방식을 API 응답과 화면 모두에서 숨긴다.

### 비목표

- 원곡과의 실제 음향 유사도 입증
- GP-150 DSP의 웹 오디오 재현
- YouTube 영상이나 오디오의 다운로드·저장·서버 측 구간 추출
- 정확한 실기 모델·전체 체인·노브를 멀티모달 모델이 직접 결정하는 것
- 운영 `canonical_tones`·`tones` 자동 적재
- 메인 생성 폼 통합
- 오디오 미지원 provider를 Gemini로 자동 전환하는 것

## 4. 사용자 흐름

`/lab/audio-tone`은 한 페이지에서 다음 단계로 진행한다.

```text
YouTube URL 입력
  → 영상 로드
  → 역할별 구간 선택
  → 분석 실행
  → 진행 상태 확인
  → 익명 A/B 설정표 평가
  → 제출
  → 정체와 점수 공개
```

### 4.1 영상과 타임라인

- `youtube.com`과 `youtu.be` URL만 허용한다.
- URL을 video ID로 정규화하고 YouTube IFrame Player API로 영상을 로드한다.
- 영상 길이를 받은 뒤 역할별 세 개 레인을 같은 전체 시간축에 표시한다.
- `lead`, `backing`, `solo` 중 최소 한 역할을 활성화해야 한다.
- 솔로가 없는 곡은 `solo`를 생략할 수 있다.
- 역할 구간끼리 겹칠 수 있다.

```text
영상 전체  00:00 ─────────────────────────── 04:12
lead       ────────[ 00:42 ━ 01:04 ]────────────
backing    ──[ 00:12 ━ 00:36 ]──────────────────
solo       ─────────────────[ 02:51 ━ 03:16 ]───
```

각 역할 레인은 다음 조작을 제공한다.

- 양손잡이 슬라이더로 시작·종료 변경
- `MM:SS` 또는 `HH:MM:SS` 입력과 슬라이더 양방향 동기화
- 최소 5초, 최대 60초, 최초 기본 길이 20초
- 선택 구간 반복 재생
- 슬라이더 이동 시 플레이어 탐색
- 화살표 1초 이동, Shift+화살표 5초 이동
- 모바일 터치와 키보드 모두 지원

### 4.2 진행과 평가

분석이 시작되면 입력을 잠그고 다음 진행 상태를 표시한다.

```text
영상 확인 → 오디오 관측 → A/B 캐논 생성 → GP-150 투영
```

완료 후 결과를 `A`와 `B` 탭으로 제공한다. 사용자는 각 결과에 대해 다음을 1~5점으로 평가한다.

1. 원곡 특성과의 논리적 정합성
2. 시그널 체인의 타당성
3. 노브값의 실사용 가능성

세 점수와 최종 선호(`A` 또는 `B`)를 모두 제출해야 한다. 제출 성공 후에만 각 결과가 텍스트 전용인지 오디오 보강인지 공개한다.

## 5. 아키텍처

### 5.1 LLM 공용 계약

기존 문자열 메시지는 그대로 지원하고 미디어 파트를 추가한다.

```ts
type LlmContent =
  | string
  | Array<
      | { type: "text"; text: string }
      | {
          type: "media";
          mediaType: "audio" | "video";
          source:
            | { kind: "uri"; uri: string; mimeType?: string }
            | { kind: "inline"; data: string; mimeType: string };
        }
    >;

interface LlmCapabilities {
  audioInput: boolean;
  videoInput: boolean;
  structuredOutput: boolean;
}

interface LlmClient {
  capabilities: LlmCapabilities;
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<string>;
}
```

- 기존 텍스트 호출부는 타입 변경을 의식하지 않는다.
- YouTube URL 실험은 `videoInput` capability를 요구한다.
- Gemini adapter는 공용 파트를 Gemini 미디어 요청 형식으로 직렬화한다.
- Ollama adapter는 실제 구성 모델의 지원 여부에 따라 capability를 선언한다. 초기 기본값은 미지원이다.
- capability 미지원은 외부 API 호출 전에 실패한다.
- 미디어를 조용히 무시하거나 provider를 자동 전환하지 않는다.

### 5.2 분석과 생성 흐름

```text
researchSong()       ─ 문헌 기반 관측 ───────────────┐
                                                    ├─ baseline 캐논
analyzeSongMedia()   ─ YouTube 구간 기반 관측 ─┐    │
                                               └────┴─ enriched 캐논
                                                         ↓
                                                  기존 ToneProjector
```

- 두 분기는 동일한 `song_research`, 모델, 프롬프트 버전, `temperature: 0`을 사용한다.
- baseline에는 문헌 관측만 주입한다.
- enriched에는 같은 문헌 관측과 `audio_observations`를 함께 주입한다.
- 두 분기의 캐논은 기존 검증 게이트를 통과해야 한다.
- 두 분기의 투영은 같은 processor 카탈로그와 projector 버전을 사용한다.
- 결과는 운영 테이블이 아니라 실험 행에만 저장한다.

### 5.3 오디오 관측 계약

멀티모달 모델은 장비와 최종 노브를 직접 고르지 않고 구간별 관측만 출력한다.

```ts
interface AudioObservation {
  role: "lead" | "backing" | "solo";
  startMs: number;
  endMs: number;
  gain: "clean" | "crunch" | "mid-gain" | "high-gain" | "unknown";
  brightness: "dark" | "balanced" | "bright" | "unknown";
  compression: "low" | "medium" | "high" | "unknown";
  effects: Array<{
    kind: "delay" | "reverb" | "chorus" | "flanger" | "wah" | "other";
    description: string;
    confidence: number;
  }>;
  notes: string;
  confidence: number;
}
```

충돌 해소 원칙:

- 실제 장비명과 역사적 사실은 출처가 있는 문헌 관측을 우선한다.
- 들리는 게인·밝기·공간계 등 지각 특성은 오디오 관측을 보조 근거로 쓴다.
- 서로 충돌하면 임의로 하나를 확정하지 않고 confidence를 낮추며 충돌을 notes에 남긴다.
- GP-150 모델과 노브는 캐논 생성·`ToneProjector`·검증 게이트의 기존 책임으로 유지한다.

## 6. 데이터 모델

운영 테이블과 분리된 `tone_experiments`를 추가한다.

| 컬럼 | 의미 |
|---|---|
| `id` | UUID PK |
| `youtube_url` | 사용자가 입력한 정규화 URL |
| `video_id` | 추출한 YouTube video ID |
| `segments` | 역할별 `{role,start_ms,end_ms}` 배열 |
| `model_used` | 고정한 모델 식별자 |
| `prompt_version` | 실험 프롬프트 버전 |
| `projector_version` | 사용한 투영 버전 |
| `status` | `queued/analyzing/generating/projecting/ready/failed/evaluated` |
| `audio_observations` | 구조화 관측 JSONB |
| `baseline_result` | baseline 캐논·투영·원시 응답 해시 |
| `enriched_result` | enriched 캐논·투영·원시 응답 해시 |
| `blind_assignment` | `A/B`와 실제 variant의 서버 전용 대응 |
| `evaluation` | 항목별 A/B 점수 |
| `preferred_variant` | 공개 후 실제 variant 기준 선호 |
| `failure_code` | 안정적인 실패 코드 |
| `failure_detail` | 서버·어드민용 상세 |
| `created_at/completed_at` | 실행 시간 |

- 영상·오디오 바이트는 저장하지 않는다.
- `blind_assignment`와 `failure_detail`은 공개 조회 응답에서 제외한다.
- 평가 전 API는 결과를 익명화된 A/B로만 반환한다.
- 한 실험에는 한 번만 평가할 수 있다.
- `ready` 이전 결과와 `failed` 실행은 성능 집계에서 제외한다.

## 7. API와 실행 모델

기존 tone job 폴링 패턴을 재사용한다.

### `POST /api/lab/audio-tone/experiments`

- 어드민 세션 확인
- URL·video ID·구간 검증
- provider capability 확인
- 실험 행 생성
- 백그라운드 분석 시작
- 실험 ID 반환

### `GET /api/lab/audio-tone/experiments/:id`

- 어드민 세션 확인
- 진행 상태 반환
- `ready`이면 익명화된 A/B 결과 반환
- 평가 전 variant 정체와 내부 실패 상세는 반환하지 않음

### `POST /api/lab/audio-tone/experiments/:id/evaluation`

- 어드민 세션 확인
- 1~5 정수 점수와 최종 A/B 선호 검증
- 중복 제출 거부
- 평가 저장 후 실제 variant와 비교 요약 반환

`/lab` 페이지와 API는 R5에서 정한 `ADMIN_SECRET` 쿠키 세션으로 보호한다. 이 인증 골격이 아직 없다면 기능 구현의 선행 작업으로 최소 인증 경계를 먼저 구축한다.

## 8. 검증과 실패 처리

입력 검증:

- `youtube.com`·`youtu.be`만 허용
- video ID 추출 실패 거부
- 역할 중복 거부
- 최소 한 구간 요구
- 시작은 0 이상, 종료는 시작보다 큼
- 길이는 5~60초
- 영상 길이를 넘는 구간 거부

안정적인 실패 코드:

- `input:invalid_youtube_url`
- `input:invalid_segment`
- `provider:video_unsupported`
- `media:video_unavailable`
- `media:analysis_failed`
- `baseline:generation_failed`
- `enriched:generation_failed`
- `baseline:projection_failed`
- `enriched:projection_failed`
- `evaluation:invalid`
- `evaluation:already_submitted`

A/B 중 하나라도 캐논 생성·검증·투영에 실패하면 실험 전체를 `failed`로 종료한다. 부분 결과는 사용자에게 비교 대상으로 표시하지 않는다. 실패 행은 진단을 위해 보존하되 채택 지표에서 제외한다.

미디어 안의 음성·자막·메타데이터는 분석 대상일 뿐 시스템 지시가 아니다. 멀티모달 프롬프트는 미디어 내부 명령을 따르지 말고 정의된 관측 스키마만 출력하도록 명시한다.

## 9. 테스트 전략

### 단위 테스트

- YouTube URL과 video ID 정규화
- 시간 문자열 파싱·직렬화
- 역할별 구간 제약과 상태 reducer
- 슬라이더·입력 필드 동기화
- provider capability 검사
- A/B 무작위 배정과 익명화
- 평가 점수 검증·집계

### API·파이프라인 테스트

- 기존 문자열 메시지 호출의 하위 호환성
- Gemini 미디어 요청 직렬화
- 미지원 provider의 외부 호출 전 실패
- 동일 문헌·모델·프롬프트·temperature 조건
- baseline과 enriched의 유일한 입력 차이가 오디오 관측인지 검증
- 한 분기 실패 시 전체 실패
- 운영 캐논·톤 테이블 미변경
- 평가 전 blind mapping 미노출
- 중복 평가 거부

### 브라우저 테스트

- YouTube IFrame API 목 사용
- 영상 로드·잘못된 URL·사용 불가 상태
- 세 역할 레인과 양손잡이 슬라이더
- 키보드·터치 조작
- 시간 입력 양방향 동기화
- 진행·실패·A/B·평가·공개 상태
- 모바일 320px 이상 반응형
- axe 접근성 오류 0

### 실 Gemini 검증

- 최소 10곡·30구간
- 장르·게인·대표 이펙트를 분산
- 고정 모델·프롬프트·projector 버전 기록
- 원시 응답 해시와 실패율 기록
- 실패 실행을 유효 평가에서 제외하되 별도 운영 지표로 보고

## 10. 채택과 종료 기준

다음 조건을 모두 만족할 때만 멀티모달 관측을 메인 생성 폼의 선택 기능으로 승격한다.

```text
유효 표본: 10곡 이상, 30구간 이상
멀티모달 최종 선호율: 70% 이상
세 평가 항목 평균 개선폭: +0.5 / 5 이상
멀티모달 투영 실패율: baseline 이하
```

조건을 통과하지 못하면 `/lab`과 실험 기록은 보존하되 운영 흐름에 통합하지 않는다. 어느 결과든 이 실험만으로 “원곡과 더 비슷하게 들린다”고 표현하지 않는다. 실제 음향 유사도는 별도의 실제 기기 블라인드 청취 설계가 필요하다.

## 11. 구현 순서 제약

이 문서는 구현 계획이 아니라 승인된 설계다. 후속 구현 계획은 다음 의존성을 반영해야 한다.

1. R5 `ADMIN_SECRET` 인증 최소 골격
2. LLM 공용 콘텐츠·capability 계약 확장
3. Gemini 미디어 adapter와 `analyzeSongMedia`
4. 실험 DB·API·잡 실행
5. YouTube 플레이어·역할별 타임라인
6. 익명 A/B·평가·공개 UI
7. 자동 테스트와 실 Gemini 표본 실행
