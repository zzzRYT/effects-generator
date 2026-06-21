# TRD — song-index

- **Feature slug**: song-index
- **PRD**: docs/prd/song-index.md
- **설계**: docs/plans/2026-06-21-song-index-design.md

## 설계 요약
홈(`/`)을 정적 곡 목록 + 클라이언트 필터로 교체. 100% 정적이라 런타임 쿼리 서버필터가 불가능하므로
**점진적 향상**: 서버가 모든 곡 행을 정적 HTML 로 렌더(SEO·no-JS), 필터 컨트롤(검색창 + rig 칩)은
클라이언트 아일랜드가 `<Suspense>` 안에서 렌더, 아일랜드가 `?q/rig` 를 읽어 정적 리스트의 행을
`matchesRow()` 로 `hidden` 토글한다. no-JS = 컨트롤 미렌더(작동 안 하는 UI 숨김) + 전체 목록.

#2 와 대칭: #2 는 *패널*이 정적이라 아일랜드가 `null` 이었고, #3 은 *리스트*가 정적이라 아일랜드가
*컨트롤*을 렌더하고 정적 리스트를 DOM 으로 필터한다. 리스트는 Suspense 밖 → SSG 유지.
**PATCHES(73KB)는 클라이언트로 안 보낸다** — 행의 `data-*` 만 읽어 매칭, rig 옵션만 props 로 전달.

## 컴포넌트 구조
```
web/
  app/page.tsx                         # (수정) 서버: rigs 유니크 추출 → <SongIndex>
  components/song-index/
    SongIndex.tsx                      # 서버: 헤더 + 정적 <ul>(행 전부) + 빈상태(숨김) + Suspense(아일랜드)
    SongRow.tsx                        # 행 1개: <li data-*> + 곡상세 <Link>
    SongFilterClient.tsx ('use client') # 검색창 + rig 칩 + count. useSearchParams → 행 필터·URL 동기화
    song-index.module.css
  lib/
    songFilter.ts                      # parseFilters / matchesRow (순수)
```

## 파일 목록 (생성/수정)
| 파일 | 역할 |
|------|------|
| web/lib/songFilter.ts | `parseFilters(sp)`·`matchesRow(row,f)` 순수 함수(단일 출처) |
| web/components/song-index/SongIndex.tsx | 서버: 정적 목록 + 빈상태 + Suspense(아일랜드) |
| web/components/song-index/SongRow.tsx | 서버: 행 1개(data-search/rig/key + Link) |
| web/components/song-index/SongFilterClient.tsx | 'use client': 검색창+rig 칩, useSearchParams, 행 DOM 필터·count·빈상태·URL |
| web/components/song-index/song-index.module.css | 목록·필터바·칩·빈상태·반응형·reduced-motion |
| web/app/page.tsx | (수정) rigs 추출 → SongIndex. 기존 임시 링크 목록 대체 |
| web/lib/__tests__/songFilter.test.ts | parseFilters·matchesRow 전수 |
| web/components/__tests__/SongIndex.test.tsx | 구조+아일랜드 필터(jsdom, next/navigation mock) |
| web/e2e/song-index.spec.ts | 검색·칩·딥링크·0결과·no-JS·키보드·axe·모바일 |
| web/e2e/*-snapshots/* | 홈 스냅샷(목록/필터/빈상태) |

## 데이터 흐름 / 타입
- 입력: `PATCHES: readonly Song[]`(빌드 상수). 행 매칭 데이터는 `data-*` 문자열만 사용(PATCHES 클라이언트 미전송).
- 서버: `rigs = [...new Set(PATCHES.map(s=>s.rig))]` → SongFilterClient props. 각 SongRow 가
  `data-search={`${artist} ${title} ${genre ?? ""}`.toLowerCase()}`, `data-rig={rig}`, `data-key={rig/slug}`.
- 아일랜드: `parseFilters(useSearchParams())` → 각 행 `matchesRow({search,rig}, filters)` → `hidden` 토글.
- 출력: SSG HTML + 클라이언트 필터(URL 만 읽고 씀, 페치·편집 0). 새 타입 없음(types.ts 그대로).

## songFilter 계약 (순수)
```
parseFilters(sp: URLSearchParams): { q: string; rig: string }
  q   = (sp.get("q")   ?? "").trim().toLowerCase()
  rig = (sp.get("rig") ?? "").trim()            // 빈값 = 전체

matchesRow(row: { search: string; rig: string }, f: { q: string; rig: string }): boolean
  okQ   = f.q === "" || row.search.includes(f.q)     // search 는 소문자 미리 구움
  okRig = f.rig === "" || row.rig === f.rig
  return okQ && okRig
```

## 아일랜드(SongFilterClient) 동작
- props: `rigs: string[]`, `listId: string`, `emptyId: string`, `countId: string`(또는 ref 대신 id 스코프).
- `parseFilters(useSearchParams())` → `{q, rig}`. 검색창 `defaultValue=q`, rig 칩 `aria-pressed = (rig === chip || (chip==="" && rig===""))`.
- effect(deps[q, rig]): `getElementById(listId)` 행들 순회 → `matchesRow(행.dataset, {q,rig})` → `el.hidden` 토글 →
  보이는 수 합산 → countEl 텍스트 "N곡"(aria-live) → 0 이면 emptyEl 표시/리스트 숨김.
- 검색 입력 `onChange` → `router.replace(buildUrl(q,rig), {scroll:false})`. rig 칩 클릭 → 해당 rig(또는 "") 로 replace.
- `buildUrl`: 빈 파라미터는 생략(`/`, `/?q=oasis`, `/?rig=...&q=...`).

## 상태 / 엣지케이스
- **0 결과**(edge-3.6): "검색 결과 없음" + 초기화 링크(`/`). 서버 숨김, 아일랜드가 0 일 때 표시.
- **결과 수**: `aria-live="polite"` "N곡". 필터마다 갱신.
- rig 단일 선택: 같은 카테고리 하나만 `aria-pressed`. "전체" 칩 = rig 해제.
- no-JS: 컨트롤(검색창+칩) 미렌더(Suspense fallback null), 전체 목록 visible.
- 긴 곡명·특수문자·0곡 graceful. 검색 즉시 필터(디바운스 불필요, replace 라 히스토리 0).
- 행이 1개도 매칭 안 되면 count "0곡" + 빈상태. 검색어/ rig 둘 다 비면 전체.

## 수용 기준 ↔ 구현·테스트 매핑
| PRD 기준 | 구현 | 테스트 |
|----------|------|--------|
| AC1 정적 목록 | SongIndex/SongRow | SongIndex.test(행 렌더), build ○ Static |
| AC2 검색 필터 | matchesRow + 아일랜드 | songFilter.test, e2e 검색 |
| AC3 rig 칩 AND | matchesRow + 칩 | e2e rig 칩 + 검색 결합 |
| AC4 URL `?q=&rig=` 딥링크 | parseFilters + buildUrl | songFilter.test, e2e 딥링크 |
| AC5 0결과 | 빈상태 토글 | e2e edge-3.6 |
| AC6 aria-pressed 칩 | SongFilterClient | SongIndex.test, e2e |
| AC7 aria-live count | countEl | e2e |
| AC8 no-JS 전체 | 정적 리스트 + Suspense | e2e javaScriptEnabled:false |
| AC9 키보드·axe | 시맨틱 + focus | e2e axe·키보드 |
| AC10 반응형 | css | e2e 5 브레이크포인트 |
| AC11 정적 SSG | 리스트 Suspense 밖 | build ○ Static |

## 테스트 계획
- 유닛(Vitest, 80%+): songFilter(parseFilters 정규화·matchesRow 전수: q만/rig만/결합/전체/0매칭/부분문자열/특수문자),
  SongIndex(행 정적 렌더·data-*·rigs 추출·칩 렌더·칩 클릭→`?rig=`·검색→`?q=`·0결과 빈상태·count, next/navigation mock).
- 비주얼·E2E(Playwright 320/375/768/1024/1440): 검색·rig 칩·결합·딥링크·0결과+초기화·no-JS 전체·키보드·
  axe·reduced-motion·모바일 오버플로0·터치≥44px·라이브 카운트. 스냅샷(목록/필터된/빈상태). 기존 홈 e2e 갱신.

## 새 의존성 (있으면 근거)
- 없음. 부분문자열 매칭 + 단일 rig 비교는 작은 순수 함수로 충분 — 검색 라이브러리(Fuse 등)는 7~수십 곡에
  과하고 번들예산 위반(YAGNI).
