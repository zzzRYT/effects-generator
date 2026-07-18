"use client";

import { useCallback, useRef } from "react";
import type { AudioSegment } from "@/lib/pipeline/audio-observations";
import { formatTimestamp } from "@/lib/audio-experiment/time";
import {
  moveSegment,
  msFromPointerX,
  resizeSegment,
  segmentFromDrag,
} from "@/lib/audio-experiment/timeline";
import styles from "./audio-tone-lab.module.css";

interface PointTimelineProps {
  segment: AudioSegment;
  durationMs: number;
  currentTimeMs: number;
  onChange(segment: AudioSegment): void;
  onPreview(startMs: number, endMs: number): void;
  disabled?: boolean;
}

export function PointTimeline({
  segment,
  durationMs,
  currentTimeMs,
  onChange,
  onPreview,
  disabled = false,
}: PointTimelineProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const anchorRef = useRef<number | null>(null);

  const rectOf = useCallback(() => {
    const rect = trackRef.current?.getBoundingClientRect();
    return rect ? { left: rect.left, width: rect.width } : { left: 0, width: 0 };
  }, []);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (disabled) return;
    const anchorMs = msFromPointerX(event.clientX, rectOf(), durationMs);
    anchorRef.current = anchorMs;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    onChange(segmentFromDrag(anchorMs, anchorMs, durationMs));
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (anchorRef.current === null) return;
    const pointerMs = msFromPointerX(event.clientX, rectOf(), durationMs);
    onChange(segmentFromDrag(anchorRef.current, pointerMs, durationMs));
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    anchorRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }

  function onPointerCancel(event: React.PointerEvent<HTMLDivElement>) {
    anchorRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;
    const delta = event.shiftKey ? 5_000 : 1_000;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      onChange(moveSegment(segment, -delta, durationMs));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      onChange(moveSegment(segment, delta, durationMs));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      onChange(resizeSegment(segment, delta, durationMs));
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      onChange(resizeSegment(segment, -delta, durationMs));
    }
  }

  const safeDuration = Math.max(durationMs, 1);
  const startPct = (segment.startMs / safeDuration) * 100;
  const widthPct = ((segment.endMs - segment.startMs) / safeDuration) * 100;
  const playheadPct = (Math.min(currentTimeMs, durationMs) / safeDuration) * 100;

  return (
    <div className={styles.timelineWrap}>
      <div
        ref={trackRef}
        className={styles.timelineTrack}
        data-testid="point-timeline"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <div className={styles.timelinePlayhead} style={{ left: `${playheadPct}%` }} />
        <div
          className={styles.timelineSelection}
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label="구간 선택"
          aria-valuemin={0}
          aria-valuemax={durationMs}
          aria-valuenow={segment.startMs}
          aria-valuetext={`${formatTimestamp(segment.startMs)}–${formatTimestamp(segment.endMs)}`}
          aria-disabled={disabled}
          style={{ left: `${startPct}%`, width: `${widthPct}%` }}
          onKeyDown={onKeyDown}
        />
      </div>
      <div className={styles.timelineControls}>
        <span>{formatTimestamp(segment.startMs)} – {formatTimestamp(segment.endMs)}</span>
        <button type="button" onClick={() => onPreview(segment.startMs, segment.endMs)}>
          미리듣기
        </button>
      </div>
    </div>
  );
}
