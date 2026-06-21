import { describe, it, expect } from "vitest";
import { parseFilters, matchesRow } from "../songFilter";

// 곡 목록 필터의 순수 로직 권위 테스트. docs/trd/song-index.md "songFilter 계약".

describe("parseFilters — ?q/?rig 정규화", () => {
  it("없으면 빈 문자열(=전체)", () => {
    expect(parseFilters(new URLSearchParams(""))).toEqual({ q: "", rig: "" });
  });
  it("q 는 trim + 소문자", () => {
    expect(parseFilters(new URLSearchParams("q=  Oasis  "))).toEqual({
      q: "oasis",
      rig: "",
    });
  });
  it("rig 는 trim(대소문자 보존 — slug 매칭용)", () => {
    expect(parseFilters(new URLSearchParams("rig= g250-gp150 "))).toEqual({
      q: "",
      rig: "g250-gp150",
    });
  });
  it("q + rig 동시", () => {
    expect(parseFilters(new URLSearchParams("q=muse&rig=g250-gp150"))).toEqual({
      q: "muse",
      rig: "g250-gp150",
    });
  });
  it("공백만 있는 q 는 trim 되어 빈값(=전체)", () => {
    expect(parseFilters(new URLSearchParams("q=%20%20%20"))).toEqual({
      q: "",
      rig: "",
    });
  });
});

describe("matchesRow — q 부분문자열 AND rig", () => {
  const row = { search: "oasis don't look back in anger 브릿팝", rig: "g250-gp150" };

  it("필터 둘 다 비면 항상 매칭(전체)", () => {
    expect(matchesRow(row, { q: "", rig: "" })).toBe(true);
  });
  it("q 가 search 부분문자열이면 매칭", () => {
    expect(matchesRow(row, { q: "oasis", rig: "" })).toBe(true);
    expect(matchesRow(row, { q: "anger", rig: "" })).toBe(true);
  });
  it("q 가 genre 키워드여도 매칭(genre 는 search 에 포함)", () => {
    expect(matchesRow(row, { q: "브릿팝", rig: "" })).toBe(true);
  });
  it("q 가 search 에 없으면 불매칭", () => {
    expect(matchesRow(row, { q: "muse", rig: "" })).toBe(false);
  });
  it("rig 일치하면 매칭, 다르면 불매칭", () => {
    expect(matchesRow(row, { q: "", rig: "g250-gp150" })).toBe(true);
    expect(matchesRow(row, { q: "", rig: "xt-450-gp150" })).toBe(false);
  });
  it("q AND rig — 둘 다 충족해야 매칭", () => {
    expect(matchesRow(row, { q: "oasis", rig: "g250-gp150" })).toBe(true);
    expect(matchesRow(row, { q: "oasis", rig: "xt-450-gp150" })).toBe(false);
    expect(matchesRow(row, { q: "muse", rig: "g250-gp150" })).toBe(false);
  });
  it("특수문자 검색도 부분문자열로 안전", () => {
    expect(matchesRow(row, { q: "don't", rig: "" })).toBe(true);
  });
});
