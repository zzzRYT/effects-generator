import { describe, it, expect } from "vitest";
import { blockTypeToken } from "../blockType";
import type { BlockType } from "../types";

// docs/data-contract-ui.md §1 타입→토큰 그룹 매핑(단일 출처).
describe("blockTypeToken — 드라이브 계열은 od 그룹", () => {
  it.each(["OD", "BOOST", "DST", "FUZZ"] as BlockType[])(
    "%s → od",
    (type) => {
      const t = blockTypeToken(type);
      expect(t.group).toBe("od");
      expect(t.cssVar).toBe("--color-od");
    },
  );
});

describe("blockTypeToken — 단일 타입 그룹", () => {
  it.each([
    ["AMP", "amp"],
    ["CAB", "cab"],
    ["DLY", "dly"],
    ["RVB", "rvb"],
  ] as [BlockType, string][])("%s → %s", (type, group) => {
    expect(blockTypeToken(type).group).toBe(group);
  });
});

describe("blockTypeToken — 모듈레이션 계열은 mod 그룹", () => {
  it.each(["MOD", "FILTER", "WAH", "PITCH"] as BlockType[])(
    "%s → mod",
    (type) => {
      expect(blockTypeToken(type).group).toBe("mod");
    },
  );
});

describe("blockTypeToken — 유틸 계열은 util 그룹", () => {
  it.each(["NR", "COMP", "EQ", "VOL"] as BlockType[])("%s → util", (type) => {
    expect(blockTypeToken(type).group).toBe("util");
  });
});

describe("blockTypeToken — 약어와 폴백", () => {
  it("약어는 타입 문자열 그대로 (색만으로 의미 전달 금지 — edge-3.11)", () => {
    expect(blockTypeToken("AMP").abbr).toBe("AMP");
    expect(blockTypeToken("DLY").abbr).toBe("DLY");
  });

  it("알 수 없는 타입은 util 폴백 + 원본 약어 유지 (crash 0)", () => {
    const t = blockTypeToken("XYZ" as BlockType);
    expect(t.group).toBe("util");
    expect(t.cssVar).toBe("--color-util");
    expect(t.abbr).toBe("XYZ");
  });

  it("모든 그룹 cssVar는 --color- 접두", () => {
    for (const type of ["OD", "AMP", "CAB", "DLY", "RVB", "MOD", "NR"]) {
      expect(blockTypeToken(type as BlockType).cssVar).toMatch(/^--color-/);
    }
  });
});
