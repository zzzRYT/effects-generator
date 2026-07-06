# 구조 리셋 설계 — 독립 엔티티 + 중간 레이어 + 어드민 기어 온보딩 (2026-07-04)

> ⚠️ **2026-07-06 부분 번복.** 이 문서의 **생성 구조 결정**(§0 "1단 직접 생성", 캐논/투영 폐기)은
> `2026-07-06-canon-projection-revival-design.md`가 뒤집었다 — 캐논+투영 구조가 부활했다.
> 이 문서의 나머지 결정(독립 엔티티 4·n8n 제거·LLM=Gemini seam·검증 게이트 개념)은 **유효**하며
> 새 문서가 그대로 이어받는다. **최신 권위: `2026-07-06-canon-projection-revival-design.md`.**
>
> 기존 `2026-06-25-tone-generator-pivot-design.md`(피봇)과
> `2026-06-28-canonical-projection-architecture-design.md`(캐논·투영)는 이 문서 작성 시점엔
> **폐기(superseded)** 였으나, 06-28의 캐논·투영 핵심은 07-06에서 조건부로 되살아났다 —
> 06-28 문서 상단 노트 참조. CLAUDE.md·backlog는 07-06 문서 기준으로 개정한다.

## 0. 결정 요약

| 항목 | 결정 |
|---|---|
| 리셋 범위 | 설계 리셋 + 코드 선별 재사용 (렌더러·검증 게이트·Supabase 등 검증된 자산은 새 설계에 맞으면 이식) |
| 생성 단위 | 고정 3-role 세트: **lead / backing / solo** (곡에 파트 없으면 해당 role은 null + 사유) |
| 생성 구조 | **1단 직접 생성.** 기타는 바디 아키타입 6종으로 정규화해 조합 폭발 억제. 캐논/투영 2단 구조 폐기 |
| 바디 아키타입 | `strat / tele / lespaul / sg / superstrat / hollow` (6종 enum). 사용자는 실제 기타명 입력, 내부에서 매핑 |
| 캐시 키 | `(song_id, body_archetype, processor_id, role, version)` — 스키마 레벨 유니크 |
| 캐시 히트 UX | **연출된 진행 + 짧은 대기**(20~40초, 리서치 단계 표시 후 반환). 즉답으로 인한 신뢰성 저하 방지. 설계 부채로 인지 |
| 기어 KB 저장 | **구조화 DB(Supabase) + 원본 문서(PDF/HTML) Storage 보관**(출처·감사용) |
| 기어 온보딩 | **자동 파이프라인 + 어드민 승인 게이트.** draft → 어드민 검토·승인 → approved만 생성에 사용 |
| LLM | **전부 Gemini**(검색 그라운딩 내장). 단 호출은 OpenAI 호환 인터페이스 한 곳(`web/lib/llm/client.ts`)에 모아 추후 Ollama 교체 seam 확보 |
| 오케스트레이션 | **n8n 제거.** 파이프라인은 `web/lib/pipeline/`의 순수 TS 모듈 + Route Handler/백그라운드 함수. 근거는 §6 |

## 1. 도메인 모델 — 독립 엔티티 4 + 중간 레이어 2

원칙: **엔티티는 서로를 모른다.** 조합 지식은 중간 레이어에만 존재한다.
새 기기·기타 추가가 기존 엔티티 코드를 건드리지 않아야 한다.

### 독립 엔티티

1. **`guitars`** — 기타 모델 KB.
   `{ brand, model, body_archetype, pickups, selector_positions, controls, sources[], confidence, status(draft|approved) }`
2. **`processors`** — 멀티 이펙터 KB.
   `{ brand, model, modules[](모듈 슬롯 구조), effects_catalog[](FX 이름·타입·노브 정의·범위), amps[], cabs[], sources[], confidence, status }`
3. **`songs`** — 곡 정규화 레코드. `{ artist, title, artist_norm, title_norm, aliases[] }`. 기어를 전혀 모름.
4. **`tones`** — 생성 산출물. `{ song_id, body_archetype, processor_id, role, signal_chain JSONB, version, status }`.
   `signal_chain` 내부의 FX 이름은 해당 프로세서의 `effects_catalog`에 실존해야 함(검증 게이트 대상).

### 중간 레이어

- **`ToneRequestResolver`** — 사용자 입력(곡명·아티스트·기타명·이펙터명) → `(song_id, body_archetype, processor_id)` 정규화 튜플.
  곡명 정규화(aliases 조회 → LLM 해소 → 학습), 기타명→아키타입 매핑, 미등록 기어 감지→온보딩 큐 투입.
- **`ToneGrounding`** — 생성 시점에 processors·guitars에서 필요한 스펙만 뽑아 프롬프트 컨텍스트로 조립.
  엔티티 스키마 변경이 생성 프롬프트에 직접 새지 않게 하는 인터페이스.

렌더러는 `tones.signal_chain` + `processors`의 노브 정의만 보고 그린다.
새 이펙터 지원 = processors 행 추가 + (선택) 스킨 CSS. 렌더러 로직 무변경.

## 2. 생성 플로우 (톤 메이커)

```
[입력 폼] 곡명 + 아티스트 + 내 기타 + 내 이펙터
  ↓ ① ToneRequestResolver
     - 곡명 정규화 / 기타명→body_archetype (미등록 기타: 아키타입 LLM 추정으로 즉시 진행 가능)
     - 이펙터 조회 (미등록: 온보딩 큐 + "지원 준비중" 안내 — 스펙 없이는 생성 불가)
  ↓ ② 캐시 조회 (song, archetype, processor)
     - HIT → 연출된 진행(20~40초) 후 반환
     - MISS → ③
  ↓ ③ 톤 리서치 (Gemini + 검색 그라운딩) — 곡당 1회, song_research에 구조화 노트로 캐시
  ↓ ④ 톤 생성 (Gemini) — ToneGrounding 컨텍스트로 lead/backing/solo 3개 signal_chain
  ↓ ⑤ 검증 게이트 — 스키마 + FX 실존 대조 + 노브 범위. 실패 → 1회 자동 수리 → 재실패 시 job=failed
  ↓ ⑥ tones 3행 적재 → 카탈로그 노출
```

- 리서치 노트는 **곡 단위 캐시** — 같은 곡을 다른 기기로 요청해도 ③ 생략, ④부터. 비싼 호출은 곡당 1회.
- 진행 상태는 `tone_jobs` + Supabase Realtime으로 푸시(연출 대기도 이 채널로 단계 표시).

## 3. 어드민 기어 온보딩 파이프라인

기타·이펙터 공통 뼈대, 산출 스키마만 다름.

```
[트리거] 자동(사용자 미등록 기어 입력 → gear_onboarding_jobs) | 수동(어드민 모델명 입력)
  ↓ ① 수집: Gemini 검색 그라운딩으로 공식 스펙·매뉴얼 PDF·리뷰 탐색. 원본은 Storage 보관
  ↓ ② 정제: Gemini 구조화 출력 → 필드별 source(원본 참조) + confidence
  ↓ ③ 스키마 검증 → draft로 guitars/processors 적재
  ↓ ④ /admin 승인 UI: draft ↔ 원본 나란히 검토 → 수정·승인·반려. approved만 Resolver 매칭 대상
  ↓ ⑤ (선택) 승인 시 대기 중이던 사용자 요청 재개
```

- `/admin`은 별도 앱이 아니라 `web/`의 라우트(Supabase Auth + admin role RLS).
  큐 목록·draft 검토·수동 트리거·실패 잡 재시도 담당.
- 이펙터의 FX 카탈로그는 **그라운딩이자 검증 기준** — 승인 게이트가 곧 톤 품질 게이트.
- 매뉴얼 PDF 확보 기기는 confidence 높음, 리뷰 글만 있으면 낮음 → 어드민 우선 검토 신호.

## 4. 데이터 스키마

| 테이블 | 역할 |
|---|---|
| `guitars` / `processors` | 기어 KB (draft/approved, sources, confidence) |
| `songs` | 곡 정규화 + aliases 학습 |
| `song_research` | 곡당 1회 리서치 노트 (곡 단위 캐시) |
| `tones` | 생성 산출물. 유니크 `(song_id, body_archetype, processor_id, role, version)` |
| `tone_jobs` | 생성 잡 상태 (queued→researching→generating→validating→done/failed) + Realtime |
| `gear_onboarding_jobs` | 온보딩 큐 + 파이프라인 상태 |

- RLS: 공개 읽기(approved·done만) / 쓰기는 서버(서비스 롤) / admin 테이블·draft는 admin role만.
- 기존 `patches` 테이블·`patches/*.md`는 씨앗 마이그레이션(→ songs/tones/processors/guitars) 후 폐기·보존.

## 5. 코드 구조 (web/)

```
web/lib/
  llm/client.ts        # OpenAI 호환 단일 LLM 인터페이스 (Gemini ↔ Ollama 교체 seam)
  pipeline/            # 순수 TS 파이프라인 모듈 (전부 유닛테스트 가능)
    resolver.ts        # ToneRequestResolver
    grounding.ts       # ToneGrounding
    research.ts        # 곡 톤 리서치
    generate.ts        # role별 signal_chain 생성
    validate.ts        # 검증 게이트 (FX 실존·노브 범위·스키마) + 수리 루프
    onboarding/        # 기어 수집·정제·적재
  renderers/           # signal_chain 렌더러 (기존 자산 이식)
app/
  (public)/            # 생성 폼·카탈로그·곡 상세(role 3탭)
  admin/               # 승인 UI
  api/                 # 잡 생성·처리 Route Handler / 백그라운드 함수
```

- 프롬프트 권위는 계속 `.claude/skills/tone-builder/` 계열 문서 — 파이프라인이 로드해 사용.
- 파일 작게(200–400줄), 기능 단위 폴더, 불변성 — 전역 규칙 준수.

## 6. n8n 제거 근거

1. **계약 분열** — FX 실존 검증은 TS(`web/lib`)의 타입·렌더러와 한 몸. n8n에 두면 복제(드리프트) 또는 API 역종속.
2. **테스트 불가** — n8n 워크플로우는 vitest 대상이 아님. TS 모듈이면 LLM 목으로 파이프라인 전체 유닛테스트.
3. **버전 관리 부재** — 워크플로우는 git 밖. 프롬프트·스키마·검증이 같이 진화하는 구조에서 치명적.
4. **운영 표면 증가** — Vercel+Supabase 2개에 세 번째 시스템·비용·키 복제 추가.
5. **실수요 부재** — 파이프라인 실체는 LLM 2~3회 + 검증 + insert. 재시도·상태는 `tone_jobs`가 담당.

장시간 배치(예: 상시 기어 수집 크론)가 실제로 생기면 그 작업만 Supabase Edge Function + pg_cron으로 분리.

## 7. 에러 처리·테스트

- 모든 단계는 job status + `failure_reason`(사용자 메시지/내부 상세 분리) 기록. 조용한 실패 0.
- 검증 실패 → 오류 내역 첨부 1회 자동 수리 → 재실패 시 failed. 카탈로그 오염 0.
- 미등록 이펙터는 실패가 아닌 온보딩 대기 분기.
- 테스트: 파이프라인 유닛(LLM 목) / 계약·드리프트 가드(카탈로그↔검증↔TS 타입) /
  골든 라운드트립(기존 8곡 마이그레이션분이 새 게이트 통과) / Playwright E2E(LLM 목 모드).

## 8. 단계 계획 (새 백로그)

| 단계 | 내용 |
|---|---|
| **R0** | 새 Supabase 스키마 + 씨앗 마이그레이션(GP-150 카탈로그→processors, Cort G250→guitars, 8곡→songs/tones) |
| **R1** | `web/lib/pipeline/` — LLM seam + Resolver + Grounding + 검증 게이트 (전부 목 테스트) |
| **R2** | 톤 생성 end-to-end — Gemini 실연결, tone_jobs + Realtime, 연출 대기 |
| **R3** | 웹 개편 — 새 생성 폼(기타·이펙터 입력) + role 3탭 결과 뷰 + 카탈로그 |
| **R4** | 어드민 — 온보딩 파이프라인 + `/admin` 승인 UI (Supabase Auth) |
| **R5** | 둘째 기기 검증 — M-Vave 블랙박스 온보딩→생성→렌더 (비전 증명) |

미래(짓지 않음, seam만): Ollama 교체(§0 LLM seam), 과금 트랙, 오디오 분석 피더.
