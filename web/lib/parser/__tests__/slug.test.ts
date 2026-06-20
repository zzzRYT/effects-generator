import { describe, it, expect } from "vitest";
import { slugFromPath } from "../slug";

describe("slugFromPath", () => {
  it("파일명에서 .md 를 떼고 slug 를 만든다", () => {
    expect(slugFromPath("patches/g250-gp150/oasis-dont-look-back-in-anger.md")).toBe(
      "oasis-dont-look-back-in-anger",
    );
  });

  it("경로 없이도 동작", () => {
    expect(slugFromPath("foo.md")).toBe("foo");
  });

  it("대문자 .MD 도 처리", () => {
    expect(slugFromPath("a/B.MD")).toBe("B");
  });
});
