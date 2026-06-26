import { describe, expect, test } from "vitest";
import { GEN_MAX, validateGenerate } from "../validate";

describe("validateGenerate", () => {
  test("빈 입력 → 둘 다 에러", () => {
    const e = validateGenerate({ artist: "", song: "" });
    expect(e.artist).toBeTruthy();
    expect(e.song).toBeTruthy();
  });

  test("공백만 → 에러(trim)", () => {
    const e = validateGenerate({ artist: "   ", song: "  " });
    expect(e.artist).toBeTruthy();
    expect(e.song).toBeTruthy();
  });

  test("길이 초과 → 에러", () => {
    const e = validateGenerate({
      artist: "a".repeat(GEN_MAX.artist + 1),
      song: "Yellow",
    });
    expect(e.artist).toBeTruthy();
    expect(e.song).toBeUndefined();
  });

  test("유효 입력 → 에러 없음", () => {
    expect(validateGenerate({ artist: "Coldplay", song: "Yellow" })).toEqual({});
  });
});
