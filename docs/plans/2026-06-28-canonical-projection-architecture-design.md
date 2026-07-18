---
title: 캐논·투영 아키텍처 — 멀티 이펙터 + 계정 (피봇 확장)
date: 2026-06-28
status: 2026-07-04에 폐기 → 2026-07-06 조건부 부활(캐논/투영 핵심만). 계정/저장(P10)·정규화
  깔때기(P11)·gear 크론 적재(P9.5)는 여전히 미채택/제거. 최신 통합 설계는
  docs/plans/2026-07-06-canon-projection-revival-design.md
topic: canonical-projection-architecture
extends: docs/plans/2026-06-25-tone-generator-pivot-design.md
---

# 캐논·투영 아키텍처 — 멀티 이펙터 + 계정

> ⚠️ **2026-07-06 조건부 부활.** 이 문서는 한 차례 07-04 구조 리셋으로 폐기됐다가, 캐논·투영
> 핵심(§2~§4, §9)만 `2026-07-06-canon-projection-revival-design.md`에서 되살아났다. 단:
> - **gear KB 크론 적재(§15 피더②, P9.5)는 제거** — 어드민 수동 입력으로 대체.
> - **자동 온보딩 큐도 제거** — 요청 폼(사용자 제보) → 어드민 수동 처리로 대체.
> - **계정/저장(P10)·정규화 깔때기(P11)는 이 되살림 범위 밖** — 개인용 스코프라 미결정·유보.
> 아래 본문은 폐기 이전 원문 그대로 보존한다(역사적 기록). 현재 유효한 내용은 07-06 문서를 따른다.

## 0. 한 줄 요약

톤 생성을 **2레이어**로 쪼갠다:
- **캐논(Canonical)** — AI가 곡당 **딱 1번**, **실제 존재하는 기어 기준**의 기기-무관 톤을 만든다(`(artist, title)` 단일 키).
- **투영(Projection)** — 스크립트가 **AI 없이** 캐논 톤을 대상 멀티이펙터 + 기타로 결정적 변환한다(기기·기타별 N회, 비용 $0).

여기에 **계정**(비로그인 생성 가능, 저장은 로그인) + **공유 캐시**(타인이 만든 톤 재사용)로 비용을 신곡당 1회로 묶는다.

> 이 문서는 [2026-06-25 톤 생성기 피봇](2026-06-25-tone-generator-pivot-design.md)을 **확장**한다. 피봇은 "AI가 GP-150 signal_chain을 직접 생성"이었으나, 본 설계는 그 생성 단계를 **캐논(AI) + 투영(스크립트)** 으로 분리한다. 충돌 시 본 문서가 최신.

## 1. 동기

- 피봇 현재 구조: n8n LLM이 **GP-150 전용** `signal_chain`을 직접 생성(`docs/generation/system-prompt.md`: "GP-150 그라운딩 모델명만"). → 새 멀티이펙터마다 **AI를 다시 돌려야** 하고(곡 × 기기 = 과금 폭증), 기기별 그라운딩 프롬프트도 따로 필요.
- 통찰: 곡의 "진짜 톤"은 **실기(Marshall JCM800 + Tube Screamer …)** 로 한 번만 정의하면 된다. 그걸 GP-150이든 Ampero든 **각 기기의 모델로 옮기는 건 결정적 매핑**(룩업·스케일 변환)이지 창작이 아니다.
- 결과: **AI 과금 = 신곡당 1회.** 기기·기타 조합은 전부 스크립트가 공짜로 투영. "프로세서 비종속"의 진짜 실현.
- 부수 효과: AI가 기기 모델명을 지어낼 일이 없어짐(실기만 서술) → **할루시네이션 표면 축소**. 기기 모델명의 정확성은 결정적 카탈로그(검증된 데이터)가 책임.

## 2. 확정된 결정 (이번 brainstorm 수렴)

| # | 분기 | 결정 | 근거 |
|---|------|------|------|
| 1 | 생성 단위 | **캐논 = `(artist, title)` 단일, 기기 무관** | AI 과금 곡당 1회 |
| 2 | 기기·기타 적용 | **스크립트 투영(AI 없음)** | 비용 0·즉시·결정적 |
| 3 | 캐논↔기기 다리 | **`base_gear` 매핑** (실기 → 그 기기 `model`) | 데이터 구조에 이미 존재(아래 §4) |
| 4 | 매치 깊이(기기 반영) | **카탈로그 + 모듈순서 + 노브 스케일/범위 + 비주얼 스킨** | 사용자: "기기별 외형까지" |
| 5 | 계정 | **있음. 비로그인 생성 가능, 저장은 로그인 필수** | 진입장벽↓ + 소유 저장 |
| 6 | 저장 의미 | **단순 저장** (fork-on-edit 등 복잡도 배제, YAGNI) | |
| 7 | 비용 방어 | **공유 캐시 재사용** — 타인이 만든 톤도 조건 맞으면 그 값 가져와 저장 | 신곡 1회만 과금 |
| 8 | 곡/아티스트 매칭 | **정규화 깔때기**(결정적→퍼지→LLM 해소→별칭 학습) | 표기 흔들림·교차언어 |
| 9 | 캐논 생성 방식 | **리서치로 base 기어 확정**(한 방 추측 X) + `base_gear`=구조화 레코드 | 1:N·오리지널·퍼지를 속성 대조로 해소(§4·§9) |
| 10 | gear 데이터 | **real-gear KB 누적** — 씨앗(카탈로그 역인덱싱+Flash) + 크론 적재 + 곡별 환류 | 곡당 과금 $0 수렴, 선제·저가(§15) |
| 11 | 데이터 소스 트랙 | **투 트랙** — (i) 문서 소스 지금 무료 / (ii) 오디오+고성능 LLM 과금 후속 | 비즈니스 모델 투입 시, 재설계 없이 seam만(§16) |

## 3. 시스템 아키텍처

```
[입력: 아티스트 · 곡 · (대상 프로세서·기타)]
      │
      ▼
① 정규화 깔때기 (§7)  ──▶ canonical 캐시 조회 (artist_norm, title_norm)
      │                         └─ 히트 → 캐논 재사용 ($0)
      │ 미스
      ▼
② 캐논 생성 (AI, 곡당 1회)   n8n: 리서치 → 실기 기준 톤 → canonical_tone 적재
      │                         (기기 무관. base_gear 어휘로 서술)
      ▼
③ 투영 (스크립트, AI 없음)   canonical + 프로세서 + 기타 → 그 기기 signal_chain
      │                         (base_gear→model 룩업 · 노브 스케일 변환 · 모듈순서)
      ▼
④ 렌더 (기존 GP-150 렌더러 + 기기 스킨)   block.type만 보고 그림
      ▼
⑤ 저장 (로그인 시)   saved_patches(user_id, …) — 단순 저장. 공유 캐시 가리킴
```

**핵심:** ②만 과금. ①③④⑤는 전부 $0. 신곡이 아니면 ②도 스킵.

## 4. base_gear = 캐논과 기기를 잇는 다리 (이미 존재)

현재 `signal_chain` block은 `model`(기기 FX Title) + `base_gear`(실기)를 **둘 다** 가진다(`docs/parser-contract.md`).

- **캐논 = `base_gear` 절반** (실기 어휘): `{type, category?, base_gear, knobs(실기 기준 값), enabled, footswitch?}`.
- **투영 = `base_gear`로 그 기기 `model`을 채우는 것**: 기기 카탈로그에서 `base_gear`가 일치/근접하는 모델을 찾아 `model` 확정 + 노브 스케일 변환.

예: 캐논 `base_gear:"Ibanez TS-808"` →
- GP-150: `base_gear="Ibanez TS-808"`인 모델 = **Green OD**
- Ampero: 그 기기의 TS-808 클론 모델

> **재사용 + 교정:** 2026-06-27 main 작업(모델명 ↔ base_gear 카탈로그 교정 + 카탈로그 게이트)이 **곧 투영 룩업 테이블**이다. 단, 현재 `web/lib/parser/catalog.ts`의 `extractCatalog`는 모델명(FX Title)만 뽑고 `(기반: …)` 괄호의 base_gear는 **버린다** → P9에서 **base_gear까지 추출하도록 확장**해 `base_gear → model` 역인덱스(연결점의 기기 절반)를 만든다. → §10 정합 필요.

> **디스앰비규에이션(1:N·오리지널·퍼지) — 실측:** base_gear는 깨끗한 1:1 키가 아니다. ① **1:N**: Marshall Guv'nor → `Chief`·`La Charger`, VOX V846 → `V-Wah`·`C-Wah`, Mesa Mark IIC+ → `Mess2C+ 1/2/3`. ② **부분 커버**: 이펙트 절반이 base_gear 없는 GP-150 오리지널(`Yellow OD`·`Super OD`·`SM Dist`·`Shimmer`·`Freeze`…). ③ **퍼지**: `TS-808` vs `TS-808 Tube Screamer`. (AMP는 base_gear 커버리지 ~100% — 톤의 척추는 깔끔.)
> → **해소:** 캐논 `base_gear`를 맨 문자열이 아니라 **구조화 레코드**(§9)로 만들어 **속성 대조**로 매칭. 이름 정확/부분 일치 우선 → 속성(category·캐릭터) 근접 폴백 → confidence 강등. 오리지널은 실기 등가가 없으면 category+character로 근접 선택. 이게 사용자 결정 "수집 데이터로 base 모델 확정"의 구현 형태다.

## 5. 멀티 이펙터 활성화 (기기 추가)

피봇 결정 #3("GP-150 먼저, 멀티는 데이터 추가만")을 실제로 켠다. 기기 추가 흐름:

1. **학습(skill):** 새 기기(예: Ampero) 매뉴얼/레퍼런스 → `models/processors/<proc>/` 작성.
   - `amps/cabs/effects.md` — 모델 카탈로그(매뉴얼 FX Title + `base_gear`). 기존 GP-150과 동일 컨벤션.
   - `profile.md`에 **`device-spec` 펜스**(아래) — 기계가 읽는 기기 스펙.
   - 새 skill **`processor-builder`**(가칭, `tone-builder`의 자매): PDF/웹 → 위 md 자동 초안.
2. **sync(빌드):** `gen:processors`가 `models/processors/*/`를 파싱 → `processors` 레지스트리(Supabase 행 + 빌드 상수). 카탈로그 게이트 검증 통과해야 적재.
3. **선택:** 웹에 그 기기가 선택지로 등장. 기존 캐논들이 **즉시(스크립트) 그 기기로 투영 가능** — AI 0.

**device-spec (profile.md 펜스):** 패치의 `signal_chain` 펜스와 동일 철학(프로즈는 그대로, 기계가 읽는 블록만).
```yaml
# ```device-spec  (profile.md 안)
moduleOrder: [NR, PRE, WAH, DST, NS, AMP, CAB, EQ, MOD, DLY, RVB, VOL]
valueScale: 0-100          # 노브 표기 스케일
footswitches: 2
expression: 1
skin:                      # 비주얼 스킨 토큰 (OKLCH, §피봇 §8 색 체계)
  panel: oklch(26% 0.005 280)
  moduleColors: { DST.OD: ..., AMP: ..., DLY: ... }
  lcd: ...
```

## 6. 계정 + 저장 + 공유 캐시

- **인증:** Supabase Auth(이메일/OAuth). 비로그인 = 생성·열람·투영 가능. 로그인 = **저장**.
- **저장(단순):** `saved_patches(id, user_id, song_id, processor_slug, guitar, variations_snapshot, created_at)`. 로그인 사용자가 "이 톤 저장" → 한 행. RLS: 본인 것만 read/write, 공개 카탈로그는 공개 read.
- **공유 캐시 재사용(결정 #7):** 저장/생성 요청 시 캐논 캐시 히트면 그 캐논을 투영해 바로 보여주고 저장 → 타인이 만든 곡이라도 **재생성 없이** 그 값 사용. 비용 방어선.
- **단순 저장의 의미:** 저장 시점의 투영 결과(스냅샷)를 보관. 편집/fork 의미론은 도입하지 않음(YAGNI, 결정 #6). 후일 필요하면 별도 사이클.

## 7. 곡/아티스트 정규화 깔때기

문제: `oasis dont look back in anger` · `Oasis don't look back in anger` · `오아시스 돈룩백인앵걸` · `오아시스 Don't Look Back In Anger` = 같은 곡. 피봇 §13이 리스크로 명시.

```
입력
 1. 결정적 정규화   normArtist/normTitle 확장(현재 trim+lower) + NFC + 부호/어포스트로피 제거
                    → 같은 언어권 표기 흔들림 흡수 (slugify.ts 규칙과 정렬)
 2. 캐시 조회       (artist_norm, title_norm) 히트 → $0
 3. 퍼지 매칭       미스 시 기존 곡과 트라이그램/편집거리 근사 (같은 언어권 오타)
 4. LLM 해소        그래도 미스 → n8n '입력 정규화' 단계가 교차언어/음차 해소
                    "오아시스 돈룩백인앵걸" → {artist:"Oasis", title:"Don't Look Back in Anger"}
                    → 정식 키로 캐시 재조회 (대개 히트 = 생성 안 함)
 5. 별칭 학습       aliases(raw_artist, raw_title, song_id) 적재 → 다음엔 1~2단계서 히트
```

- **비용:** 결정적이 대부분 처리, LLM은 처음 보는 표기에만(풀 생성 아닌 작은 정규화 호출), 결과를 `aliases`에 학습 → **시간이 지날수록 0 수렴.**
- **안전:** 교차언어 오탐(다른 곡인데 비슷 음차) 대비 — LLM 해소에 confidence, `aliases`는 사람 교정 가능 레이어.
- **현재 코드:** `web/lib/data/normalize.ts`(trim+lower)·`slugify.ts`(NFC+부호제거+한글보존) 위에 1단계 확장 + 3~5단계 신설.

## 8. 데이터 모델 변화 (Supabase)

피봇 스키마(§피봇 5)에 캐논/계정/별칭을 더한다.

```
canonical_tones (id, song_id→songs, variations JSONB(실기 어휘, base_gear=레코드 §9),
                 confidence, genre, model_used, status, created_at)   ← AI 산출, 곡당 1
gear            (id, name, name_norm UNIQUE, category, attributes JSONB,
                 source_class, confidence, created_at)                ← real-gear KB(§15). 누적. 캐논↔기기 연결점 어휘
songs           (… artist_norm, title_norm, UNIQUE)                    ← 캐시/매칭 키
aliases         (id, raw_artist, raw_title, song_id, source, confidence) ← 정규화 학습(§7)
processors      (slug, name, value_scale, module_order, skin JSONB)    ← device-spec sync 산출(§5)
saved_patches   (id, user_id, song_id, processor_slug, guitar JSONB,
                 variations_snapshot JSONB, created_at)                ← 계정 저장(§6)
ratings         (… 기존)
generation_jobs (… 기존, 캐논 생성 추적)
```

- 투영 결과는 **온디맨드 스크립트 산출**(저장 안 해도 됨). `saved_patches`는 사용자가 명시 저장할 때만 스냅샷 보관.
- `patches`(피봇의 기기별 산출) → 역할 축소: 캐논 + 투영으로 대체. 마이그레이션은 §11.
- **`gear` ↔ 기기 모델 조인:** 기기 카탈로그가 각 모델의 base_gear(`(기반: …)`)를 이미 선언 → `gear.name_norm`과 조인. 기기쪽 매핑은 device 카탈로그를 **역인덱싱해 파생**(손 유지 X, device md가 SoT).
- **`gear.source_class`/`confidence`:** 피더별 신뢰도 태그(씨앗·크론·곡별·미래 프리미엄). 과금 seam(§16)이 여기 올라탐.

## 9. 캐논 스키마 (신규 계약) — 리서치로 base 기어를 **확정**

AI 출력 = 실기 어휘. **핵심 리프레임(2026-06-28, 사용자 결정):** 캐논은 "한 방에 base_gear 문자열을 뱉는" 게 아니라, **실기를 조사·수집한 근거로 base 모델을 확정하는 과정**이다. 따라서 `base_gear`는 맨 문자열이 아니라 **구조화 레코드**다(§4 디스앰비규에이션의 연료).

- block = `{ type, category?, base_gear, knobs(실기 기준), enabled, footswitch? }`. `model`(기기) 없음.
- **base_gear 레코드:** `{ name, category, attributes?, source?, confidence }` — `name`=실기명(예: `Ibanez TS-808`), `category`=효과종류(OD/FUZZ/AMP…), `attributes`=매칭 근거(클리핑·게인성격·EQ 캐릭터, **최소부터** YAGNI), `source`/`confidence`=근거 추적.
- **확정 흐름:** 곡 리서치 → 등장 실기 후보 수집 → **gear KB(§15) 대조**로 base 모델 확정(KB 히트면 재조사 없이 그 레코드 재사용). KB 미스만 신규 조사 → KB에 환류.
- `docs/generation/signal-chain.schema.json`(현 기기-종속)을 **캐논 스키마로 개정**: `model` 제거, `base_gear`를 위 레코드로 required.
- `docs/generation/system-prompt.md` 개정: "GP-150 모델명만" → "**실제 존재하는 기어를 근거와 함께 확정**(특정 멀티이펙터 모델명 쓰지 말 것)". 그라운딩 = gear KB + 실기 지식(범용) + 장르.
- 투영 스크립트가 캐논 → 기기 `signal_chain`(=현 parser-contract 모양) 생성 → 기존 `validate.ts` + 카탈로그 게이트로 검증 → 렌더. **노브 스케일은 GP-150 내 항등**(진짜 스케일/노브명 리매핑은 P12 둘째 기기 경계).

## 10. 기존 피봇 자산 영향

| 자산 | 영향 |
|---|---|
| 시그널체인 렌더러·`types.ts`·변주탭·`guitar` | **그대로** — 투영 산출이 기존 signal_chain 모양 |
| `system-prompt.md`·`signal-chain.schema.json` | **개정** — 기기-종속 → 캐논(실기) |
| `lib/data/normalize.ts`·`slugify.ts` | **확장** — 정규화 깔때기(§7) |
| `lib/parser/validate.ts` + (main의)`catalog.ts` | **투영 검증·룩업으로 재사용** — §4 |
| `lib/supabase/rest.ts` | **그대로** + Auth 호출 추가 |
| n8n 워크플로우 | 생성=캐논(기기 무관)으로 단순화, 그라운딩 축소 |

## 11. main 작업 정합 (반드시)

2026-06-27 **main** 작업이 이 설계의 토대인데 **엉뚱한 브랜치(main)** 에 있다:
- **모델명 ↔ base_gear 교정**(Green OD 등 21곳 + effects/cabs.md): 피봇 그라운딩·투영 룩업의 정확성 소스. **피봇으로 포팅 필수**(현재 피봇 `system-prompt.md`·`parser-contract.md`는 아직 `TS-808` 표기).
- **카탈로그 게이트**(`catalog.ts`): 투영 검증 + sync 검증으로 포팅.
- 액션: main의 `54041a8`(fix 데이터)·`405dc46`(feat 게이트)를 피봇으로 cherry-pick/포팅, 표기 정렬.

## 12. 단계별 롤아웃 (피봇 Phase 0~6 이후의 새 단계)

각 단계 = `docs/web-harness.md` 루프. 의존 순서.

- **P7 — main 정합:** 모델명 교정 + 카탈로그 게이트를 피봇으로 포팅(§11). 그라운딩 표기 정렬. (선행, 작음)
- **P8 — device-spec + 레지스트리:** `profile.md` device-spec 펜스(GP-150) + `gen:processors` + `processors` 적재. 렌더러가 moduleOrder/scale을 데이터에서. (멀티 토대, 신규 기기 0)
- **P9 — 캐논/투영 분리 + gear KB:** ① gear KB 스키마(`gear`) + base_gear 레코드(§9) ② **씨앗**(GP-150 카탈로그 역인덱싱 ~80종 + Gemini 2.5 Flash 1패스 속성 보강) ③ `catalog.ts` 확장(base_gear 추출 → 역인덱스) ④ 투영 스크립트(`lib/project/`, base_gear↔model 조인·속성 대조) + 검증 재사용 ⑤ **라운드트립 게이트**(기존 8곡 역투영→재투영 동일). system-prompt/schema 캐논화. (노브 스케일은 GP-150 내 항등 — P12 경계)
- **P9.5 — gear 적재 크론 (신규):** 블로그·게시글 등 **문서 소스** 크론 크롤 → Gemini 2.5 Flash 정제 → `gear` 누적. 출처·confidence·**머지/중복제거** 레이어(`aliases`처럼 사람 교정 가능). `data-scraper-agent` 패턴(GitHub Actions + Flash + Supabase) 위에 구현, 새로 짜지 않음. KB 스키마 확정(P9) 후 착수. 설계 §15.
- **P10 — 계정 + 저장:** Supabase Auth + `saved_patches` + RLS + 비로그인생성/로그인저장 UX.
- **P11 — 정규화 깔때기:** 퍼지 + LLM 해소 + `aliases` 학습.
- **P12 — 둘째 기기 end-to-end:** `processor-builder` 스킬로 실제 멀티이펙터 1종 학습 → 투영 → 스킨 → 선택 UX. (비전 증명. 노브 스케일/노브명 리매핑이 여기서 실물화)
- **(미래 — 과금 트랙):** 오디오 분석 + 고성능 LLM 프리미엄 피더. **지금 짓지 않음** — P10(계정) 이후 라우팅 레이어로 올라탐. 설계 seam만 확보(§16): `gear.source_class`/`confidence` 고신뢰 덮어쓰기 + n8n 모델 승급 지점. 비즈니스 모델 투입 시 활성.

> P7~P9가 토대(투영 가능 상태). P9.5는 P9 후 KB 스케일. P10·P11은 독립적으로 병행 가능. P12가 "멀티 기기" 가치 증명. 과금 트랙은 P10 이후.

## 13. 미해결 / 리스크

- **투영 디스앰비규에이션(1:N·오리지널·퍼지) — 해소 방향 확정(§4·§9):** base_gear를 구조화 레코드로 만들어 속성 대조 매칭(이름 정확/부분 우선 → category+character 폴백 → confidence 강등). 실측 케이스(Guv'nor→Chief/La Charger 등)는 §4. 남은 일: 속성 스키마를 어디까지 채울지(최소 시작, 실제 충돌 시 확장).
- **노브 스케일 변환 — P9 범위 밖:** GP-150 내 투영은 항등이라 P9에선 미발생. 실기↔기기 스케일/노브명 리매핑(device-spec valueScale + 모델별 노브 메타)은 **P12 둘째 기기에서** 실물화.
- **gear KB 크롤 노이즈(P9.5):** 블로그·게시글은 모순·SEO 스팸 多 → 출처·confidence + 머지/중복제거 + 사람 교정 레이어 필수. Flash 정제 비용 상한.
- **캐논 품질:** 실기 확정이 부정확하면 모든 기기 투영이 같이 틀림(단일 실패점). confidence·👍👎·재생성 + gear KB 누적으로 방어.
- **교차언어 오탐**(§7) + LLM 정규화 비용 상한.
- **마이그레이션:** 기존 `patches`(기기별) → 캐논 역추출. base_gear가 이미 있으니 대체로 가능, 누락분 점검(라운드트립 게이트가 곧 검증).
- **스킨 데이터화 한계:** 색 토큰은 데이터로, 패널 레이아웃이 기기마다 크게 다르면 컴포넌트 분기 필요할 수 있음(첫 기기는 토큰만).
- **과금 트랙 의존성:** 오디오+고성능 LLM 프리미엄 피더는 P10(계정) 선행 필요. 지금은 seam만(§16).

## 14. 한눈에 — 재사용 vs 신규

| 재사용 | 개정 | 신규 |
|---|---|---|
| 렌더러·types·변주탭·guitar·rest.ts·validate.ts·main 카탈로그 게이트·`data-scraper-agent` 패턴 | system-prompt·schema(캐논화: base_gear 레코드)·`catalog.ts`(base_gear 추출 확장)·normalize(깔때기)·n8n(리서치→확정) | 투영 스크립트 · **gear KB(`gear`)** · **씨앗(카탈로그 역인덱싱+Flash)** · **gear 적재 크론(P9.5)** · device-spec/gen:processors · processor-builder 스킬 · Auth/saved_patches · aliases · 둘째 기기 스킨 · 과금 seam(§16) |

## 15. gear KB & 적재 파이프라인 (신규)

real-gear 지식 베이스. 캐논↔기기를 잇는 어휘(§4)이자, 캐논 base 모델 확정의 소스(§9). **누적**이 원칙 — 한 번 조사한 기어는 재사용해 곡당 과금을 $0로 수렴.

**피더 3개:**
1. **씨앗 (초반 1회):** GP-150 `amps.md`·`effects.md`의 `(기반: …)` **역인덱싱** → 실기 ~80종(= "범용적으로 많이 쓰는 기어"를 Valeton이 이미 선별). 각 항목에 Gemini 2.5 Flash 1패스로 속성·카테고리 보강. **from-scratch 조사 불필요**, 기기가 실제 에뮬 가능한 것만 담김.
2. **크론 적재 (지속, P9.5):** 블로그·게시글 등 문서 소스 스케줄 크롤 → Flash 정제 → `gear` 누적. GP-150이 안 가진 기어·더 깊은 속성·곡-기어 출처로 확장. `data-scraper-agent` 패턴(GitHub Actions + Flash + Supabase).
3. **곡별 리서치 (생성 시):** KB 미스인 곡만 신규 조사 → 확정 → KB 환류. ②③이 채울수록 ③이 줄어 비용 수렴.

**품질:** `source_class`(씨앗/크론/곡별/프리미엄) + `confidence` + 머지/중복제거. 크롤 노이즈 대비 사람 교정 가능 레이어(`aliases`와 동형).

> 비용 철학: 크론은 사용자 요청과 무관한 **선제·저가** 적재라 "신곡 1회 과금" 원칙을 깨지 않고 **강화**한다.

## 16. 과금 seam (미래 트랙 — 지금은 틈만)

비즈니스 모델 투입 시 **오디오 분석 + 고성능 LLM**을 프리미엄으로 추가 예정. **재설계 없이** 끼우기 위해 지금 두 틈만 확보:

1. **데이터 틈 — `source_class`/`confidence`:** gear·canonical이 피더별 신뢰도 태그를 가짐. 프리미엄 피더(오디오+고성능 LLM)는 **고신뢰도로 적재·덮어쓰기** → 같은 테이블, 라우팅만 다름.
2. **모델 틈 — n8n 승급 지점:** CLAUDE.md "Flash → 필요시 승급"이 이미 존재. 과금 트랙은 그 승급을 **더 깊게(고성능 LLM + 오디오 입력)** 만드는 라우팅.

→ 의존: P10(계정)으로 유료 사용자 게이팅. 무료 = Flash + KB, 유료 = 고성능 경로(+KB 환류). 지금은 트랙 (i, 문서 소스)만 구현, (ii, 오디오) deferred.

**투 트랙 확정(2026-06-28, 사용자):** (i) 문서 소스 = 지금 무료, (ii) 오디오 + 고성능 LLM = 과금 모델과 함께 후속.
