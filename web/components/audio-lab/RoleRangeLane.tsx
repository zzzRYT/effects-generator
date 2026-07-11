"use client";

import { useState } from "react";
import type { AudioSegment } from "@/lib/pipeline/audio-observations";
import { formatTimestamp, parseTimestamp } from "@/lib/audio-experiment/time";
import {
  moveBoundary,
  nudgeBoundary,
  type SegmentBoundary,
} from "@/lib/audio-experiment/timeline";

interface RoleRangeLaneProps {
  segment: AudioSegment;
  durationMs: number;
  onChange(segment: AudioSegment): void;
  onPreview(startMs: number, endMs: number): void;
}

export function RoleRangeLane({
  segment,
  durationMs,
  onChange,
  onPreview,
}: RoleRangeLaneProps) {
  const [startDraft, setStartDraft] = useState<string | null>(null);
  const [endDraft, setEndDraft] = useState<string | null>(null);

  function update(boundary: SegmentBoundary, valueMs: number) {
    onChange(moveBoundary(segment, boundary, valueMs, durationMs));
  }

  function commitText(boundary: SegmentBoundary, value: string) {
    const parsed = parseTimestamp(value);
    if (parsed !== null) update(boundary, parsed);
    if (boundary === "start") setStartDraft(null);
    else setEndDraft(null);
  }

  function keyDown(
    event: React.KeyboardEvent<HTMLInputElement>,
    boundary: SegmentBoundary,
  ) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    onChange(
      nudgeBoundary(
        segment,
        boundary,
        event.key === "ArrowRight" ? 1 : -1,
        event.shiftKey,
        durationMs,
      ),
    );
  }

  return (
    <fieldset data-role-lane={segment.role}>
      <legend>{segment.role}</legend>
      <div>
        <input
          type="range"
          aria-label={`${segment.role} 시작`}
          min={0}
          max={Math.max(0, segment.endMs - 5_000)}
          step={1_000}
          value={segment.startMs}
          onChange={(event) => update("start", Number(event.target.value))}
          onKeyDown={(event) => keyDown(event, "start")}
        />
        <input
          type="range"
          aria-label={`${segment.role} 종료`}
          min={segment.startMs + 5_000}
          max={Math.min(durationMs, segment.startMs + 60_000)}
          step={1_000}
          value={segment.endMs}
          onChange={(event) => update("end", Number(event.target.value))}
          onKeyDown={(event) => keyDown(event, "end")}
        />
      </div>
      <div>
        <label>
          <span>{segment.role} 시작 시간</span>
          <input
            value={startDraft ?? formatTimestamp(segment.startMs)}
            onChange={(event) => setStartDraft(event.target.value)}
            onBlur={(event) => commitText("start", event.target.value)}
            inputMode="numeric"
          />
        </label>
        <label>
          <span>{segment.role} 종료 시간</span>
          <input
            value={endDraft ?? formatTimestamp(segment.endMs)}
            onChange={(event) => setEndDraft(event.target.value)}
            onBlur={(event) => commitText("end", event.target.value)}
            inputMode="numeric"
          />
        </label>
        <button
          type="button"
          onClick={() => onPreview(segment.startMs, segment.endMs)}
        >
          {segment.role} 구간 재생
        </button>
      </div>
    </fieldset>
  );
}
