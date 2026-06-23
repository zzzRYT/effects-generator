# 사이클 #6 — guitar-controls 설계

> 방향 확정은 사용자 Q&A(AskUserQuestion 4문)로 수렴했다(= brainstorm 단계 대체).
> 이 문서가 PRD/TRD lite. 루프: `docs/web-harness.md`.

## 0. 문제 (왜)

곡 상세는 GP-150 이펙터 패치(signal_chain)만 기계 화면처럼 보여준다.
하지만 톤의 출발점인 **기타 본체 컨트롤**(볼륨 노브, 톤 노브, HSS 5-way 셀렉터 위치, 푸시-풀 코일 스플릿)을
어떻게 세팅하는지는 변주별 `pickup:` **자유 문자열 한 줄에 뒤섞여** 있다.

```
pickup: 브릿지 험버커(pos 1) — 벌스는 기타 볼륨 ≈6–7 + 팜뮤트, 후렴·아웃트로는 볼륨 풀
```

셀렉터 위치·볼륨·다이내믹·코일스플릿이 한 문자열에 섞여 **값으로 쓸 수 없고**, 화면에서 구조화 표시도 못 한다.
기타 모델(`models/guitars/*.md`)엔 5-way 맵·코일스플릿 정보가 이미 있는데 패치는 이를 연결하지 않는다.

## 1. 방향 (확정 — AskUserQuestion)

1. **데이터 모델**: 변주별 **구조화 '기본 세팅' 1벌**(셀렉터/볼륨/톤/코일스플릿) **+ 자유 메모**(섹션 변화). → 곡 안에서 벌스/후렴마다 바뀌는 현실은 메모로, 헤드라인 세팅은 값으로.
2. **셀렉터 라벨**: 패치엔 위치 숫자(1~5)만. `①=브릿지 험버커` 이름표는 **기타 모델에서 파생**(빌드 타임). 기타 비종속·드리프트 없음.
3. **렌더**: 변주별 **별도 '기타 세팅' 박스**(라벨-값 `<dl>` + 메모). 신호흐름 그래픽 없음.
4. **백필**: 옛 `pickup` 필드 **완전 제거**, `guitar` 구조화 필드로 단일화. 기존 13파일 전체 마이그레이션.

버린 대안:
- **섹션별 완전 구조화**(벌스/후렴 배열): 대부분 곡은 1~2 상태뿐 → 과설계, 입력·UI 복잡.
- **셀렉터 라벨을 패치에 직접 저장**: 모든 패치 중복 + 기타 모델과 드리프트.
- **신호체인 맨 앞 기타 플레이트(그래픽)**: 온브랜드지만 작업량 과다 → 박스로 시작, 그래픽은 후속 여지.
- **pickup 유지 + guitar 선택 추가**: 두 표현 공존 → 드리프트 위험.

## 2. 데이터 모델

### md 패치 (변주별 한 줄, `switching:`와 동일하게 JSON)

```
guitar: {"selector":1,"volume":8,"tone":7,"coilSplit":false,"note":"벌스 볼륨 6~7 롤백, 후렴 풀"}
```
- `selector` 1–5 (원시 위치 숫자). 나머지 전부 선택.
- `volume`/`tone` 0–10. `coilSplit` bool. `note` 자유 메모.
- 옛 `pickup:` 줄 제거(이 한 줄이 흡수).

### TS 타입 (`web/lib/types.ts`)

```ts
export interface GuitarSetting {
  selector?: number;       // 1–5 (md 원시 위치)
  selectorLabel?: string;  // 빌드 타임 파생 (기타 모델 5-way 맵)
  volume?: number;         // 0–10
  tone?: number;           // 0–10
  coilSplit?: boolean;
  note?: string;
}
// Variation.pickup 제거 → guitar?: GuitarSetting
```

## 3. 셀렉터 라벨 파생 (빌드 타임)

`patch.rig` → `rigs/<rig>.md`(frontmatter `guitar:`) → `models/guitars/<guitar>.md`의 `## 5-way 셀렉터` 목록 →
`selector` 숫자에 이름표를 붙여 `selectorLabel`을 **생성 상수에 구워 넣음**(md엔 숫자만, 렌더러는 룩업 불필요).
기타 모델이 SoT → 재빌드하면 수렴(드리프트 없음). G250·XT-450 둘 다 HSS + 동일 5-way 맵.

- 신규 순수 로더 `lib/parser/guitarRegistry.ts`: `rigs/*.md` + `models/guitars/*.md` → `Map<rigSlug, { selectorMap: Record<number,string>, coilSplitSupported: boolean }>`. 입력=파일내용, 출력=맵(순수).
- `parseAll(files, registry)`에 registry 주입. `gen-patches.ts`(얇은 래퍼)가 `rigs`·`models/guitars`를 읽어 registry 생성.

## 4. 백필 맵 (현행 pickup → guitar)

각 변주의 `pickup:` 자유 문자열을 구조화로 변환:
- `pos N` 정규식 → `selector`.
- "볼륨 6~7 롤백 / 팜뮤트 / 코일 스플릿 옵션" 등 다이내믹 표현 → `note`.
- `volume`/`tone` **베이스라인** = 곡 메인(가장 큰) 상태. 줄글 명시 없으면 `volume:10`(풀), `tone`은 근거 있을 때만(없으면 생략 — 추측·모호표현 금지).
- `coilSplit`: g250에서 "코일 스플릿" 언급된 변주만 `true`/메모. xt-450은 미확인 → 생략.

변환은 정확도 우선 → **tone-builder 스킬로 재생성**(손추측 금지). 변환 후 `npm run gen:patches`로 라벨 파생·검증 통과 확인.
대상: `patches/g250-gp150/*`(7곡) + `patches/xt-450-gp150/*` 전 변주.

## 5. 변경 파일

- **계약**: `docs/parser-contract.md`(`pickup:` → `guitar:` JSON 스펙·검증·rig→기타 라벨 해석 규칙·변경이력), `docs/data-contract-ui.md`(기타 세팅 박스 표기 규칙).
- **타입**: `web/lib/types.ts`(`GuitarSetting`, `Variation.pickup` 제거).
- **파서**: `lib/parser/guitarRegistry.ts`(신규), `lib/parser/extractVariations.ts`(`pickup` 매칭 제거·`guitarRaw` 추가), `lib/parser/parsePatch.ts`(`parseGuitar` — JSON·범위·라벨·코일스플릿경고), `lib/parser/index.ts`·`gen-patches.ts`(registry 스레딩).
- **렌더**: `components/song-detail/GuitarSetting.tsx`(신규) + `guitar-setting.module.css`, `VariationPanel.tsx`(SwitchingPlan 위 배치, `pickup`→`guitar` prop), `SwitchingPlan.tsx`(pickup 줄 제거).
- **데이터**: 패치 전체 + `web/lib/patches.generated.ts`(재생성).
- **스킬**: `.claude/skills/tone-builder/SKILL.md`(변주마다 `guitar:` 항상 출력 규칙).
- **테스트**: `guitarRegistry.test.ts`·`parseGuitar`(parsePatch.test) 신규, `GuitarSetting.test.tsx` + Playwright 비주얼(4bp)·axe, 기존 `pickup` 참조 테스트 수정.

## 6. 수용 기준 (측정 가능)

1. `guitar` 있으면 — `selector` 1–5 정수·기타맵에 존재, `volume`/`tone` 0–10, `coilSplit` bool. 위반 시 **빌드 중단**(파일·규칙 출력).
2. rig에 맞는 기타 모델 없으면 빌드 실패. `coilSplit:true` + 기타 미지원/미확인 → **경고**(실패 아님).
3. `selectorLabel`이 생성 상수에 기타 모델 기준으로 구워짐(예: g250 `1`→`브릿지 험버커`).
4. 패치 전체 파싱 → 에러 0. `pickup` 키는 생성 상수에서 0건(완전 제거).
5. 화면: 셀렉터(`① 브릿지 험버커`)·볼륨·톤·코일스플릿(`걸기/해제`)·메모 중 **존재하는 행만** 표시, 전부 없으면 박스 미렌더. 신호체인 위에 배치.
6. lint/tsgo/tsc/vitest(≥80%)/build/test:visual green. axe a11y=0.

## 7. 엣지케이스

- `guitar` 라인 없는 변주 — 정상(박스 미렌더). 백필로 전부 채우지만 계약상 선택.
- 일부 필드만(예: selector만) — 그 행만 표시.
- `coilSplit:false` — "해제"로 표시할지 행 숨길지: **숨김**(노이즈 감소, ON일 때만 의미). false는 메모 불요 시 생략 권장.
- 색맹/grayscale·no-JS — `<dl>` 텍스트라 색·JS 비의존(완전 정적).
- 알 수 없는 selector 숫자(맵 밖) — 빌드 실패(조용히 통과 방지).

## 8. 비목표

- 톤(이펙트 값) 변경 없음 — 순수 표현/계약 확장.
- 트레몰로/암 사용량 등 추가 컨트롤 없음(YAGNI — 볼륨/톤/셀렉터/코일스플릿만).
- DB·런타임 편집 없음(불변).

## 9. 후속 (별도 사이클)

- **#7 `new-badge`** (별도 brainstorm/구현 — 사용자 확정): 패치 frontmatter `added:` 날짜 → 곡 목록 + 상세 제목에 "New" 배지. **판정은 클라이언트**(`now − added < 7일`, 빌드와 무관하게 정확, no-JS면 배지 없음=점진적 향상). 이 사이클과 독립.
