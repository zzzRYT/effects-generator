import { describe, it, expect } from "vitest";
import { parsePatch } from "../parsePatch";
import { serialize } from "../serialize";
import * as F from "./fixtures";

const FILE = "patches/x/test.md";

describe("serialize", () => {
  it("PATCHES 타입 상수 소스를 만든다", () => {
    const { song } = parsePatch(F.VALID, FILE);
    const out = serialize([song!]);
    expect(out).toContain("export const PATCHES");
    expect(out).toContain("import type { Song }");
    expect(out).toContain("TS-808");
  });

  it("결정적: 같은 입력 → 동일 출력", () => {
    const { song } = parsePatch(F.VALID, FILE);
    expect(serialize([song!])).toBe(serialize([song!]));
  });

  it("출력 JSON 이 원본 데이터를 보존한다(라운드트립)", () => {
    const { song } = parsePatch(F.VALID, FILE);
    const out = serialize([song!]);
    const m = out.match(/PATCHES[^=]*=\s*([\s\S]*?);\s*$/);
    expect(m).not.toBeNull();
    const parsed = JSON.parse(m![1]);
    expect(parsed).toEqual([song]);
  });
});
