import { describe, it, expect } from "vitest";
import { blockTypeToken, categoryLabel } from "../blockType";
import {
  ALLOWED_TYPES,
  ALLOWED_CATEGORIES,
  TYPE_CATEGORIES,
} from "../parser/validate";
import type { BlockType, BlockCategory } from "../types";

// docs/data-contract-ui.md §1 — type(모듈)·category → 토큰 그룹 매핑(단일 출처).
// 해석 순서: category 우선 → 없으면 type → util 폴백.

describe("blockTypeToken — category 가 드라이브/게인 계열이면 od 그룹", () => {
  it.each([
    ["DST", "OD"],
    ["DST", "DST"],
    ["DST", "FUZZ"],
    ["PRE", "BOOST"],
  ] as [BlockType, BlockCategory][])("%s/%s → od", (type, category) => {
    const t = blockTypeToken(type, category);
    expect(t.group).toBe("od");
    expect(t.cssVar).toBe("--color-od");
  });
});

describe("blockTypeToken — category 가 필터/피치면 mod, 컴프면 util", () => {
  it("PRE/FILTER → mod", () => {
    expect(blockTypeToken("PRE", "FILTER").group).toBe("mod");
  });
  it("PRE/PITCH → mod", () => {
    expect(blockTypeToken("PRE", "PITCH").group).toBe("mod");
  });
  it("PRE/COMP → util", () => {
    expect(blockTypeToken("PRE", "COMP").group).toBe("util");
  });
});

describe("blockTypeToken — category 없는 단일 모듈은 type 으로 결정", () => {
  it.each([
    ["AMP", "amp"],
    ["CAB", "cab"],
    ["NS", "cab"],
    ["DLY", "dly"],
    ["RVB", "rvb"],
    ["MOD", "mod"],
    ["WAH", "mod"],
    ["DST", "od"], // category 없는 맨 디스토션 모듈
    ["NR", "util"],
    ["PRE", "util"], // category 없는 PRE 폴백
    ["EQ", "util"],
    ["VOL", "util"],
  ] as [BlockType, string][])("%s → %s", (type, group) => {
    expect(blockTypeToken(type).group).toBe(group);
  });
});

describe("blockTypeToken — 약어(모듈)와 폴백", () => {
  it("약어는 type(모듈) 문자열 그대로 — category 와 무관 (edge-3.11)", () => {
    expect(blockTypeToken("AMP").abbr).toBe("AMP");
    expect(blockTypeToken("DST", "OD").abbr).toBe("DST");
    expect(blockTypeToken("PRE", "BOOST").abbr).toBe("PRE");
  });

  it("알 수 없는 type 은 util 폴백 + 원본 약어 유지 (crash 0)", () => {
    const t = blockTypeToken("XYZ" as BlockType);
    expect(t.group).toBe("util");
    expect(t.cssVar).toBe("--color-util");
    expect(t.abbr).toBe("XYZ");
  });

  it("알 수 없는 category 는 무시하고 type 으로 폴백", () => {
    const t = blockTypeToken("DLY", "ZZZ" as BlockCategory);
    expect(t.group).toBe("dly");
  });

  it("모든 그룹 cssVar 는 --color- 접두", () => {
    for (const type of ["DST", "AMP", "CAB", "DLY", "RVB", "MOD", "NR"]) {
      expect(blockTypeToken(type as BlockType).cssVar).toMatch(/^--color-/);
    }
  });
});

describe("드리프트 가드 — 런타임 허용목록 ↔ 타입 union 동기화", () => {
  // 컴파일타임 exhaustive 레지스트리: union 에 멤버를 추가하면 여기서 컴파일 에러 → 갱신 강제.
  // (런타임 Set 은 union 과 자동 연동되지 않으므로 이 가드로 못박는다.)
  const ALL_TYPES: Record<BlockType, true> = {
    NR: true, PRE: true, WAH: true, DST: true, NS: true, AMP: true,
    CAB: true, EQ: true, MOD: true, DLY: true, RVB: true, VOL: true,
  };
  const ALL_CATEGORIES: Record<BlockCategory, true> = {
    COMP: true, BOOST: true, FILTER: true, PITCH: true,
    OD: true, DST: true, FUZZ: true,
  };

  it("ALLOWED_TYPES === BlockType union (12 모듈)", () => {
    expect(ALLOWED_TYPES).toEqual(new Set(Object.keys(ALL_TYPES)));
  });

  it("ALLOWED_CATEGORIES === BlockCategory union (7 종류)", () => {
    expect(ALLOWED_CATEGORIES).toEqual(new Set(Object.keys(ALL_CATEGORIES)));
  });

  it("TYPE_CATEGORIES 키는 PRE/DST 뿐이고 ALLOWED_TYPES 안에 있다", () => {
    expect(new Set(Object.keys(TYPE_CATEGORIES))).toEqual(
      new Set(["PRE", "DST"]),
    );
    for (const t of Object.keys(TYPE_CATEGORIES)) {
      expect(ALLOWED_TYPES.has(t)).toBe(true);
    }
  });

  it("모든 category 는 한글 라벨이 있다 (폴백=원문 이 아님)", () => {
    for (const c of Object.keys(ALL_CATEGORIES) as BlockCategory[]) {
      expect(categoryLabel(c)).not.toBe(c);
    }
  });
});

describe("categoryLabel — 효과종류 한글 라벨", () => {
  it.each([
    ["OD", "오버드라이브"],
    ["DST", "디스토션"],
    ["FUZZ", "퍼즈"],
    ["BOOST", "부스트"],
    ["COMP", "컴프레서"],
    ["FILTER", "필터"],
    ["PITCH", "피치"],
  ] as [BlockCategory, string][])("%s → %s", (category, label) => {
    expect(categoryLabel(category)).toBe(label);
  });

  it("알 수 없는 category 는 원문 유지 (crash 0)", () => {
    expect(categoryLabel("ZZZ" as BlockCategory)).toBe("ZZZ");
  });
});
