# TRD — patch-parser (사이클 #0)

- **Feature slug**: patch-parser
- **PRD**: docs/prd/patch-parser.md

## 설계 요약

`patches/**/*.md` 를 빌드 타임에 읽어 검증 후 `web/lib/patches.generated.ts` 타입 상수로 직렬화하는 **순수 파이프라인**. 로직은 전부 `web/lib/parser/` 의 순수 함수(유닛 테스트 대상)에 두고, `scripts/gen-patches.ts` 는 glob·파일 write·exit 코드만 다루는 얇은 I/O 래퍼다. frontmatter 는 `gray-matter`, 변주별 `signal_chain` 펜스·`pickup:`·`switching:` 는 자체 추출기로 읽는다. 사람용 줄글은 절대 파싱하지 않는다 → 줄글이 바뀌어도 안 깨진다.

검증은 `parser-contract.md` 5규칙을 코드로 옮기고, 위반 시 `ParseError{file,line,ruleId,message}` 를 던진다. 래퍼가 전 곡을 검사해 위반을 **모아서** 출력하고 `exit(1)` → 빌드 실패. 정상이면 `web/lib/patches.generated.ts` 를 쓰고 `exit(0)`.

`switching` 의 `blockModels` 는 파서가 자동 추출한다: 해당 변주 chain 에서 `footswitch===key` 인 블록들의 `model`. `description` 이 언급한 모델이 chain 에 없으면 **경고**(stderr, 비실패)로 남긴다(fs-4.2).

## 컴포넌트 구조

```
lib/
  types.ts                    # 단일 타입 정의 (파서·렌더러 공유)
  parser/
    index.ts                  # parseAll(files) → {songs, errors, warnings}
    parsePatch.ts             # (raw, file) → Song  (순수)
    extractVariations.ts      # ## Variation 분할 + 펜스/pickup/switching 추출 (+ line)
    validate.ts               # 5규칙 → ParseError[]
    serialize.ts              # Song[] → TS 소스 문자열
    errors.ts                 # ParseError, ParseWarning
    slug.ts                   # 파일경로 → slug
scripts/
  gen-patches.ts              # 얇은 래퍼: glob → parseAll → write|exit(1)
lib/__fixtures__/             # 합성 엣지 md
```

## 파일 목록 (생성/수정)

| 파일 | 역할 |
|------|------|
| `web/lib/types.ts` | `Knob/Block/Variation/Song/SwitchingPlan/BlockType/Footswitch` 단일 정의 |
| `web/lib/parser/parsePatch.ts` | frontmatter + 변주 → `Song` |
| `web/lib/parser/extractVariations.ts` | `## Variation:` 분할, `signal_chain` 펜스·`pickup:`·`switching:` 추출, 시작 라인 계산 |
| `web/lib/parser/validate.ts` | 계약 5규칙 검증 → `ParseError[]` |
| `web/lib/parser/serialize.ts` | `Song[]` → `export const PATCHES … as const` 소스 |
| `web/lib/parser/errors.ts` | `ParseError`·`ParseWarning` 타입/포맷 |
| `web/lib/parser/slug.ts` | `patches/<rig>/<file>.md` → `<file>` slug |
| `web/lib/parser/index.ts` | `parseAll` 오케스트레이션 (songs/errors/warnings 집계) |
| `web/scripts/gen-patches.ts` | (stub 대체) glob `patches/**/*.md` → write `lib/patches.generated.ts` |
| `web/lib/__fixtures__/*.md` | 합성 엣지 케이스 |

## 데이터 흐름 / 타입

- **입력**: `patches/**/*.md` 원문 + 파일경로.
- **변환**: `parsePatch`(순수) → `validate` → `serialize`.
- **출력**: `web/lib/patches.generated.ts` = `export const PATCHES: readonly Song[]` (열린질문 확정: **단일 배열**, slug 맵은 렌더 측 헬퍼로).
- **타입 출처**: `web/lib/types.ts` (= `docs/parser-contract.md` 1:1):

```ts
export type BlockType =
  | "NR" | "COMP" | "BOOST" | "OD" | "FUZZ" | "DST" | "FILTER" | "PITCH"
  | "WAH" | "AMP" | "CAB" | "EQ" | "MOD" | "DLY" | "RVB" | "VOL";
export type Footswitch = "A" | "B";

export interface Knob { name: string; value: number; unit?: string; scale?: "0-10" | "0-100"; }
export interface Block {
  type: BlockType; model: string; base_gear?: string;
  enabled: boolean; footswitch?: Footswitch; knobs: Knob[];
}
export interface SwitchingEntry { description: string; blockModels: string[]; }
export interface SwitchingPlan { A?: SwitchingEntry; B?: SwitchingEntry; }
export interface Variation { label: string; signalChain: Block[]; pickup?: string; switching?: SwitchingPlan; }
export interface Song {
  artist: string; title: string; rig: string;
  genre?: string; confidence?: string; slug: string; variations: Variation[];
}
```

## 상태 / 엣지케이스

- `knobs:[]`(IR-only CAB) — 빈 배열 보존, crash 0.
- `footswitch` 없음 / `pickup` 없음 / `switching` 없음 — optional, 누락 허용.
- 변주 1개 / 3개 / 6블록(오아시스 V3) — N 지원.
- 부동소수점 5.5/0.8/1.5/6.5 — 자릿수 보존.
- 빌드 실패 케이스: frontmatter 누락 / `signal_chain` 0개 또는 2+개 / JSON 파싱 실패 / `type` 허용목록 밖 / `knob.value` 비숫자.
- 경고(비실패): `switching.description` 의 모델이 chain 에 없음.

## 수용 기준 ↔ 구현·테스트 매핑

| PRD 기준 | 구현 | 테스트(Vitest) |
|----------|------|----------------|
| AC1 정합 | `parsePatch` | `oasis.test` — 실제 패치 knob 전수 비교 |
| AC2 순서·type | `extractVariations`,`validate` | `parse.test`(순서), `validate.test`(bad-block-type) |
| AC3 switching | `parsePatch`(blockModels) | `switching.test` — A/B 추출, oasis V3 A·B |
| AC4 빈 knobs | `parsePatch` | `edge.test`(empty-knobs) |
| AC5 unit | `parsePatch` | `parse.test`(unit 보존) |
| AC6 부동소수 | `parsePatch`,`serialize` | `float.test`(5.5/0.8/1.5) |
| AC7 빌드 실패 | `validate`,`gen-patches` | `validate.test` + `build.integration`(exit≠0, 메시지) |
| AC8 타입 일치 | `serialize`,`types` | tsgo/tsc + `serialize.test`(파싱 가능 TS) |
| AC9 결정적 | 순수 함수 | `determinism.test`(2회 동일) |
| AC10 변주 독립 | `parsePatch`(새 객체) | `independence.test` |
| AC11 glob | `index`,`gen-patches` | `parseAll.test`(다중 픽스처) |
| AC12 커버리지 | — | `vitest run --coverage` ≥80% |

## 테스트 계획

- **유닛(Vitest)**: `parsePatch`/`extractVariations`/`validate`/`serialize`/`slug` + `renderKnob`(data-contract-ui, #1 공유지만 #0서 순수함수로 선작성 가능).
- **픽스처(`lib/__fixtures__/`)**: `valid-5block` · `missing-frontmatter` · `no-signal-chain` · `two-signal-chain` · `malformed-json` · `knob-value-not-number` · `bad-block-type` · `empty-knobs` · `float-precision` · `multi-variation` · `switching-mismatch`(경고).
- **통합**: `npm run build` 가 정상 패치는 success, 깨진 픽스처 임시 투입 시 exit≠0 + 메시지. (실제 patches/ 는 정상 유지, 깨진 케이스는 임시 디렉터리/모킹으로.)
- **실제 데이터**: 오아시스 3변주 파싱 → 16블록/44노브 전수 정합(이미 사전 검증됨).

## 새 의존성 (근거)

- `gray-matter` — frontmatter 파싱 표준 라이브러리(전투 검증). 직접 YAML 파싱 재발명 대신 채택. 이미 설치됨(부트스트랩).
- (그 외 없음 — 펜스 추출·검증·직렬화는 표준 JS로.)
