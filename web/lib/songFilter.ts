// song-index 의 단일 출처 모듈 — 두 부분으로 구성:
//  (1) 순수 필터 로직 parseFilters/matchesRow — 입력은 문자열뿐, DOM/빌드 상수 무관, 전수 테스트 가능.
//  (2) 서버 정적 요소 ↔ 아일랜드(getElementById) 연결용 DOM id 상수 — 통합 계약(드리프트 방지, #2 교훈).
// docs/trd/song-index.md "songFilter 계약". 아일랜드(SongFilterClient)가 (1)을 거쳐 (2)의 행을 토글한다.

// (2) DOM id 계약 — SongIndex(정적 렌더)와 SongFilterClient(getElementById)가 공유.
export const SONG_LIST_ID = "song-list";
export const SONG_COUNT_ID = "song-count";
export const SONG_EMPTY_ID = "song-empty";
/** 검색 input id — request-form dialog 가 프리필 소스(라이브 값)로 읽는다(크로스 피처 계약). */
export const SONG_SEARCH_ID = "song-search";

export interface Filters {
  /** 검색어 — 소문자·trim 됨. 빈값이면 검색 필터 무시. */
  q: string;
  /** rig slug. 빈값이면 전체. */
  rig: string;
}

export interface RowData {
  /** 검색 대상 — `artist title genre` 를 소문자로 미리 구운 문자열. */
  search: string;
  rig: string;
}

/** URL `?q/?rig` 를 정규화된 필터로. q 는 소문자, rig 는 slug(대소문자 보존). */
export function parseFilters(sp: URLSearchParams): Filters {
  return {
    q: (sp.get("q") ?? "").trim().toLowerCase(),
    rig: (sp.get("rig") ?? "").trim(),
  };
}

/** 행이 필터를 통과하는가 — q 부분문자열 AND rig 일치(빈 필터는 무시). */
export function matchesRow(row: RowData, f: Filters): boolean {
  const okQ = f.q === "" || row.search.includes(f.q);
  const okRig = f.rig === "" || row.rig === f.rig;
  return okQ && okRig;
}
