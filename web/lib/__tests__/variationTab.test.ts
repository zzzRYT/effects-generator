import { describe, it, expect } from "vitest";
import { resolveActiveIndex } from "../variationTab";

// ?v=N (1-based) → 0-based 활성 인덱스. 무효 입력은 항상 첫 변주(0)로 폴백(crash 0).
// PRD AC4 / docs/trd/variation-compare.md "resolveActiveIndex 계약"의 권위 테스트.
describe("resolveActiveIndex — 정상 1-based 매핑", () => {
  it('"1" → 0 (첫 변주)', () => {
    expect(resolveActiveIndex("1", 3)).toBe(0);
  });
  it('"2" → 1', () => {
    expect(resolveActiveIndex("2", 3)).toBe(1);
  });
  it('"3" → 2 (마지막, count=3)', () => {
    expect(resolveActiveIndex("3", 3)).toBe(2);
  });
});

describe("resolveActiveIndex — 무효/없음 → 0 폴백", () => {
  it("null(파라미터 없음) → 0", () => {
    expect(resolveActiveIndex(null, 3)).toBe(0);
  });
  it('빈 문자열 "" → 0', () => {
    expect(resolveActiveIndex("", 3)).toBe(0);
  });
  it('비숫자 "abc" → 0', () => {
    expect(resolveActiveIndex("abc", 3)).toBe(0);
  });
  it('"0"(범위밖, 1-based 하한 미만) → 0', () => {
    expect(resolveActiveIndex("0", 3)).toBe(0);
  });
  it('"-1"(음수) → 0', () => {
    expect(resolveActiveIndex("-1", 3)).toBe(0);
  });
  it('"99"(count 초과) → 0', () => {
    expect(resolveActiveIndex("99", 3)).toBe(0);
  });
  it('"4" == count+1 (경계 밖) → 0', () => {
    expect(resolveActiveIndex("4", 3)).toBe(0);
  });
});

describe("resolveActiveIndex — parseInt 부분 파싱", () => {
  it('"1.5" → parseInt 1 → 0', () => {
    expect(resolveActiveIndex("1.5", 3)).toBe(0);
  });
  it('"2x" → parseInt 2 → 1', () => {
    expect(resolveActiveIndex("2x", 3)).toBe(1);
  });
  it("공백 패딩 \" 2 \" → 1", () => {
    expect(resolveActiveIndex(" 2 ", 3)).toBe(1);
  });
});

describe("resolveActiveIndex — count 엣지", () => {
  it("count=1 + \"1\" → 0", () => {
    expect(resolveActiveIndex("1", 1)).toBe(0);
  });
  it('count=1 + "2"(초과) → 0', () => {
    expect(resolveActiveIndex("2", 1)).toBe(0);
  });
  it("count=0(방어) → 0", () => {
    expect(resolveActiveIndex("1", 0)).toBe(0);
  });
});
