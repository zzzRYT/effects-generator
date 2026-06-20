import { describe, it, expect } from "vitest";
import { parseAll, formatError, formatWarning } from "../index";
import * as F from "./fixtures";

describe("parseAll", () => {
  it("여러 파일을 집계하고 slug 로 정렬한다", () => {
    const { songs, errors } = parseAll([
      { path: "patches/x/zeta.md", raw: F.VALID },
      { path: "patches/x/alpha.md", raw: F.MULTI_VARIATION },
    ]);
    expect(errors).toEqual([]);
    expect(songs).toHaveLength(2);
    expect(songs.map((s) => s.slug)).toEqual(["alpha", "zeta"]);
  });

  it("깨진 파일의 에러를 모으고 정상 곡만 남긴다", () => {
    const { songs, errors } = parseAll([
      { path: "patches/x/ok.md", raw: F.VALID },
      { path: "patches/x/bad.md", raw: F.MALFORMED_JSON },
    ]);
    expect(songs).toHaveLength(1);
    expect(songs[0].slug).toBe("ok");
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].file).toBe("patches/x/bad.md");
  });

  it("경고도 집계한다", () => {
    const { warnings } = parseAll([
      { path: "patches/x/m.md", raw: F.SWITCHING_MISMATCH },
    ]);
    expect(warnings.length).toBeGreaterThan(0);
  });
});

describe("formatError / formatWarning", () => {
  it("에러: 파일:라인 [규칙ID] 메시지", () => {
    expect(
      formatError({ file: "a.md", line: 3, ruleId: "block-field", message: "bad" }),
    ).toBe("a.md:3 [block-field] bad");
  });

  it("경고: 파일:라인 [warn] 메시지", () => {
    expect(formatWarning({ file: "a.md", line: 5, message: "warn msg" })).toBe(
      "a.md:5 [warn] warn msg",
    );
  });
});
