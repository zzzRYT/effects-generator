import type { AudioSegment } from "../pipeline/audio-observations";

export const MIN_SEGMENT_MS = 5_000;
export const MAX_SEGMENT_MS = 60_000;

export type SegmentBoundary = "start" | "end";

export function clampSegment(
  segment: AudioSegment,
  durationMs: number,
): AudioSegment {
  const duration = Math.max(0, durationMs);
  if (duration <= MIN_SEGMENT_MS) {
    return { ...segment, startMs: 0, endMs: duration };
  }
  const startMs = Math.max(
    0,
    Math.min(segment.startMs, duration - MIN_SEGMENT_MS),
  );
  const endMs = Math.max(
    startMs + MIN_SEGMENT_MS,
    Math.min(segment.endMs, startMs + MAX_SEGMENT_MS, duration),
  );
  return { ...segment, startMs, endMs };
}

export function moveBoundary(
  segment: AudioSegment,
  boundary: SegmentBoundary,
  valueMs: number,
  durationMs: number,
): AudioSegment {
  if (boundary === "start") {
    const minimum = Math.max(0, segment.endMs - MAX_SEGMENT_MS);
    const maximum = Math.max(minimum, segment.endMs - MIN_SEGMENT_MS);
    return {
      ...segment,
      startMs: Math.max(minimum, Math.min(valueMs, maximum)),
    };
  }
  const minimum = segment.startMs + MIN_SEGMENT_MS;
  const maximum = Math.min(durationMs, segment.startMs + MAX_SEGMENT_MS);
  return {
    ...segment,
    endMs: Math.max(minimum, Math.min(valueMs, maximum)),
  };
}

export function nudgeBoundary(
  segment: AudioSegment,
  boundary: SegmentBoundary,
  direction: -1 | 1,
  shifted: boolean,
  durationMs: number,
): AudioSegment {
  const delta = (shifted ? 5_000 : 1_000) * direction;
  const current = boundary === "start" ? segment.startMs : segment.endMs;
  return moveBoundary(segment, boundary, current + delta, durationMs);
}
