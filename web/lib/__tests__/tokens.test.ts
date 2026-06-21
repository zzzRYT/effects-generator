import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { relativeLuminance, contrastRatio, pickTextColor } from "../contrast";
import { ACCENT_HEX, type TokenGroup } from "../blockType";

// lib/tokens.css 의 확정 색이 data-contract-ui.md §1 불변 제약을 통과하는지 자동 검사.
// (눈대중 금지 — ui-1.1 / cross-5.1 을 코드로 못박는다.)
const css = readFileSync(resolve(process.cwd(), "lib/tokens.css"), "utf8");

function token(name: string): string {
  const m = css.match(new RegExp(`${name}\\s*:\\s*(#[0-9a-fA-F]{3,8})`));
  if (!m) throw new Error(`토큰 ${name} 을 tokens.css 에서 찾지 못함`);
  return m[1];
}

const ACCENTS = [
  "--color-od",
  "--color-amp",
  "--color-cab",
  "--color-dly",
  "--color-rvb",
  "--color-mod",
  "--color-util",
] as const;

describe("tokens.css — 악센트 vs 배경 명도차 (ui-1.1)", () => {
  it("모든 타입 악센트는 패널 배경과 명도차 ≥ 0.20", () => {
    const panelLum = relativeLuminance(token("--panel"));
    for (const name of ACCENTS) {
      const diff = Math.abs(relativeLuminance(token(name)) - panelLum);
      expect(diff, `${name} 명도차`).toBeGreaterThanOrEqual(0.2);
    }
  });
});

describe("tokens.css — 배지 텍스트 대비 (ui-1.1, cross-5.1)", () => {
  it("악센트 배경 위 자동선택 텍스트 대비 ≥ 4.5:1", () => {
    for (const name of ACCENTS) {
      const bg = token(name);
      const ratio = contrastRatio(pickTextColor(bg), bg);
      expect(ratio, `${name} 배지 대비`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("blockType.ACCENT_HEX — tokens.css 드리프트 가드", () => {
  it("ACCENT_HEX 각 값이 tokens.css 의 --color-* 와 일치", () => {
    const groups: TokenGroup[] = [
      "od",
      "amp",
      "cab",
      "dly",
      "rvb",
      "mod",
      "util",
    ];
    for (const g of groups) {
      expect(ACCENT_HEX[g].toLowerCase(), `--color-${g}`).toBe(
        token(`--color-${g}`).toLowerCase(),
      );
    }
  });
});

describe("tokens.css — 본문/LCD 텍스트 대비 (cross-5.1)", () => {
  it("--text 는 패널 대비 ≥ 4.5:1", () => {
    expect(
      contrastRatio(token("--text"), token("--panel")),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("--text-muted 는 패널 대비 ≥ 4.5:1", () => {
    expect(
      contrastRatio(token("--text-muted"), token("--panel")),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("--lcd-text 는 LCD 배경 대비 ≥ 4.5:1", () => {
    expect(
      contrastRatio(token("--lcd-text"), token("--lcd")),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("--text-muted 는 LCD 배경 대비 ≥ 4.5:1 (knobName 이 LCD 위에 렌더)", () => {
    expect(
      contrastRatio(token("--text-muted"), token("--lcd")),
    ).toBeGreaterThanOrEqual(4.5);
  });
});
