# 파서 입력 계약 (md → 타입 상수)

패치 md를 빌드 타임에 **타입 상수**로 굽기 위한 **권위 스펙.** 생산자(`tone-builder` 스킬)와 소비자(빌드 파서)가 둘 다 이 문서를 따른다. DB·런타임 스토어 없음 — 파서 산출물은 정적 TS 상수다.

원칙: **사람이 읽는 줄글은 그대로 두고**, 기계가 읽는 부분만 구조화한다. 파서는 frontmatter와 `signal_chain` 펜스만 읽고 줄글은 파싱하지 않는다 → 줄글이 어떻게 바뀌어도 안 깨진다.

## 파일 단위

- 한 곡 = 한 파일: `patches/<rig>/<artist>-<song>.md`
- 파일 안에 **변주 N개**(권장 3). 변주 = `## Variation:` 헤더 단위.

## 레이아웃

````markdown
---
artist: Oasis
title: Don't Look Back in Anger
rig: g250-gp150
genre: 브릿팝
confidence: 보통~높음        # 높음 | 보통 | 낮음 (+ 자유 텍스트 허용)
---

# Oasis – Don't Look Back in Anger   <!-- 사람용 제목, 파서 무시 -->

## Variation: 정석 JCM800
정석 마샬 크런치. 미드 푸시가 핵심. (사람이 읽는 줄글 — 파서 무시)

```signal_chain
[
  {"type":"OD","model":"TS-808","base_gear":"Ibanez TS-808","enabled":false,"footswitch":"A",
   "knobs":[{"name":"Gain","value":2},{"name":"Tone","value":6},{"name":"Volume","value":6.5}]},
  {"type":"AMP","model":"UK 800","base_gear":"Marshall JCM800","enabled":true,
   "knobs":[{"name":"Gain","value":5.5},{"name":"Bass","value":5},{"name":"Mid","value":7},
            {"name":"Treble","value":6},{"name":"Presence","value":5.5}]},
  {"type":"CAB","model":"UK 30","base_gear":"Marshall 1960A","enabled":true,"knobs":[]},
  {"type":"DLY","model":"Slapback","enabled":false,"footswitch":"A",
   "knobs":[{"name":"Time","value":120,"unit":"ms"},{"name":"Feedback","value":15,"unit":"%"},
            {"name":"Mix","value":20,"unit":"%"}]},
  {"type":"RVB","model":"Room","enabled":true,
   "knobs":[{"name":"Mix","value":15,"unit":"%"},{"name":"Pre Delay","value":15,"unit":"ms"},
            {"name":"Decay","value":0.8,"unit":"s"}]}
]
```
pickup: 브릿지 험버커 (pos 1)
switching: {"A":"솔로 — TS-808 + Slapback ON","B":"EQ 미드 부스트 토글"}

## Variation: 빈티지 Plexi
… (같은 형태: 줄글 → signal_chain 펜스 → pickup → switching)
````

## 필드 정의

### frontmatter (필수)
| 키 | 필수 | 설명 |
|----|------|------|
| `artist` | ✓ | 아티스트 |
| `title` | ✓ | 곡 제목 |
| `rig` | ✓ | `rigs/<rig>.md`의 slug |
| `genre` | – | 장르/톤 한 줄 |
| `confidence` | – | 확신도 |

### 변주 블록
- `## Variation: <label>` — label이 변주 이름. 파일에 변주 1개여도 헤더 필수.
- `signal_chain` 펜스 1개 (필수, JSON 배열).
- `pickup:` 한 줄 (선택, 문자열).
- `switching:` 한 줄 (선택, JSON 객체 `{풋스위치: 설명}`).

### block (signal_chain 배열 요소)
| 키 | 필수 | 타입 | 설명 |
|----|------|------|------|
| `type` | ✓ | string | 블록 종류. `NR·COMP·BOOST·OD·FUZZ·DST·FILTER·PITCH·WAH·AMP·CAB·EQ·MOD·DLY·RVB·VOL` 중 하나 (대문자). |
| `model` | ✓ | string | GP-150 모델명 (예: `UK 800`). CAB도 `model`로 통일. |
| `base_gear` | – | string | 원본 실기 (예: `Marshall JCM800`). |
| `enabled` | ✓ | bool | 기본 ON/OFF. 솔로 전용 등은 false. |
| `footswitch` | – | string | 풋스위치 할당 (`A`/`B`). 없으면 생략. |
| `knobs` | ✓ | array | 노브 배열 (빈 배열 허용, 예: IR-only CAB). |

### knob (knobs 배열 요소) — 생성 상수의 knobs 배열과 동일 모양
| 키 | 필수 | 타입 | 설명 |
|----|------|------|------|
| `name` | ✓ | string | 노브 이름 (예: `Gain`, `Pre Delay`). |
| `value` | ✓ | number | 값. 단위 없으면 0–10 게인성 노브로 간주. |
| `unit` | – | string | `ms` `s` `%` `Hz` `kHz`. 없으면 스케일 노브(0–10/0–100). |

> 스케일: 0–10 감각으로 적되, 기기 화면이 0–100이면 ×10. 렌더러가 `processors.value_scale`로 표기 단위 토글.

## 검증 규칙 (파서)

곡 단위로 검사. 하나라도 실패하면 **빌드를 실패**시키고 어느 파일·어느 규칙인지 에러로 출력(잘못된 패치가 조용히 빠지지 않게):

1. frontmatter에 `artist`/`title`/`rig` 존재.
2. 변주 ≥ 1개, 각 변주에 `signal_chain` 펜스 정확히 1개.
3. `signal_chain` JSON 파싱 성공 + 배열.
4. 각 block에 `type`(허용 목록 중)·`model`·`enabled`·`knobs` 존재.
5. 각 knob에 `name`·`value`(number) 존재.

## 빌드 동작

- 빌드 타임에 `patches/**/*.md`를 전부 파싱 → `web/lib/patches.generated.ts` 타입 상수로 출력.
- 순수 함수: 같은 md → 같은 산출물. 런타임 상태 없음.
- md(git)가 항상 진실 → 빌드는 언제든 재실행하면 수렴. 패치 변경 = md 수정 + 재빌드/배포.

## 기존 패치 마이그레이션

`patches/g250-gp150/oasis-dont-look-back-in-anger.md`는 현재 줄글만 있다.
이 계약대로 frontmatter + `## Variation:` + `signal_chain` 펜스를 추가하는 게 **step 1의 첫 작업**(데이터 모델 검증).
