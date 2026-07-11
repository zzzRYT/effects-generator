import { describe, expect, test } from "vitest";
import {
  clampSegment,
  moveBoundary,
  nudgeBoundary,
} from "../timeline";

const SEGMENT = { role: "lead" as const, startMs: 10_000, endMs: 30_000 };

describe("role timeline", () => {
  test("clamps segments to 5–60 seconds and video duration", () => {
    expect(
      clampSegment({ ...SEGMENT, startMs: -1_000, endMs: 100_000 }, 90_000),
    ).toEqual({ ...SEGMENT, startMs: 0, endMs: 60_000 });
    expect(
      clampSegment({ ...SEGMENT, startMs: 88_000, endMs: 89_000 }, 90_000),
    ).toEqual({ ...SEGMENT, startMs: 85_000, endMs: 90_000 });
  });

  test("prevents start/end crossing while preserving minimum duration", () => {
    expect(moveBoundary(SEGMENT, "start", 29_000, 120_000)).toMatchObject({
      startMs: 25_000,
      endMs: 30_000,
    });
    expect(moveBoundary(SEGMENT, "end", 11_000, 120_000)).toMatchObject({
      startMs: 10_000,
      endMs: 15_000,
    });
  });

  test("nudges by 1 second or Shift 5 seconds", () => {
    expect(nudgeBoundary(SEGMENT, "start", 1, false, 120_000).startMs).toBe(
      11_000,
    );
    expect(nudgeBoundary(SEGMENT, "end", -1, true, 120_000).endMs).toBe(
      25_000,
    );
  });
});
