// WCAG 상대명도·대비비 계산 (순수). data-contract-ui.md §1 의 ui-1.1/cross-5.1 측정 근거.
// 토큰 색 4~7개 대상이라 라이브러리 없이 WCAG 공식 직접 구현(YAGNI).

const WHITE = "#ffffff";
const BLACK = "#000000";

function normalizeHex(hex: string): string {
  const h = hex.replace("#", "").trim();
  if (h.length === 3) {
    return h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  return h.slice(0, 6);
}

function toLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG 상대 명도 (0=검정 … 1=흰색). */
export function relativeLuminance(hex: string): number {
  const h = normalizeHex(hex);
  const r = toLinear(parseInt(h.slice(0, 2), 16));
  const g = toLinear(parseInt(h.slice(2, 4), 16));
  const b = toLinear(parseInt(h.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 대비비 (1:1 … 21:1). 순서 무관. */
export function contrastRatio(hexA: string, hexB: string): number {
  const la = relativeLuminance(hexA);
  const lb = relativeLuminance(hexB);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** 배경 위에 올릴 텍스트색을 흰/검 중 대비가 높은 쪽으로 자동 선택. */
export function pickTextColor(bgHex: string): typeof WHITE | typeof BLACK {
  return contrastRatio(WHITE, bgHex) >= contrastRatio(BLACK, bgHex)
    ? WHITE
    : BLACK;
}
