# 설계 — song-index (트랙2 사이클 #3)

**확정일:** 2026-06-21
**brainstorm:** `/superpowers:brainstorm song-index`
**선행:** #1 곡 상세(`/songs/[rig]/[song]`), #2 변주 탭. 현재 홈(`/`)은 #1 의 임시 정적 링크 목록.
**소비 계약:** `docs/data-contract-ui.md`, `docs/verification-rubric.md`(특히 edge-3.6 0결과).

곡 목록/검색 **진입점**. 임시 홈을 검색창 + rig/genre 필터 칩이 있는 정적 목록 + 클라이언트 필터로 교체.
100% 정적 — 런타임 서버 없음.

---

## 확정 결정 (brainstorm)

1. **검색/필터 = 검색창 1개 + rig/genre 필터 칩**. (단순 단일 검색창보다 칩 패싯 추가, 정렬은 미채택.)
2. **활성 상태 = URL** (`?q=&rig=&genre=`, 공유·북마크·뒤로가기). web "URL As State", #2 `?v=` 선례.
3. **필터 칩 = 카테고리당 단일 선택** (전체 또는 하나). 결합 = 검색어 AND rig AND genre. (다중선택 기각 — URL/로직 복잡, 소규모에 과함.)
4. **구현 = 점진적 향상**:
   - 100% 정적이라 런타임 쿼리 서버필터 불가 → **서버가 모든 곡 행을 정적 HTML 로** 렌더(SEO·no-JS).
   - **필터 컨트롤(검색창+칩)은 클라이언트 아일랜드**가 렌더, `<Suspense fallback={null}>` 격리.
   - **no-JS = 전체 목록만**(컨트롤 미렌더 — 작동 안 하는 검색창 숨김이 정직). 전부 브라우징 가능.
   - 아일랜드가 정적 리스트를 DOM 으로 필터(행 `hidden` 토글). **PATCHES 클라이언트 미전송**(73KB 번들 회피) — 행 `data-*` 만 읽어 매칭.

> **#2 와의 차이**: #2 는 *패널*이 정적이어야 해 아일랜드가 `null` 렌더였다. #3 은 *리스트*가 정적이어야
> 하고 *컨트롤*은 동적이라, 아일랜드가 컨트롤을 렌더하고 정적 리스트를 DOM 으로 필터한다. 리스트는
> Suspense 밖 → SSG 유지.

---

## 섹션 1 — 아키텍처 & no-JS 모델

```
app/page.tsx                      # (수정) 서버: PATCHES → rigs·genres 유니크 추출 → <SongIndex>
components/song-index/
  SongIndex.tsx                   # 서버: 헤더 + 정적 <ul>(모든 행) + 빈상태(숨김) + Suspense(아일랜드)
  SongRow.tsx                     # 행 1개: data-search/rig/genre/key + 기존 .songLink 스타일
  SongFilterClient.tsx ('use client')  # 검색창 + rig/genre 칩. useSearchParams → 행 필터·URL·count
  song-index.module.css
lib/
  songFilter.ts                   # 순수 함수 (단일 출처)
```

- 서버 렌더: 모든 `<li data-search="artist title genre(소문자)" data-rig data-genre data-key>` + 링크.
- 아일랜드: `parseFilters(useSearchParams)` → 각 행 `matchesRow(행.dataset, filters)` → `hidden` 토글 →
  보이는 수 세어 count(`aria-live`) + 0이면 빈상태 표시. 입력/칩 변경 → `router.replace(?…, {scroll:false})`.
- rig/genre 옵션은 서버가 PATCHES 에서 유니크 추출해 아일랜드 props 로(작은 string[]).
- 무플래시: #2 의 `html.js` 인라인 스크립트 재사용 가능하나, 여기선 리스트가 기본 전부 visible 이라
  필터는 JS 후 적용(초기 전체표시→필터는 자연스러운 향상). 별도 무플래시 불필요.

## 섹션 2 — 컴포넌트 & 필터 로직 & 엣지케이스

**순수 함수(`lib/songFilter.ts`, 전수 테스트)**:
- `parseFilters(sp): {q, rig, genre}` — `?q/rig/genre` 정규화(소문자·trim, 없으면 빈값=전체).
- `matchesRow(row: {search,rig,genre}, f: {q,rig,genre}): boolean` — `q` 부분문자열 AND `rig`(빈값이면 무시) AND `genre`(빈값이면 무시).

**엣지케이스**:
- **0 결과**(edge-3.6): "검색 결과 없음" + **필터 초기화** 링크(`/`). 서버 숨김, 아일랜드가 0일 때 표시.
- **결과 수 라이브**: `aria-live="polite"` "N곡"(SR status message).
- **활성 칩**: `<button aria-pressed>` + 시각 강조(색만 아님). 단일선택 → 카테고리 내 하나만 active.
- **검색 입력**: `router.replace`(히스토리 누적 0). 소규모라 디바운스 불필요(즉시 필터).
- 긴 곡명·특수문자 검색·0곡 graceful. 칩은 `<button>`(no-JS 엔 아일랜드 미렌더라 부재).

## 섹션 3 — 테스트 & 검증

**유닛(Vitest)**: `songFilter.test`(parseFilters·matchesRow 전수) + `SongIndex.test`(모든 행 정적 렌더·
data-*·rigs/genres 추출·칩 렌더(next/navigation mock)·칩 클릭→`?rig=`·검색→`?q=`·0결과 빈상태·count).

**E2E(Playwright, 320/768/1024/1440)**: 검색→행 필터+`?q=`, 칩→rig/genre 필터+`aria-pressed`, 검색+칩 AND,
딥링크 `?q=&rig=`, **0결과 메시지+초기화**(edge-3.6), **no-JS 전체목록**, 키보드·axe·reduced-motion·
모바일 오버플로0·터치≥44px, 라이브 카운트. 스냅샷(목록/필터/빈상태). 기존 홈 e2e 갱신.

**QA = 루브릭**: edge-3.6(0결과 필수), cross-5.1/5.2/5.3, edge-3.1 반응형. ui 기준 대부분은 곡상세(#1·#2)라
이 사이클은 진입/엣지/교차품질 중심.

## 산출물
이 설계 / PRD(`docs/prd/song-index.md`) / TRD(`docs/trd/song-index.md`) / 복기(`docs/reviews/song-index.md`).

## 미해결(이월)
- cross-5.5/5.7(LCP/CLS) Lighthouse 미측정(정적이라 위험 낮음).
- hanroro switching.B 경고 2건(설명만, 데이터 이슈).
