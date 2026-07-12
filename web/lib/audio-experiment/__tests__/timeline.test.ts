import { describe, expect, test } from "vitest";
import {
  clampSegment,
  moveSegment,
  msFromPointerX,
  resizeSegment,
  segmentFromDrag,
} from "../timeline";

const SEGMENT = { startMs: 10_000, endMs: 30_000 };

describe("point timeline", () => {
  test("clamps segments to 5-60 seconds and video duration", () => {
    expect(clampSegment({ startMs: -1_000, endMs: 100_000 }, 90_000)).toEqual({
      startMs: 0,
      endMs: 60_000,
    });
    expect(clampSegment({ startMs: 88_000, endMs: 89_000 }, 90_000)).toEqual({
      startMs: 85_000,
      endMs: 90_000,
    });
  });

  test("moveSegment translates the whole segment and preserves width", () => {
    expect(moveSegment(SEGMENT, 5_000, 120_000)).toEqual({ startMs: 15_000, endMs: 35_000 });
    expect(moveSegment(SEGMENT, -5_000, 120_000)).toEqual({ startMs: 5_000, endMs: 25_000 });
    expect(moveSegment(SEGMENT, -50_000, 120_000)).toEqual({ startMs: 0, endMs: 20_000 });
  });

  test("resizeSegment adjusts only the end boundary within 5-60 second bounds", () => {
    expect(resizeSegment(SEGMENT, 5_000, 120_000)).toEqual({ startMs: 10_000, endMs: 35_000 });
    expect(resizeSegment(SEGMENT, -50_000, 120_000)).toEqual({ startMs: 10_000, endMs: 15_000 });
    expect(resizeSegment(SEGMENT, 100_000, 120_000)).toEqual({ startMs: 10_000, endMs: 70_000 });
  });

  test("segmentFromDrag snaps short drags to 5s and caps long drags at 60s", () => {
    expect(segmentFromDrag(10_000, 10_500, 120_000)).toEqual({ startMs: 10_000, endMs: 15_000 });
    expect(segmentFromDrag(10_000, 90_000, 120_000)).toEqual({ startMs: 10_000, endMs: 70_000 });
    expect(segmentFromDrag(30_000, 10_000, 120_000)).toEqual({ startMs: 10_000, endMs: 30_000 });
  });

  test("msFromPointerX maps a client X position to clamped milliseconds", () => {
    const rect = { left: 100, width: 200 };
    expect(msFromPointerX(100, rect, 60_000)).toBe(0);
    expect(msFromPointerX(200, rect, 60_000)).toBe(30_000);
    expect(msFromPointerX(400, rect, 60_000)).toBe(60_000);
  });
});
