// 변주 탭 활성 인덱스 해석 — `?v=N`(1-based) → 0-based. 순수 함수.
// 무효/없음/범위밖은 항상 첫 변주(0)로 폴백한다(crash 0). docs/trd/variation-compare.md 계약.

/**
 * `?v` 쿼리 값을 활성 변주 인덱스(0-based)로 변환한다.
 * URL 은 사람이 보는 1-based(`?v=1`=첫 변주), 코드 내부는 0-based. 이 함수가 유일한 변환점.
 * @param param URLSearchParams.get("v") 결과 — 문자열 또는 null
 * @param count 변주 개수
 * @returns 0 이상 count 미만의 활성 인덱스. 무효 입력은 0.
 */
export function resolveActiveIndex(param: string | null, count: number): number {
  const n = Number.parseInt(param ?? "", 10);
  if (Number.isNaN(n)) return 0;
  const index = n - 1; // 1-based(URL) → 0-based(내부)
  if (index < 0 || index >= count) return 0;
  return index;
}

// 탭/패널 DOM id 의 단일 출처. VariationTabs(생성)·VariationPanel(생성)·ARIA 연결
// (aria-controls↔id, aria-labelledby↔id)이 전부 이걸 거쳐 드리프트를 막는다.
export const tabId = (index: number): string => `vtab-${index}`;
export const panelId = (index: number): string => `vpanel-${index}`;
