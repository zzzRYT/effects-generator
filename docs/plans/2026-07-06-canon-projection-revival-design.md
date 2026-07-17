# 캐논·투영 부활 + 어드민 수동 온보딩 + 역할 5종 확장 (2026-07-06)

> **이 문서가 새 권위다.** `2026-07-04-structure-reset-design.md`의 **생성 구조 결정만** 번복한다
> (1단 직접 생성 → 캐논+투영). 그 문서의 나머지 결정(독립 엔티티 4·n8n 제거·LLM=Gemini seam·
> 검증 게이트 개념)은 **유효**하며 이 문서가 그대로 이어받는다.
>
> `2026-06-28-canonical-projection-architecture-design.md`의 캐논·투영 핵심(§2~§4, §9)을
> **조건부로 되살린다.** 단 gear 크론 적재(§15 피더②, P9.5)와 자동 온보딩 큐 자동화는 제거하고
> **어드민 수동 입력**으로 대체한다. 계정/저장(그 문서 P10)·정규화 깔때기(P11)는 이 문서 범위 밖 —
> 미결정, 유보.
>
> **2026-07-17 북극성 개정 노트:** 아래 결정 #5 **'개인용 우선'은 폐기**됐다 — 프로젝트는 **공개 제품/서비스**
> (타깃 = 입문자(저가 멀티이펙터), 첫 출시 = GP-150 + Mooer GE-150 · i18n 3언어(en/ko/ja) · 곡 20~30 선적재 ·
> 익명 + 생성 가드 3종). 이 문서의 아키텍처(캐논+투영·수동 온보딩·검증 게이트)는 그대로 유효하나, 잔여 단계
> (R5~R7)의 순서·범위는 `docs/backlog.md` 상단 **"북극성 로드맵(2026-07-17)"**(독푸딩 → 품질 환류 → 출시 준비)이
> 대체한다. 북극성 선언 = `CLAUDE.md` "북극성" 섹션, 결정 기록 = dev-hub `공개-제품-북극성-map`(EG-T1~T9).

## 0. 이번 결정 요약

| # | 항목 | 결정 | 근거 |
|---|---|---|---|
| 1 | 생성 구조 | **캐논+투영 부활.** 캐논(AI, 곡당 1회, 실기 기준 기기무관) + 투영(스크립트, AI 없이 결정적 변환)으로 분리. 07-04의 "1단 직접 생성"을 대체 | 기기 간 일관성·투영 룩업의 사람 검증 가능성·디버깅 가능성이, 매번 LLM이 기기 매핑을 재추론하는 것보다 높다고 판단 |
| 2 | role | **3종 → 5종**: `lead / backing / solo / real-amp / phone` | 실사용 요구사항. `real-amp`·`phone`의 정확한 산출 형태·축(곡 파트 vs 출력 대상)은 미확정 — §5 |
| 3 | gear KB 적재 | **크론(자동 크롤링) 제거.** 어드민(본인)이 직접 정합성 판단 후 수동 입력·레퍼런스 업로드 | 개인 스코프에서 크롤 노이즈 방어 비용이 실이득보다 큼(YAGNI) |
| 4 | 온보딩 트리거 | **자동 감지 큐 대신 요청 폼.** 미등록 기어를 만나면 사용자가 "기타·이펙터 추가 요청" 폼 제출 → 이메일 → 어드민이 수동으로 admin 패널에서 추가 | 사람이 게이트인 흐름이 개인 스코프에 맞음, 기존 문의 폼 인프라(`request-form`) 재사용 |
| 5 | 스코프 | **개인용 우선.** 다중 사용자 오픈 카탈로그를 전제한 계정/공유캐시(06-28 §6)는 이 문서에서 다루지 않음 | 지금 필요 없음. 필요해지면 별도 사이클 |
| 6 | AI 곡 리서치 | **그대로 유지.** 곡별 실제 톤 리서치(Gemini 검색 그라운딩)는 크론과 무관하게 "곡 생성 요청 시 1회성 호출"로 계속 수행 | 이번에 제거하는 건 gear KB 크롤링뿐 — 곡 리서치는 애초에 크론이 아니었음 |

## 1. 아키텍처 — 독립 엔티티 + gear KB + 캐논/투영

07-04의 "엔티티는 서로를 모른다" 원칙은 유지하고, 06-28의 캐논/투영 분리를 재도입한다.

### 독립 엔티티

- **`guitars`** — 기타 KB, body_archetype 6종 정규화 (07-04 그대로)
- **`processors`** — 멀티이펙터 KB: 모듈 구조 + `effects_catalog`(모델명·노브 정의·범위) (07-04 그대로. 적재는 어드민 수동)
- **`songs`** — 곡 정규화 (07-04 그대로)
- **`gear`** — *(06-28에서 재도입)* 실기 KB(실제 앰프·페달). `{ name, name_norm, category, attributes, source, confidence, status }`. 캐논↔기기를 잇는 어휘(`base_gear`). **적재는 전부 어드민 수동**(크론 없음)
- **`canonical_tones`** — *(06-28에서 재도입)* 곡당 1회, 기기무관, 실기(`gear`) 기준. `{ song_id, role, chain(실기 어휘), confidence, sources, status }`. role 5종
- **`tones`** — 투영 산출물. `{ song_id, body_archetype, processor_id, role, signal_chain, version, status }`. 유니크 `(song_id, body_archetype, processor_id, role, version)` (07-04 그대로. 이제 "생성"이 아니라 "투영" 결과)

### 중간 레이어

- **`ToneRequestResolver`** — 입력 정규화 (07-04 그대로)
- **`ToneGrounding`** — 캐논 생성 시 gear KB 대조용 컨텍스트 조립 (07-04 개념 유지, 대상이 `tones`가 아니라 `canonical_tones`로 이동)
- **`ToneProjector`** — *(06-28의 투영 스크립트, 신규 도입)* `canonical_tones` + `processors.effects_catalog` → 결정적 매핑(`gear.name_norm` ↔ 처리기 카탈로그의 base_gear 대조) → `tones` 행. **AI 없음.**

## 2. 생성 플로우

```
[입력] 곡+아티스트+내 기타+내 이펙터
  ① Resolver — 곡 정규화, 기타→body_archetype, 이펙터 조회
     - 미등록 이펙터/기타 → "지원 준비중" 안내 + 하단 "기타·이펙터 추가 요청" 폼 유도(§4)
  ② 캐논 캐시 조회 (song_id, role 기준 — 기기무관)
     HIT → ④
     MISS → ③
  ③ 캐논 생성 — Gemini 검색 그라운딩으로 곡 리서치(곡당 1회, song_research 캐시) → gear KB를
     **소프트 어휘 힌트**로 준 뒤 실기 base_gear 서술 → canonical_tones 적재.
     **캐논은 곡 파트 3-role(lead/backing/solo)만**(2026-07-06 결정, §5). (해당 파트 없으면 chain=null + null_reason)
     **캐논 게이트 = 스키마 + base_gear 모양(name/category)만.** gear KB 실존 대조는 여기서 안 함 —
     투영(④)으로 이관(2026-07-06 결정, §5): gear KB가 실제 쓰이는 곳이 투영 룩업이라 캐논 시점 강제는
     부트스트랩 닭-달걀만 만든다. chain 있는데 게이트 실패한 role 은 적재 보류 + 사유 리포트(자동 수리 없음).
  ④ 투영 — ToneProjector: canonical_tones + processor 카탈로그의 **base_gear 역인덱스**
     (`effects_catalog.entries` — md 의 "(기반: 실기명)" 매핑, R3에서 추출기 확장) → 결정적 변환 → tones 행.
     매핑 = **2단 룩업**(2026-07-07 확정): ① slugify(캐논 base_gear.name) ↔ slugify(entry.base_gear) 정확 일치
     → ② 실패 시 경계 포함 매칭(한쪽 slug가 다른 쪽의 `-` 경계 접두/접미 — "ibanez-ts-808" ⊂
     "ibanez-ts-808-tube-screamer"). 근거: 라운드트립 실측에서 정확 일치만으로는 91블록 중 39개가 짧은형↔긴형
     표기 차로 미매핑(mismatch 는 0) — 캐논 AI 도 통용 짧은형을 쓰므로 정확 일치는 구조적으로 취약. 2단도
     결정적(문서 순서)이고 근사 매칭은 notes 에 기록. + kind 교차검증(AMP↔amp, CAB↔cab, 그 외↔effect).
     1:N(예: Mess2C+ 1/2/3)은 문서 순서 첫 항목 채택(결정적) + 리포트.
     **기능 모듈 디폴트 폴백(2026-07-08 확정, 사용자 승인):** `NR/EQ/DLY/RVB/VOL`(기능 모듈)은 base_gear
     미매핑 시 `effects_catalog.defaults`(시드에 사람이 지정한 실존 모델: Gate 1/Guitar EQ 1/Digital Delay S/
     Room/Volume)로 폴백 — 노브는 캐논 값 유지, notes 기록. 근거: GP-150 md의 DLY/RVB 는 제네릭 모델이라
     "(기반:)"이 없어, 캐논이 실기(Boss DD-3 등)로 서술하면 구조적으로 전 곡 미매핑(라이브 스모크 실측).
     기능 모듈은 파라미터가 톤을 규정하고 모델 선택은 부차적이라 디폴트가 정당하다.
     **톤 정체성 모듈(AMP/DST/CAB/PRE/WAH/MOD)은 폴백 없음** — 미매핑 = 해당 role 투영 실패 +
     리포트(적재 안 함, 대체 없음). 미매핑 실기 목록이 곧 어드민 온보딩 TODO.
     **여기서 출력 대상 2종(real-amp/phone)이 파생**: 대표 파트(lead→backing→solo 폴백, §5) 톤을 출력
     프로파일(캐비/IR on-off)로 변환해 tones.role 5종을 채운다.
  ⑤ 검증 게이트 — 스키마 + FX 실존(처리기 카탈로그 대조) + 노브 범위.
     실패 시 07-04식 "1회 자동 수리"는 적용 안 됨 — 매핑 실패는 gear/processors 데이터를
     사람(어드민)이 교정해야 함
  ⑥ tones 노출 (캐시 히트 UX: 연출된 진행 유지)
```

캐시 히트 판정 기준이 07-04와 달라진다: 07-04는 `(song, archetype, processor, role)` 전체가
캐시 키였지만, 이제 **캐논은 `(song, role)`만으로 캐시**되고 기기 조합은 투영이 그때그때(또는
투영 결과 캐시) 처리한다 — 신곡이 아니면 AI 호출 자체가 없다.

## 3. 어드민 — 수동 gear/canon 온보딩

07-04 §3(자동 파이프라인+승인 게이트)의 **자동 수집 단계를 제거**하고 어드민 직접 입력으로 대체한다.

```
[트리거] 이메일(요청 폼, §4) 확인 후 어드민이 직접 판단 → 필요하면 온보딩
  ① 어드민이 /admin에서 gear/processors/guitars 레코드 직접 입력(브랜드·모델·속성·노브 정의 등)
  ② 레퍼런스 업로드(매뉴얼 PDF·리뷰 URL·직접 작성한 메모) — Storage 보관(출처)
  ③ 스키마 검증 → 즉시 approved (어드민 본인 입력이므로 별도 draft↔검토 단계 불필요)
```

- 자동 리서치(Gemini 수집) 단계는 **선택적 보조**로만 남길 수 있다 — 어드민이 "이 참고자료로
  초안 뽑아줘" 버튼을 누르면 구조화 초안을 만들어주되, 승인은 항상 어드민 수동. 이 보조 기능은
  이번 사이클 필수 아님(있으면 편의).
- 07-04 §3의 `gear_onboarding_jobs` 큐·자동 감지 트리거는 **불필요** — 요청 폼(§4)이 그 역할을
  대체한다.

## 4. 문의 폼 확장 (요청 유형 3종)

기존 `request-form`(곡 제보 전용, `docs/prd/request-form.md`)을 확장한다. **별도 브레인스톰
사이클로 진행**(`docs/backlog.md`에 등록).

- 요청 유형 선택: **곡 제보** / **기타·이펙터 추가 요청** / **일반 문의**
- 기어 추가 요청 필드: 브랜드·모델명·참고 링크(매뉴얼/리뷰 URL)·요청자·메모
- 백엔드 0 유지 — Web3Forms→Gmail 그대로. admin 패널(Supabase)과는 별개 경로.
- 비목표: 자동 온보딩 트리거(사람이 이메일 보고 수동 처리), 요청 상태 추적 UI(이메일이 끝)

## 5. 미해결

- ~~**`real-amp`/`phone` role의 정확한 산출 형태**~~ **확정됨(2026-07-06):** 두 축을 분리한다.
  - **캐논 = 곡 파트 축**: `lead`/`backing`/`solo`만 AI 생성(기기무관, 실기 기준). `real-amp`/`phone`은
    캐논에 없다.
  - **투영 = 출력 대상 파생**: `real-amp`(실제 기타 앰프/파워앰프 출력 — 캐비·IR off 가정, EQ 보정)와
    `phone`(헤드폰/모바일 청취 — 캐비·IR on, 청취 EQ 보정)은 투영 단계에서 대표 파트 톤을 출력 프로파일로
    변환해 파생한다. `tones.role` enum 5종은 유지(투영이 채움), `canonical_tones`는 3-role만 사용.
  - 근거: 캐논=순수 톤(기기·출력무관), 투영=기기·출력 환경 반영이라는 캐논·투영 분리 철학과 일치. real-amp/phone은
    "어느 파트냐"가 아니라 "어디로 출력하냐"라 캐논(기기무관)에 넣으면 어색하다.
  - **대표 파트 선택 규칙(2026-07-07 확정, R3):** `lead → backing → solo` 우선순위에서 **투영에 성공한 첫 role**.
    셋 다 실패/부재면 real-amp/phone 은 적재 없이 skipped. 파생 소스 role 은 `tones.label` 에 기록(예: "real_amp 파생(lead)").
    근거: 출력 대상 톤은 "곡을 대표하는 톤"을 다른 청취 환경으로 옮기는 것 — 그 대표는 리드/훅 톤.
  - **출력 프로파일(2026-07-07 확정, R3):** `real-amp` = 모든 CAB 블록 `enabled:false`(실앰프 FX Return, 캐비 중복
    방지 — GP-150 hardware.md CAB on/off 지침), `phone` = 모든 CAB 블록 `enabled:true`. CAB 블록이 없으면 발명하지
    않고 그대로(결정적, 조작 없음). EQ 보정 등 정교화는 후속 seam.
- **캐논 게이트에서 gear KB 대조를 뺀다(2026-07-06 확정, R2)**: `validateCanon` = 스키마 + base_gear
  모양(name/category)만. gear KB 실존 검증은 **투영(R3) 룩업**이 담당한다. 이유: gear KB의 본래 용도가
  캐논↔기기 다리(`gear.name_norm` ↔ 처리기 카탈로그 base_gear)이고 그게 실제로 쓰이는 시점이 투영이다.
  캐논 시점에 KB 멤버십을 강제하면, gear 온보딩(어드민 수동, R5)이 되기 전엔 어떤 캐논도 통과 못 하는
  부트스트랩 데드락이 생긴다. 대안(씨앗 gear KB + 하드 게이트)은 시드 콘텐츠 수작업 + 미시드 곡 누락을
  부르므로 기각. 헌법 "캐논=스키마+gear대조" 문구는 이 결정으로 개정됨.
- **캐논↔기기 디스앰비규에이션(1:N)**: Guv'nor→Chief/La Charger 같은 사례. 06-28 §4·§9의 해소
  전략(구조화 `base_gear` 레코드 + 속성 대조)을 그대로 채택한다.
- **계정/저장/공유캐시(06-28 P10)·정규화 깔때기(P11)**: 이 문서 범위 밖. 개인용에서 필요 없으면
  계속 미룬다.
- **검증 실패 시 자동 수리 불가**: 투영은 AI가 아니라 스크립트라 07-04의 "1회 자동 수리" 개념이
  적용되지 않는다 — 매핑 실패는 gear/processors 데이터 자체를 사람이 교정해야 한다(§2 ⑤).

## 6. 단계 계획 (개정 로드맵)

07-04의 R0~R5를 아래로 교체한다.

| 단계 | 내용 |
|---|---|
| **R0** | ✅ 새 Supabase 스키마(6엔티티+song_research+tone_jobs) + 씨앗. 리모트 적용 완료 |
| **R1** | ✅ `web/lib/pipeline/` — LLM seam + Resolver + Grounding(캐논용) + 검증 게이트(목 테스트) |
| **R2** | ✅ 완료(라이브 검증 포함). 캐논 생성 end-to-end — `prompts`·`research`(song_research 캐시)·`generate`(3-role 캐논→게이트→`canonical_tones`)·`json`·`sbInsert`. **캐논 게이트=스키마+base_gear 모양**, gear KB 대조는 R3 투영으로 이관. Gemini 실호출 스모크 2곡 통과(2026-07-08) |
| **R3** | ✅ 완료(라이브 검증 포함). `web/lib/pipeline/projector.ts` — base_gear 역인덱스(`effects_catalog.entries` 187건) + **3단 룩업**(정확→경계 포함→토큰 부분수열, §2 ④) + **기능 모듈 디폴트 폴백**(`effects_catalog.defaults`, §2 ④) + kind 교차검증 + 대표 파트(lead→backing→solo) real-amp/phone 파생 + 게이트 + `tones` 적재. Resolver 슬러그 변형 조회. **라운드트립 골든**(91블록: 84 정밀·5 폴백·2 예외·mismatch 0). **라이브 스모크**: Oasis DLBIA 5-role 전부 적재, Creep 은 정당한 미매핑 리포트. 테스트 391 그린 |
| **R4** | 웹 개편 — 생성 폼 + role 5탭 결과 뷰 + 카탈로그 |
| **R5** | 어드민 — gear/processors/guitars 수동 입력 UI + 레퍼런스 업로드(Storage) |
| **R6** | 요청 폼 확장(별도 브레인스톰 사이클, 백로그 참조) |
| **R7** | 둘째 기기 검증 — 실제 멀티이펙터 1종 수동 온보딩→투영→렌더(비전 증명) |
