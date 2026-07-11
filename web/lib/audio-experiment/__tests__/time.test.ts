import { describe, expect, test } from "vitest";
import { formatTimestamp, parseTimestamp } from "../time";

describe("experiment timestamps", () => {
  test.each([
    [0, "00:00"],
    [65_000, "01:05"],
    [3_661_000, "01:01:01"],
  ])("formats %ims as %s", (milliseconds, expected) => {
    expect(formatTimestamp(milliseconds)).toBe(expected);
  });

  test.each([
    ["00:00", 0],
    ["01:05", 65_000],
    ["1:01:01", 3_661_000],
  ])("parses %s", (value, expected) => {
    expect(parseTimestamp(value)).toBe(expected);
  });

  test.each(["", "1", "01:60", "1:60:00", "-1:00", "aa:bb"])(
    "rejects invalid timestamp %s",
    (value) => {
      expect(parseTimestamp(value)).toBeNull();
    },
  );
});
