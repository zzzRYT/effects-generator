# Brainstorm — patch-parser (사이클 #0)

> 트랙 2 루프 step 0 산출물. 고른 방향 + 버린 대안 + 이월 질문.
> 권위 스펙: `docs/parser-contract.md` · 소비 계약: `docs/data-contract-ui.md` · 루프: `docs/web-harness.md`.

## 무엇

`patches/**/*.md` 를 **빌드 타임에 파싱**해 `web/lib/patches.generated.ts` 타입 상수로 굽는 순수 파서. DB·런타임 0. 같은 md → 같은 산출물.

## 고른 방향

### 데이터 스코프 — 오아시스 3변주 (track-1, tone-builder 생성)
- ① **정석 JCM800** — 기존 줄글 값을 계약 포맷으로 *전사*.
- ② **빈티지 Plexi** (UK SLP) — tone-builder 리서치.
- ③ **대안** (UK 50 등) — tone-builder 리서치.
- 각 변주 = `## Variation:` + signal_chain 펜스 + `pickup:` + `switching:`.
- 파서 TDD 는 이 3변주(실제) + **합성 엣지 픽스처**(malformed/빈 knobs/부동소수점/멀티변주)로.

### 아키텍처
- 로직은 `lib/parser/` **순수 함수**(유닛 테스트 대상), `scripts/gen-patches.ts` 는 얇은 I/O 래퍼.
- `gray-matter` 로 frontmatter, `## Variation:` 단위 **펜스 추출기**로 signal_chain/pickup/switching.
- `lib/types.ts` **단일 타입 정의** (파서·렌더러 공유).
- `switching.blockModels` 는 파서가 signal_chain 의 `footswitch` 로 **자동 추출**.

### 에러 처리
- parser-contract 검증 5규칙 위반 → `파일:라인 [규칙ID] 메시지` 로 **전부 모아 출력 후 `exit(1)`** = 빌드 실패. 잘못된 패치가 조용히 빠지지 않게. (루브릭 `data-2.9`·`edge-3.10`)

## 핵심 데이터 모델 통찰 — "여러 형태"의 두 축
헷갈리기 쉬운 지점. 분리해서 못박는다:
- **축 1 · 연주 상태** (기본/솔로/EQ 토글): **1변주 안에서** `enabled` + `footswitch` + `switching` 로 표현. 변주 쪼개지 않음.
  - 오아시스 예: 솔로 = `TS-808`·`Slapback` 이 `enabled:false, footswitch:"A"`.
- **축 2 · 다른 리그/접근** (JCM800 vs Plexi vs UK50): 별도 `## Variation:`. 서로 다른 앰프·코어 노브·철학.
- 줄글은 축1을 완전히 담지만 축2(Plexi/UK50)는 **이름만** 언급(노브 값 없음) → 전사 불가 → tone-builder 리서치 필요.

## 버린 대안
- **전사 1변주만**: 파서·타입은 N변주 지원이나 오아시스가 1변주로 시작 → #2(변주 비교) 의미가 늦어짐. → 3변주 선택.
- **합성 픽스처로만 파서**: 가장 인프라-순수하나 "실제 1곡 검증"(`data-2.1`)이 뒤로 밀림.
- **runtime 파싱/DB**: 헌법 위반(정적 빌드 상수). 기각.

## 이월 질문 (PRD/TRD 에서 확정)
- 3번째 변주 정체: **UK 50** vs 모던 대안 → tone-builder 리서치가 결정.
- 에러 라인 계산 정밀도: frontmatter/펜스 시작 행 기준이면 충분한가.
- `serialize` 출력 형태: `export const PATCHES: readonly Song[]` 단일 배열 vs slug 맵.

## #0 비목표 (YAGNI)
UI·렌더 없음 / `models`·`rigs` 보강 없음(슬러그만) / value_scale 토글은 #1 / 픽업·다이내믹 팁 등 줄글은 파서가 건드리지 않음(사람용).
