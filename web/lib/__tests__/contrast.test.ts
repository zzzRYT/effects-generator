import { describe, it, expect } from "vitest";
import { relativeLuminance, contrastRatio, pickTextColor } from "../contrast";

// WCAG 상대명도/대비 — ui-1.1·cross-5.1 의 측정 근거 함수.
describe("relativeLuminance", () => {
  it("흰색은 1, 검정은 0", () => {
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 3);
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 3);
  });

  it("3자리 단축 hex도 처리", () => {
    expect(relativeLuminance("#fff")).toBeCloseTo(1, 3);
  });

  it("# 없는 입력도 처리", () => {
    expect(relativeLuminance("000000")).toBeCloseTo(0, 3);
  });
});

describe("contrastRatio", () => {
  it("흰/검 대비는 21:1", () => {
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 1);
  });

  it("순서에 무관(대칭)", () => {
    expect(contrastRatio("#fb923c", "#000000")).toBeCloseTo(
      contrastRatio("#000000", "#fb923c"),
      5,
    );
  });

  it("같은 색은 1:1", () => {
    expect(contrastRatio("#16161a", "#16161a")).toBeCloseTo(1, 3);
  });
});

describe("pickTextColor — 배지 텍스트색 자동 선택", () => {
  it("밝은 악센트 위에는 검정을 고른다", () => {
    expect(pickTextColor("#fb923c")).toBe("#000000");
    expect(pickTextColor("#22d3ee")).toBe("#000000");
  });

  it("어두운 배경 위에는 흰색을 고른다", () => {
    expect(pickTextColor("#16161a")).toBe("#ffffff");
  });

  it("고른 색은 배경 대비 ≥4.5:1", () => {
    for (const bg of ["#fb923c", "#60a5fa", "#a78bfa", "#22d3ee", "#f472b6"]) {
      expect(contrastRatio(pickTextColor(bg), bg)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
