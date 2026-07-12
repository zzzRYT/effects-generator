import type { AudioSegment } from "../pipeline/audio-observations";

export const MIN_SEGMENT_MS = 5_000;
export const MAX_SEGMENT_MS = 60_000;

export function clampSegment(
  segment: AudioSegment,
  durationMs: number,
): AudioSegment {
  const duration = Math.max(0, durationMs);
  if (duration <= MIN_SEGMENT_MS) {
    return { startMs: 0, endMs: duration };
  }
  const startMs = Math.max(
    0,
    Math.min(segment.startMs, duration - MIN_SEGMENT_MS),
  );
  const endMs = Math.max(
    startMs + MIN_SEGMENT_MS,
    Math.min(segment.endMs, startMs + MAX_SEGMENT_MS, duration),
  );
  return { startMs, endMs };
}

/** 구간 전체를 이동(폭 보존). 화살표 좌/우 — 시작점 이동. */
export function moveSegment(
  segment: AudioSegment,
  deltaMs: number,
  durationMs: number,
): AudioSegment {
  const duration = Math.max(0, durationMs);
  const width = segment.endMs - segment.startMs;
  const maxStart = Math.max(0, duration - width);
  const startMs = Math.max(0, Math.min(segment.startMs + deltaMs, maxStart));
  return { startMs, endMs: startMs + width };
}

/** 끝점만 조정(폭 변경). 화살표 상/하 — 별도 키로 폭 조정. */
export function resizeSegment(
  segment: AudioSegment,
  deltaMs: number,
  durationMs: number,
): AudioSegment {
  const duration = Math.max(0, durationMs);
  const endMs = Math.max(
    segment.startMs + MIN_SEGMENT_MS,
    Math.min(segment.endMs + deltaMs, segment.startMs + MAX_SEGMENT_MS, duration),
  );
  return { startMs: segment.startMs, endMs };
}

/** pointerdown 앵커 → 현재 포인터 위치로 구간 생성. 5초 미만은 5초로 스냅, 60초 초과는 60초로 캡. */
export function segmentFromDrag(
  anchorMs: number,
  pointerMs: number,
  durationMs: number,
): AudioSegment {
  const lo = Math.min(anchorMs, pointerMs);
  const hi = Math.max(anchorMs, pointerMs);
  const width = Math.min(Math.max(hi - lo, MIN_SEGMENT_MS), MAX_SEGMENT_MS);
  return clampSegment({ startMs: lo, endMs: lo + width }, durationMs);
}

/** 포인터 clientX + 트랙 bounding rect → 클램프된 ms 위치. */
export function msFromPointerX(
  clientX: number,
  rect: { left: number; width: number },
  durationMs: number,
): number {
  if (rect.width <= 0) return 0;
  const ratio = (clientX - rect.left) / rect.width;
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  return Math.round(clampedRatio * durationMs);
}
