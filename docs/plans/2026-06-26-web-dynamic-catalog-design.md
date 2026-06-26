---
title: 웹 동적 카탈로그 + 생성 폼 — Phase 2~3 설계
date: 2026-06-26
status: 구현 중
topic: web-dynamic-catalog
---

# 웹 동적 카탈로그 + 생성 폼 (Phase 2~3)

피벗 설계(`2026-06-25-tone-generator-pivot-design.md`)의 Phase 2(씨앗 임포트)+Phase 3(웹 데이터레이어)를 구현한다.
사용자 요구 3화면: **① 첫 화면 = 아티스트+곡 입력 + Gen 버튼 / ② Gen 결과 톤 정보 / ③ 톤 리스트 페이지.**

## 0. 확정 결정 (2026-06-26)

| # | 분기 | 결정 |
|---|------|------|
| 1 | 생성 흐름 | **비동기 + 폴링** — 폼→`/api/generate`(job insert + n8n ack 발사)→클라가 `/api/jobs/[id]` 폴링→ready면 상세로. (Realtime은 후속 업그레이드) |
| 2 | 리스트 내용 | **기존 8곡 md 씨앗 1회 임포트** + 생성분 누적. 엔진검증 테스트 행은 정리 완료. |
| 3 | 디자인 | **기존 CSS-module 렌더러 스킨 재사용**, 신규 표면(폼·진행·리스트)은 같은 톤으로 최소 구현. §8 Tailwind/shadcn 재디자인은 Phase 5로 분리. |

## 1. 실DB 스키마 (그라운드 트루스, 2026-06-26 introspect)

- `songs(id uuid, artist, title, artist_norm, title_norm, created_at)` — UNIQUE(artist_norm,title_norm). **slug·rig 컬럼 없음.**
- `patches(id uuid, song_id→songs, processor_slug→processors, version int, variations jsonb, confidence, genre, model_used, status, created_at)`
- `generation_jobs(id uuid, artist, title, processor_slug, song_id, patch_id, status, error, created_at)`
- `processors(slug, name, value_scale=10)` · `ratings(id, patch_id, value, voter_hash, created_at)`
- RLS: **anon 읽기 통과 확인**(patches). 쓰기는 service_role/n8n. generation_jobs는 서버(서비스키) 경유로만 접근.
- RPC: `save_generated_patch(p_artist,p_title,p_processor,p_variations,p_confidence,p_genre,p_model_used)` → songs+patches 행 생성(version 누적), status `ready`.

## 2. 정규 `variations` JSONB shape = n8n 출력 (권위)

DB에 저장되는 shape는 **n8n LLM 출력 그대로**(렌더러 타입과 다름):
- 변주: `{ label, signal_chain[], guitar?, switching? }` — **`signal_chain`(snake)**, switching은 `{A: "설명문자열"}`(단순), guitar는 `{selector,volume,tone,coilSplit,note}`(**selectorLabel 없음**).
- block/knob 모양은 `docs/parser-contract.md`와 동일(type·category·model·base_gear·enabled·footswitch·knobs[{name,value,unit}]).

## 3. 어댑터 (DB 행 → 렌더러 `Song`)  ← 핵심 재사용 다리

`web/lib/data/adapt.ts`: patches+songs 행을 `web/lib/types.ts`의 `Song`으로 변환(렌더러 무변경 재사용).
- `signal_chain` → `signalChain` (camel)
- `switching {A:"문자열"}` → `{A:{description:"문자열", blockModels: 그 변주에서 footswitch===key 인 block.model[]}}` (런타임 파생)
- `guitar.selector`(숫자) → `selectorLabel` 런타임 파생: **G250 5-way 맵 상수**(`web/lib/guitars/g250.ts`, models/guitars/cort-g250.md에서 1회 추출). Vercel은 ../models 못 읽으므로 상수로 박는다.
- `rig` = 'g250-gp150'(processor gp150 → 기본 rig 파생), `slug` = `slugify(artist)-slugify(title)`(기존 `lib/parser/slug.ts` 재사용)
- `genre`/`confidence`는 patch 컬럼에서.

## 4. 라우팅 & 데이터 접근

- `/` — **생성 폼**(아티스트·곡 입력 + Gen) 히어로 + 최근 톤 미리보기 + `/tones` 링크.
- `/tones` — **리스트**(기존 `SongIndex` 재사용, Supabase 조회). 검색/필터는 `lib/songFilter.ts` 그대로.
- `/songs/[slug]` — **상세**(기존 `SongDetail` 재사용). slug→song 해석은 songs 조회 후 slugify 매칭(소규모, 후일 slug 컬럼/페이지네이션).
- 데이터 접근 = `web/lib/supabase/rest.ts`(얇은 fetch 래퍼, PostgREST). 읽기=anon 키(서버/클라), 쓰기=service 키(서버 라우트 전용). **@supabase/supabase-js 미도입**(폴링이라 불필요·번들 절감; Realtime 도입 시 추가).
- `next.config.ts`의 `output: "export"` 제거 → Vercel 동적(서버 컴포넌트 + 라우트 핸들러). Vercel env에 SUPABASE URL/키 설정.

## 5. 생성 흐름 (비동기 + 폴링)

```
[/ 폼 submit] → POST /api/generate {artist, song}
   서버: 정규화 → 캐시 체크(songs+patches 존재?) → 히트면 {status:'ready', slug} 즉시
        미스면 generation_jobs insert(pending) → n8n webhook 발사(ack) → {jobId}
[클라] jobId 받으면 /api/jobs/[id] 2~3초 폴링 + "리서치/생성 중…" 진행표시
   서버 /api/jobs/[id]: 서비스키로 job 조회 → status·(ready면 song_id→slug) 반환
[ready] → /songs/[slug] 이동(렌더러로 그림). [failed] → 에러 + 재시도 버튼
```

### n8n 변경 (이 흐름 위해)
1. Webhook `responseMode` → **즉시 ack**(onReceived) — 발사 호출이 ~1초에 반환.
2. 입력에 `job_id` 추가 수신. 끝에서 generation_jobs 갱신: Save 성공→`status=ready, patch_id`; 검증 3회 실패→`status=failed, error`.
3. 기존 동기 Respond 노드는 ack로 대체/정리.

## 6. 파일 계획 (web/)

- `lib/supabase/rest.ts` — fetch 래퍼(anon/service)
- `lib/guitars/g250.ts` — G250 5-way 맵 상수(selectorLabel 파생용)
- `lib/data/adapt.ts` — DB 행 → `Song` 어댑터 (+ 단위테스트)
- `lib/data/catalog.ts` — `listSongs()`, `getSongBySlug()`, `getRecent()` (REST 조회)
- `lib/generate.ts` — 정규화(artist_norm/title_norm; n8n과 동일 규칙) + 캐시키
- `app/api/generate/route.ts` · `app/api/jobs/[id]/route.ts` — 라우트 핸들러
- `app/page.tsx` — 생성 폼 히어로로 교체(+ GenerateForm 클라 컴포넌트 + 진행 폴링)
- `app/tones/page.tsx` — 리스트(SongIndex 재사용)
- `app/songs/[slug]/page.tsx` — 상세(SongDetail 재사용); 구 `[rig]/[song]` 제거
- `components/generate/GenerateForm.tsx` · `GenProgress.tsx` — 신규 폼·진행 UI(아일랜드)
- `scripts/seed-supabase.ts` — patches.generated.ts → save_generated_patch 1회 임포트(시드)
- `next.config.ts` — output:export 제거
- `scripts/gen-patches.ts` — 임포트 후 유지(테스트/시드 소스). build에서 gen:patches 분리.

## 7. 빌드 순서

1. 데이터 토대: rest.ts · g250.ts · adapt.ts(+test) · catalog.ts · generate.ts(정규화)
2. 씨앗 임포트: seed-supabase.ts 작성·실행(8곡 적재) → REST로 검증
3. 리스트 `/tones` (SongIndex 재사용, 조회)
4. 상세 `/songs/[slug]` (SongDetail 재사용)
5. next.config output:export 제거 + 동적 렌더 확인(Next 16 문서 선독)
6. 생성 폼 `/` + /api/generate + /api/jobs + 폴링 UI
7. n8n 비동기 전환(ack + job 갱신)
8. 게이트: lint + typecheck(tsgo) + vitest + tsc 풀, 커밋 직전.

## 8. 미해결/리스크

- slug 충돌(동명 곡 다른 아티스트는 artist 포함이라 OK; 동일 곡 재생성은 version 누적·최신 노출).
- selectorLabel 런타임 파생 vs n8n 포함: 일단 런타임(G250 상수). 멀티기타 시 재검토.
- 정규화 규칙(artist_norm/title_norm)을 n8n과 **동일하게** 맞춰야 캐시 정확(현재 DB는 소문자+원문, 예: "don't look back in anger"). adapt/generate에서 동일 규칙 구현.
- Vercel 함수 타임아웃: 비동기라 회피. n8n ack 전환 전까지 동기 호출 금지.
- 무가드 공개 생성(레이트리밋/허니팟 = Phase 6).
