import { describe, expect, test } from "vitest";
import { songSlug } from "../slugify";

describe("songSlug", () => {
  test("영문 곡 — 어포스트로피 제거·공백 하이픈", () => {
    expect(songSlug("Oasis", "Don't Look Back in Anger")).toBe(
      "oasis-dont-look-back-in-anger",
    );
  });

  test("양끝 공백·중복 구분자 정리", () => {
    expect(songSlug("  Muse ", " Time Is Running Out ")).toBe(
      "muse-time-is-running-out",
    );
  });

  test("한글 보존(하이픈 결합)", () => {
    expect(songSlug("한로로", "사랑하게 될 거야")).toBe("한로로-사랑하게-될-거야");
  });

  test("괄호·특수문자 → 하이픈", () => {
    expect(songSlug("Vaundy (バウンディ)", "踊り子")).toContain("vaundy");
    // 결정적: 같은 입력 → 같은 출력
    expect(songSlug("Queen", "I Want to Break Free")).toBe(
      "queen-i-want-to-break-free",
    );
  });

  test("곱슬 어포스트로피도 동일 처리", () => {
    expect(songSlug("Oasis", "Don’t Look Back")).toBe("oasis-dont-look-back");
  });

  test("NFD 분해형 입력도 NFC 로 정규화(URL param 불일치=404 방지)", () => {
    const nfd = "만찬가".normalize("NFD"); // 분해형 자모
    expect(songSlug("tuki", nfd)).toBe("tuki-만찬가");
    expect(songSlug("tuki", nfd)).toBe(songSlug("tuki", "만찬가"));
  });
});
