import { describe, expect, test } from "vitest";
import { GEN_MAX, validateGenerate } from "../validate";

describe("validateGenerate", () => {
  const validInput = { artist: "Coldplay", song: "Yellow", guitar: "Cort G250", processor: "GP-150" };

  test("빈 입력 → 둘 다 에러", () => {
    const e = validateGenerate({ artist: "", song: "", guitar: "", processor: "" });
    expect(e.artist).toBeTruthy();
    expect(e.song).toBeTruthy();
    expect(e.guitar).toBeTruthy();
    expect(e.processor).toBeTruthy();
  });

  test("공백만 → 에러(trim)", () => {
    const e = validateGenerate({ artist: "   ", song: "  ", guitar: "  ", processor: "  " });
    expect(e.artist).toBeTruthy();
    expect(e.song).toBeTruthy();
    expect(e.guitar).toBeTruthy();
    expect(e.processor).toBeTruthy();
  });

  test("길이 초과 → 에러", () => {
    const e = validateGenerate({
      ...validInput,
      artist: "a".repeat(GEN_MAX.artist + 1),
    });
    expect(e.artist).toBeTruthy();
    expect(e.song).toBeUndefined();
    expect(e.guitar).toBeUndefined();
    expect(e.processor).toBeUndefined();
  });

  test("guitar 길이 초과 → 에러", () => {
    const e = validateGenerate({
      ...validInput,
      guitar: "a".repeat(GEN_MAX.guitar + 1),
    });
    expect(e.guitar).toBeTruthy();
    expect(e.artist).toBeUndefined();
    expect(e.song).toBeUndefined();
    expect(e.processor).toBeUndefined();
  });

  test("processor 길이 초과 → 에러", () => {
    const e = validateGenerate({
      ...validInput,
      processor: "a".repeat(GEN_MAX.processor + 1),
    });
    expect(e.processor).toBeTruthy();
    expect(e.artist).toBeUndefined();
    expect(e.song).toBeUndefined();
    expect(e.guitar).toBeUndefined();
  });

  test("유효 입력 4필드 → 에러 없음", () => {
    expect(validateGenerate(validInput)).toEqual({});
  });

  test("부분 유효 입력 → 유효 필드는 에러 없음", () => {
    const e = validateGenerate({
      artist: "Coldplay",
      song: "Yellow",
      guitar: "",
      processor: "GP-150",
    });
    expect(e.guitar).toBeTruthy();
    expect(e.artist).toBeUndefined();
    expect(e.song).toBeUndefined();
    expect(e.processor).toBeUndefined();
  });
});
