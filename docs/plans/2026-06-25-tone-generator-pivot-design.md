---
title: 멀티 이펙터 톤 생성기 — 피벗 설계
date: 2026-06-25
status: 설계 확정 (구현 대기)
topic: tone-generator-pivot
---

# 멀티 이펙터 톤 생성기 — 피벗 설계

## 0. 한 줄 요약

**큐레이션된 정적 톤 라이브러리**(사람이 `tone-builder` 스킬을 일일이 호출 → md → 빌드타임 정적 뷰)를,
**셀프서브 AI 톤 생성기**(아티스트+곡명 입력 → n8n이 AI로 생성 → Supabase 자동 축적 → 동적 공개 카탈로그)로 전환한다.

## 1. 배경 & 동기

- 현재: 패치는 사람이 `tone-builder` 스킬로 만들어 `patches/*.md`(SoT)에 쌓고, `web/`가 빌드타임에 타입 상수로 구워 **읽기 전용 정적 뷰**로 렌더. DB·백엔드 0.
- 문제: 톤 생성이 **사람 수작업**에 묶여 있어 곡 추가가 느리고, 사용자가 직접 만들 수 없다.
- 레퍼런스(인터넷): Gemini Gems로 *시스템 프롬프트(전문가 역할+라우팅 규칙) + 이펙트 리스트 그라운딩(할루시네이션 차단) + Deep Research*를 묶어 Ampero II 톤을 자동 설계 → 만족스러운 결과.
- 통찰: 우리 `tone-builder` 스킬 = 레퍼런스의 Gemini Gem과 **동일한 일**을 이미 한다. 그리고 `signal_chain` JSON 계약 + GP-150 렌더러가 이미 있어, **n8n이 그 JSON 모양 그대로 뱉으면 기존 렌더러로 바로 그린다.** → 이 피벗의 최대 재사용 포인트.

## 2. 확정된 결정 (브레인스토밍 수렴)

| # | 분기 | 결정 | 근거 |
|---|------|------|------|
| 1 | 결과 처리 | **자동 축적 공개 카탈로그** | 누구나 생성 → 검색/열람 |
| 2 | 저장소 | **Supabase DB (런타임 동적)** | 즉시 반영·확장·평점/중복 쿼리 |
| 3 | 프로세서 | **GP-150 먼저, 스키마는 비종속** | YAGNI. 멀티는 후일 '데이터 추가'만(재작성 X) |
| 4 | 중복/재생성 | **캐시 우선 + 수동 재생성(v2 누적)** | 비용 0 방어선, 깔끔, 변주 비교 |
| 5 | LLM | **클라우드 API**: Gemini Flash(무료등급, 리서치+생성) → 필요시 생성단계만 GPT-4o-mini 승급 | 약관 정상·홈서버 불필요·캐시로 사실상 $0 |
| 6 | 사용 범위 | **공개 서비스** | |
| 7 | 신뢰 장치 | **경량 세트**: confidence 배지 + 👍/👎 + 재생성 탈출구 | 사람 검수 없는 자동 축적의 자가 큐레이션 |
| 8 | 디자인 색 | **맥북 니어블랙 + 정직한 실제 기어색(네온 X)** | "기계처럼 보이되 배경과 어울려 안 떠 보이게" |

> ⚠️ 결정 1·2는 CLAUDE.md 핵심 규칙 3개(`DB 없음`·`웹 읽기 전용`·`md가 SoT`)를 의식적으로 뒤집는다. → §11 헌법 개정.

## 3. 시스템 아키텍처 (데이터 흐름)

```
[웹 폼: 아티스트 · 곡 · (프로세서=GP-150) · 메모]
        │  submit
        ▼
[Next API route] ──① 캐시 체크: Supabase에 (artist_norm, title_norm, processor) 있나?
        │                   └─ 있으면 최신 version patch 즉시 반환·렌더 (재생성 버튼 제공) — 비용 0
        │  없으면 (캐시 미스)
        ▼
   generation_jobs insert(status=pending) + n8n webhook 발사 (fire-and-forget)
        │
        ▼
[n8n 워크플로우]  =  tone-builder 스킬을 워크플로우로 이식한 "두뇌"
   a. 입력 정규화          (아티스트/곡 표기 통일)
   b. 기어 리서치          Gemini Flash + 웹검색 (레퍼런스의 Deep Research 역할)
   c. 그라운딩 빌드        GP-150 md(amps/cabs/effects/hardware ~28KB) 프롬프트 주입 = 허용 어휘 고정
   d. LLM 생성            signal_chain JSON 출력 (Structured Output 스키마 강제)
   e. 검증·수리 루프        parser-contract 검증 → 실패 시 에러 되먹임 재시도(최대 3) → 그래도 실패면 status=failed
   f. 적재 + 상태 갱신       Supabase patches insert + generation_jobs status=done
        │
        ▼
[브라우저] generation_jobs 행을 Supabase Realtime 구독 → "리서치 중…→생성 중…" 진행표시
        │  status=done
        ▼
[기존 GP-150 렌더러로 완성 JSON 그림]  (렌더러 무변경)
```

**비동기 + Realtime인 이유:** 리서치+생성이 20~90초 → 동기 HTTP는 Vercel 함수 타임아웃에 걸림. job 행 + Realtime 구독으로 우회.

## 4. n8n 생성 엔진 (두뇌)

`tone-builder` SKILL.md의 동작 순서를 노드로 분해:

1. **Webhook (트리거)** — `{artist, song, processor, notes}` 수신.
2. **기어 리서치** — Gemini Flash(네이티브 검색 그라운딩)로 원곡의 실제 앰프/페달/장르/구간별 사운드 조사.
3. **그라운딩 컨텍스트** — GP-150 모델 md 4종을 프롬프트에 주입. 시스템 프롬프트 = 이식한 `tone-builder` 규칙 + `parser-contract`의 `signal_chain` 스펙 + "이 목록 밖 모델명 금지".
4. **LLM 생성** — `signal_chain` JSON 출력. **Structured Output(JSON 스키마 강제)** 로 형식 붕괴 차단. 변주 2~3개 + `guitar` + `switching` + `confidence` 포함.
5. **검증·수리 루프** — 기존 `web/lib/parser/validate.ts` 규칙을 n8n Code 노드로 이식. 실패 시 에러를 LLM에 되먹여 수정(최대 3회).
6. **적재** — Supabase insert + job 상태 갱신.

**모델 분할:** 리서치=Gemini Flash(저렴/무료), 생성=Gemini Flash로 시작 → JSON 계약 품질 부족 시 생성단계만 GPT-4o-mini로 승급. 캐시가 반복 호출을 막아 비용은 사실상 신곡 1회만.

## 5. 데이터 모델 (Supabase 스키마)

기존 md 모델(1곡 = 변주 2~3개)을 테이블로 옮기고 캐시·버전·신뢰도를 얹는다.

```
processors   (slug PK 'gp150', name, value_scale, …)              ← 비종속 핵심. 멀티는 여기 행 추가
songs        (id, artist, title, artist_norm, title_norm, …)
             UNIQUE(artist_norm, title_norm)                       ← 정규화 키 = 캐시 조회/중복판정
patches      (id, song_id→songs, processor_slug→processors,
              version,                       ← (song,processor)당 1,2,3… 재생성 시 +1 (이전 보존)
              variations JSONB,              ← md 파일 통째 = [{label, signal_chain[], guitar, switching}]
              confidence, genre, model_used, status, created_at)
             └ variations JSONB 모양 = parser-contract 그대로 → 렌더러가 바로 먹음
ratings      (id, patch_id→patches, value, voter_hash, created_at) ← 👍/👎, 자가 큐레이션
generation_jobs (id, song_id, processor_slug, status, error, created_at) ← 비동기 진행 추적(Realtime)
```

- **캐시 흐름:** `(artist_norm,title_norm,processor)` 조회 → 있으면 최신 version 반환($0). 없으면 생성 후 version=1 insert. "다른 버전 생성" → version=2 누적(이전 보존, 변주 비교 가능).
- **핵심 재사용:** `patches.variations` JSONB가 `signal_chain` 모양과 동일 → `types.ts`·렌더러 무변경. md 파서만 "DB 조회 + JSONB 검증"으로 교체.

## 6. 웹 앱 변화

**재사용 지도 (최종):**
- **살림:** 시그널체인 렌더러 전체(GP-150 스킨·변주 탭), `types.ts`, 검증 *로직*.
- **교체:** 빌드타임 md 파서 → 런타임 DB 조회 / 정적 export → 동적(Vercel + Supabase).
- **이식:** `tone-builder` SKILL.md → n8n LLM 시스템 프롬프트, `parser-contract.md` → 프롬프트 내 JSON 스펙.
- **씨앗:** 기존 `patches/*.md` 8곡 → Supabase 1회 임포트(검증된 초기 카탈로그).
- **신규:** 생성 폼·진행 UI(Realtime)·👍👎·카탈로그 동적 쿼리.

**생성 흐름 UX:** 폼 제출 → 캐시 히트면 즉시 렌더 / 미스면 job 생성 + Realtime 진행표시 → 완료 시 렌더러로 그림.

## 7. 할루시네이션 / 품질 방어

3중 게이트:
1. **그라운딩** — GP-150 md를 프롬프트에 박아 "이 목록 밖 모델명 금지". (레퍼런스 PDF 업로드와 동일 원리, 우린 구조화 md라 더 유리.)
2. **Structured Output** — `signal_chain` JSON 스키마 강제(형식 붕괴 차단).
3. **검증·수리 루프** — `validate.ts` 규칙(12모듈 허용·노브 모양·guitar 범위)으로 검사, 실패 시 되먹임 재시도. 그래도 실패면 `status=failed` → 카탈로그 오염 0.

신뢰 레이어(경량): confidence 배지(계약에 이미 있음) + 👍/👎(상위노출·정렬) + 재생성(틀렸을 때 탈출구). 무거운 모더레이션은 공개 규모 커질 때.

## 8. 디자인 시스템 & 토큰

방향: **모양은 기계 패널 그대로, 색만 재정의.** ("떠 보이고 읽기 어려웠던" 원인 = 색이 배경과 안 어울림.)

- **배경 = 맥북 다크 계열 깊은 블랙.** 순수 `#000` 아님. 레이어로 깊이: 베이스 `#1d1d1f` / 패널 `#2a2a2c` / 표면 `#37373a`. → 블록이 "배경에 박힌 기계"처럼 앉음.
- **이펙터 색 = 네온 ❌ / 정직한 실제 기어 채도 ✅.** 글로우 대신 진짜 페달 색(OD=TS 그린, DST=레드/오렌지, MOD=코러스 블루, DLY=틸, AMP=빈티지 앰버 …). 블랙 위에서 쨍하되 천박하지 않게, **WCAG AA 대비**(데이터 계약이 이미 요구).
- **토큰은 OKLCH로 정의** — 색마다 채도·명도를 같은 기준으로 → 정직·일관된 톤 자동 정렬. 네온/글로우 토큰 없음.
- **컴포넌트:** shadcn/ui(헤드리스 토대, repo로 복사해 소유) + **디자인 토큰으로 무겁게 테마**(기본 shadcn 룩 제거 — 글로벌 안티-템플릿 규칙 준수). **Tailwind 도입**(shadcn 전제; 현재 CSS Modules에서 전환). 토큰=CSS변수 → Tailwind가 참조.
- **아이콘:** react-icons로 품질 향상.
- **여백 리듬:** `--space-*`(4/8/12/16/24/40…) 토큰으로 일관 간격, 웹·모바일 모두 편한 패딩/마진. 시그널 체인은 모바일 가로 스크롤-스냅, 데스크톱 전체 표시.

```
--color-bg:        oklch(20% 0.004 280)   /* 맥북 니어블랙 */
--color-surface:   oklch(26% 0.005 280)   /* 블록 패널 */
--color-surface-2: oklch(32% 0.006 280)   /* 노브/칩 */
--module-dst-od:   oklch(62% 0.16 150)    /* TS 그린 */
--module-dst:      oklch(60% 0.19 35)     /* 디스토션 레드 */
--module-mod:      oklch(60% 0.13 250)    /* 코러스 블루 */
--module-dly:      oklch(64% 0.12 190)    /* 딜레이 틸 */
--module-amp:      oklch(70% 0.10 75)     /* 빈티지 앰버 */
…  (모듈별 1색, 정직한 실제 기어 계열 — 정확한 hue는 디자인 사이클에서 대비 측정하며 확정)
```

## 9. 문의 / 피드백 폼 (제보 폼 재배치)

기존 "곡 제보"는 피벗으로 목적 소멸(이제 사용자가 직접 생성) → **개발자 문의/요청 창구**로 재배치.

- **이건 카탈로그(Supabase)와 무관한 별개 경로** — "백엔드 0 · 이메일" 모델 중 **유일하게 살아남는 조각**.
- 재사용: request-form 컴포넌트·`<dialog>`/no-JS 점진적 향상·honeypot·**Web3Forms→Gmail 그대로**.
- 필드: `곡·아티스트·요청자·메모` → **`문의 유형`(버그 신고/기능 제안/일반 문의) · `내용`(필수) · `회신 이메일`(선택)**.
- 카피: "곡 제보" → "개발자에게 문의·요청". 빈상태 CTA는 "곡 제보" 제거(빈상태=생성 유도), 푸터에 "문의·피드백" 링크 유지.
- 역할 분담: 패치별 즉석 피드백=👍/👎, 개발자 직통=문의 폼.

## 10. 비용 모델

- API = 호출당 토큰 종량제(구독 정액 아님). n8n은 API 키로 호출.
- 1회 생성 ≈ 입력 15K / 출력 4K 토큰 → Gemini Flash 무료등급 한도 내 **사실상 $0**, 초과 시에도 센트 단위.
- **캐시-우선**이 핵심 방어선: 과금은 신곡 첫 생성 1회뿐, 재방문/재요청은 $0.
- 첫 해 유니크 500곡 가정 시: 무료등급 내 $0 ~ 프리미엄 승급해도 ~$50.

## 11. 헌법 개정 (CLAUDE.md)

이 피벗의 전제. 구현 Phase 0에서 수행:
- `md가 유일한 진실` → **`Supabase가 카탈로그 SoT, 생성은 AI, 캐시-우선`**.
- `웹은 읽기 전용 정적 뷰` → **`웹은 동적 카탈로그(생성+조회)`**.
- `DB 없음` → **`Supabase 카탈로그 DB 사용`** (의도적으로 들인 복잡도).
- `곡 제보는 이메일` → **`문의·피드백은 이메일(백엔드 0)`** — 부분 생존.
- 스택에 **n8n(생성 오케스트레이션) · Supabase · Tailwind/shadcn** 추가.

> 실제 CLAUDE.md 재작성은 구현 킥오프 시 — 코드가 아직 구모델(정적/md)을 가정하므로 헌법만 먼저 뒤집지 않는다.

## 12. 단계별 롤아웃 계획

각 단계 = 기존 `docs/web-harness.md` 루프(brainstorm→PRD→TRD→TDD→CE 리뷰→QA), 매 편집 lint+typecheck 게이트.

1. **Phase 0 — 토대:** CLAUDE.md 개정 + Supabase 프로젝트·스키마 + env(API 키) 셋업.
2. **Phase 1 — n8n 두뇌:** 리서치→그라운딩→생성→검증/수리 워크플로우. **오아시스로 기존 md와 대조 검증**(스키마 일치).
3. **Phase 2 — Supabase 연동:** 스키마 적용 + 씨앗 임포트(기존 8패치) + 캐시 조회 + 적재.
4. **Phase 3 — 웹 데이터레이어:** md파서 → DB 조회 전환, 생성 폼 + 비동기 job + Realtime + 렌더러 재사용, 카탈로그 동적화.
5. **Phase 4 — 신뢰 레이어:** confidence 배지 + 👍/👎 + 재생성.
6. **Phase 5 — 디자인 시스템:** Tailwind/shadcn 전환 + OKLCH 토큰(맥북블랙+기어색) + react-icons + 여백 리듬 + 반응형 체인.
7. **Phase 6 — 가드 & 배포:** 레이트리밋·허니팟(남용), 문의 폼 재배치, 비용 모니터, 배포.

## 13. 미해결 / 리스크

- Gemini 무료등급 한도·프라이버시(입력이 모델개선에 쓰일 수 있음 — 곡 톤 데이터라 민감도 낮음). 발급 시 현재 정책 확인.
- 정규화 키(artist/title) 동의어·표기 흔들림 → 캐시 미스 과다 가능. 정규화 규칙 설계 필요.
- Structured Output 스키마와 `parser-contract` union의 드리프트 가드(런타임 허용목록 ↔ 스키마 동기).
- 디자인: 모듈별 정직한 hue가 블랙 위 AA 대비를 다 통과하는지 측정(특히 그린/틸).
- 공개 남용(스팸 생성)·비용 폭주 가드(레이트리밋) — Phase 6.

## 14. 재사용 vs 신규 한눈에

| 살림 (그대로) | 교체 | 신규 |
|---|---|---|
| 시그널체인 렌더러·`types.ts`·변주탭·검증로직·request-form 인프라·`parser-contract`·GP-150 모델 md·`tone-builder` 프롬프트 자산 | 빌드타임 md파서→DB조회 · 정적export→동적 · CSS Modules→Tailwind/shadcn · 색토큰 재정의 | n8n 생성 워크플로우 · Supabase 스키마 · 생성폼/진행UI · 👍👎 · 동적 카탈로그 쿼리 · 디자인 토큰 시스템 |
