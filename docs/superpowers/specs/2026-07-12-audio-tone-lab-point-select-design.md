# 오디오 톤 랩 — 지점 선택 재설계

> 작성일: 2026-07-12
> 상태: 사용자 승인 완료
> 범위: `2026-07-11-multimodal-audio-tone-experiment-design.md`(이하 원 설계) 중 **"역할별 3-레인 구간 선택"과 그에 딸린 캐논 생성 범위**를 대체한다. LLM 공용 계약, 블라인드 A/B 평가 구조, 인증, 채택 기준(§2/§7/§10)은 원 설계를 그대로 따른다.

## 1. 배경과 결정

Task 11 수용 게이트를 통과시키는 과정에서 실사용 피드백을 받았다: `input:invalid_request` 등 버그를 걷어낸 뒤에도, **역할별(lead/backing/solo) 양손잡이 슬라이더 3개**로 구간을 지정하는 방식이 직관적이지 않다는 지적이다. "동영상에서 직접 위치를 선택하면 그 위치의 톤이 만들어지는" 형태가 사용성이 낫다는 요구로, 다음 세 가지를 확정했다.

1. `lead`/`backing`/`solo` 역할 구분을 없앤다. 사용자는 "영상의 이 지점" 하나만 고른다.
2. 지점 지정은 숫자 슬라이더가 아니라 **YouTube 플레이어에 시각적으로 붙은 커스텀 타임라인 위에서 클릭 후 드래그**로 구간 폭을 정한다.
3. 그 구간 하나에 대해 **단일 톤 하나만** 생성한다 — 원 설계처럼 항상 3-role 전체 캐논을 만들지 않는다.

baseline(문헌만) vs enriched(문헌+오디오 관측)를 같은 조건에서 비교해 블라인드 평가하는 실험의 목적 자체는 바뀌지 않는다. 비교 대상이 "3-role 세트"에서 "선택한 구간 하나"로 좁아질 뿐이다.

## 2. 변경 요약

| 항목 | 원 설계(2026-07-11) | 변경 후 |
|---|---|---|
| 역할 | `lead`/`backing`/`solo`, 역할별 최대 1구간, 전체 최대 3구간 | 없음 — 실험당 단일 구간 |
| 구간 선택 UI | 역할별 양손잡이 슬라이더 3개(레인) | 플레이어에 갭 없이 붙은 단일 커스텀 타임라인, 클릭+드래그 |
| 캐논 생성 범위 | 항상 `lead`+`backing`+`solo` 3-role 전체 | 선택 구간 하나에 대한 단일 톤 |
| 투영 비교 가능 조건 | 3-role 전부 투영 성공 | 단일 톤 투영 성공/실패 |
| DB `segments` | `{role,start_ms,end_ms}[]` (1~3개) | `segment: {start_ms,end_ms}` (단일 객체) |
| 반복 사용 | 평가 공개 후 재시작 경로 없음(실패 시만 "다시 시도") | 평가 공개 후 "다른 구간 다시 보기"로 같은 곡·기어·영상 유지한 채 재선택 |

원 설계의 최소 5초·최대 60초 길이 제약, LLM 공용 미디어 계약, 어드민 인증, 블라인드 배정·평가 항목(논리적 정합성·체인 타당성·노브 실사용성)·채택 기준(10곡/30구간, 선호 70%+, 평균 +0.5/5)은 전부 유지한다.

## 3. 인터랙션 설계

YouTube IFrame은 부모 페이지 JS가 iframe 내부 클릭·드래그를 가로챌 수 없다(cross-origin). 그래서 역할별 `RoleRangeLane` 3개를 없애는 대신, **iframe 바로 아래 갭 없이 붙는 커스텀 타임라인 바 하나**를 새로 만든다.

- 너비는 플레이어와 동일, 배경·테두리를 플레이어 프레임에 맞춰 "영상 플레이어 + 확장된 진행바"로 한 덩어리처럼 보이게 한다(별도 카드로 분리하지 않음).
- `currentTime/duration` 기반으로 재생 위치를 표시한다.
- `pointerdown`으로 앵커(시작점)를 찍고 `pointermove`로 드래그하는 동안 폭이 늘어나는 구간을 그리며, `pointerup`에서 확정한다. 마우스·터치 공용(`pointer` 이벤트).
- 드래그 폭은 최소 5초·최대 60초로 제한 — 짧으면 5초로 스냅, 길면 60초에서 멈춘다.
- 구간 확정 후 "미리듣기"로 그 구간만 반복 재생(기존 `playRange` 로직 재사용).
- 타임라인을 다시 클릭하면 기존 선택은 지워지고 새 구간을 시작한다(역할별 관리 UI가 사라져 상태가 단순해짐).
- 접근성: 포인터 드래그의 대체 경로로, 타임라인에 포커스한 뒤 화살표키로 시작점 이동(1초/Shift+5초), 별도 키로 폭 조정하는 키보드 인터랙션을 유지한다(기존 `RoleRangeLane`의 `role=slider` 키보드 지원을 계승).

## 4. 데이터 모델

- `ExperimentRequest.segments`(배열) → `segment`(단일 객체) `{ startMs, endMs }`. `role` 필드 제거.
- `validate.ts`의 `parseSegments`(역할 중복 검사, 1~3개 배열 검증)를 걷어내고, 시작·끝 정수·순서·길이(5~60초)·영상 길이 이내만 보는 단순한 `parseSegment` 하나로 교체.
- `AudioObservation`에서 `role` 필드와 `AUDIO_ROLES` enum을 제거 — 관측 결과는 그 구간 하나의 `gain`/`brightness`/`compression`/`effects`/`notes`/`confidence`만 담는다. `hasExactKeys` 검증 목록도 갱신.
- DB: `tone_experiments.segments`(jsonb 배열) 컬럼을 `segment`(jsonb 단일 객체)로 바꾸는 새 마이그레이션 1개 추가. 실 표본 수집 전 단계라 기존 데이터 보존 없이 컬럼 드롭 후 재생성으로 단순하게 처리한다(사용자 확인 완료).

## 5. 캐논 생성 — 단일 톤 경로 분리

메인 파이프라인이 쓰는 `buildCanonPrompt`/`generateCanonDraft`(항상 3-role JSON 스키마)는 그대로 둔다. 오디오 랩 전용으로 별도 경로를 신설한다.

- `prompts.ts`: `buildSingleToneCanonPrompt(input)` 신설. 응답 스키마 최상위가 `roles[]` 래퍼 없이 바로 `{ chain: [...] | null, null_reason, base_gear, ... }` 하나.
- `canon-draft.ts`: `generateSingleCanonDraft()` 신설. 반환 타입 `{ chain, sources, modelUsed, rawResponseHash }` — 배열 없음.
- `project-draft.ts`: 단일 톤 하나를 받는 `projectSingleTone(chain, catalog)` 신설. 3단 룩업·FX 실존·노브 범위 게이트 로직 자체는 재사용하고, "배열이 아니라 단일 객체"로 얇게 감싸는 정도로 중복을 최소화한다.
- `runner.ts`: `assertComparable`을 단순화 — 3-role 중 skipped 여부가 아니라 baseline/enriched 각각 "투영 성공/실패" 하나만 판정.
- 메인 파이프라인(`generate.ts`, `canonical_tones`/`tones` 적재)은 전혀 건드리지 않는다 — 공유 코드가 아니라 오디오 랩 전용 함수가 새로 갈라져 나가는 구조.

## 6. 블라인드 평가 화면

- `PublicProjection` 타입을 `{ roles: [...] }`에서 `{ status, chain, nullReason }` 단일 객체로 단순화.
- `VariantSettings`는 role 제목 없이 체인 하나를 바로 렌더.
- "익명 A/B 평가" 구조(설정 A/B 두 개를 3항목으로 채점 + 최종 선호)는 원 설계 그대로 유지 — role 제거의 영향을 받지 않는다.

## 7. 반복 사용성

평가 결과 공개 화면(`revealed` phase)에 **"다른 구간 다시 보기"** 버튼을 추가한다. 곡 정보·기타·프로세서·로드된 영상은 그대로 두고 타임라인 선택 단계로만 되돌아가, 같은 곡의 다른 지점을 바로 이어서 실험할 수 있게 한다. 현재는 실패했을 때만 "다시 시도" 경로가 있고 성공 후에는 처음부터 다시 입력해야 하는데, 이 격차를 없앤다.

## 8. 영향 범위 (구현 체크리스트)

- `web/lib/audio-experiment/validate.ts` — `parseSegment` 단일화, role 검증 제거
- `web/lib/audio-experiment/contracts.ts` — `ExperimentRequest.segment`, `PublicProjection` 단순화
- `web/lib/pipeline/audio-observations.ts` — `AudioObservation`에서 role 제거, `AUDIO_ROLES` 삭제
- `web/lib/pipeline/prompts.ts` — `buildSingleToneCanonPrompt` 신설
- `web/lib/pipeline/canon-draft.ts` — `generateSingleCanonDraft` 신설
- `web/lib/pipeline/project-draft.ts` — `projectSingleTone` 신설
- `web/lib/audio-experiment/runner.ts` — `assertComparable` 단순화, `analyze`/`generate`/`project` deps 시그니처 갱신
- `web/lib/audio-experiment/blind.ts` — `publicProjection` 단일 객체 변환으로 갱신
- `web/components/audio-lab/AudioToneLab.tsx` — role 체크박스·`RoleRangeLane` 3-레인 제거, 커스텀 타임라인 컴포넌트로 교체, "다른 구간 다시 보기" 추가
- `web/components/audio-lab/RoleRangeLane.tsx` → 삭제하고 새 타임라인 컴포넌트(가칭 `PointTimeline.tsx`)로 대체
- `supabase/migrations/` — `segments`→`segment` 컬럼 교체 마이그레이션 신설
- `web/e2e/audio-tone-lab.spec.ts` — 역할 체크박스·3-레인 시나리오를 클릭+드래그 시나리오로 재작성

## 9. 테스트 전략 갱신

원 설계 §9의 단위·API·브라우저 테스트 항목 중 "역할별 구간 제약", "세 역할 레인과 양손잡이 슬라이더" 항목을 다음으로 교체한다.

- 단일 구간 제약(길이 5~60초, 순서, 영상 길이 이내) 검증
- 커스텀 타임라인의 포인터 드래그 → 구간 상태 반영
- 커스텀 타임라인의 키보드 대체 조작(포커스 → 화살표 이동)
- "다른 구간 다시 보기" → 곡/기어/영상 유지 확인
- axe 접근성 오류 0(타임라인 신규 컴포넌트 포함)

나머지(모델·프롬프트·temperature 동일 조건, 한 분기 실패 시 전체 실패, blind mapping 비노출, 실 Gemini 10곡/30구간 검증 등)는 원 설계 §9/§10을 그대로 따른다.
