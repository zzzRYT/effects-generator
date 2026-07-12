import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, test, vi } from "vitest";
import { PointTimeline } from "@/components/audio-lab/PointTimeline";
import type { AudioSegment } from "@/lib/pipeline/audio-observations";

function Harness({ onPreview = vi.fn() }: { onPreview?: (start: number, end: number) => void }) {
  const [segment, setSegment] = useState<AudioSegment>({ startMs: 10_000, endMs: 30_000 });
  return (
    <PointTimeline
      segment={segment}
      durationMs={120_000}
      currentTimeMs={0}
      onChange={setSegment}
      onPreview={onPreview}
    />
  );
}

function mockTrackRect() {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    left: 0,
    top: 0,
    right: 1_000,
    bottom: 40,
    width: 1_000,
    height: 40,
    x: 0,
    y: 0,
    toJSON() {},
  });
}

describe("PointTimeline", () => {
  test("drags from a pointerdown anchor to a pointerup point to create a segment", () => {
    mockTrackRect();
    render(<Harness />);
    const track = screen.getByTestId("point-timeline");
    fireEvent.pointerDown(track, { clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(track, { clientX: 300, pointerId: 1 });
    fireEvent.pointerUp(track, { clientX: 300, pointerId: 1 });
    expect(screen.getByRole("slider", { name: "구간 선택" })).toHaveAttribute(
      "aria-valuetext",
      "00:12–00:36",
    );
  });

  test("snaps a plain click (zero-width drag) to a five-second segment", () => {
    mockTrackRect();
    render(<Harness />);
    const track = screen.getByTestId("point-timeline");
    fireEvent.pointerDown(track, { clientX: 100, pointerId: 1 });
    fireEvent.pointerUp(track, { clientX: 100, pointerId: 1 });
    expect(screen.getByRole("slider", { name: "구간 선택" })).toHaveAttribute(
      "aria-valuetext",
      "00:12–00:17",
    );
  });

  test("moves the segment with ArrowLeft/ArrowRight and resizes with ArrowUp/ArrowDown", () => {
    render(<Harness />);
    const slider = screen.getByRole("slider", { name: "구간 선택" });
    slider.focus();
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(slider).toHaveAttribute("aria-valuenow", "11000");
    fireEvent.keyDown(slider, { key: "ArrowRight", shiftKey: true });
    expect(slider).toHaveAttribute("aria-valuenow", "16000");
    fireEvent.keyDown(slider, { key: "ArrowUp" });
    expect(slider).toHaveAttribute("aria-valuetext", "00:16–00:37");
    fireEvent.keyDown(slider, { key: "ArrowDown", shiftKey: true });
    expect(slider).toHaveAttribute("aria-valuetext", "00:16–00:32");
  });

  test("previews the selected range", () => {
    const onPreview = vi.fn();
    render(<Harness onPreview={onPreview} />);
    fireEvent.click(screen.getByRole("button", { name: "미리듣기" }));
    expect(onPreview).toHaveBeenCalledWith(10_000, 30_000);
  });
});
