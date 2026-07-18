import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, test, vi } from "vitest";
import { PointTimeline } from "@/components/audio-lab/PointTimeline";
import type { AudioSegment } from "@/lib/pipeline/audio-observations";

function Harness({ onPreview = vi.fn(), disabled = false }: { onPreview?: (start: number, end: number) => void; disabled?: boolean }) {
  const [segment, setSegment] = useState<AudioSegment>({ startMs: 10_000, endMs: 30_000 });
  return (
    <PointTimeline
      segment={segment}
      durationMs={120_000}
      currentTimeMs={0}
      onChange={setSegment}
      onPreview={onPreview}
      disabled={disabled}
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

  test("resets stale anchor on pointercancel to prevent resuming drag on unrelated pointermove", () => {
    mockTrackRect();
    render(<Harness />);
    const track = screen.getByTestId("point-timeline");
    const slider = screen.getByRole("slider", { name: "구간 선택" });

    // Start a drag at clientX=100
    fireEvent.pointerDown(track, { clientX: 100, pointerId: 1 });
    // Capture state after pointerdown (should be a 5-second segment at ~12s)
    const stateAfterPointerDown = slider.getAttribute("aria-valuetext");
    expect(stateAfterPointerDown).toBe("00:12–00:17");

    // Cancel it (e.g., browser gesture, alt-tab)
    // Manually dispatch pointercancel event since fireEvent might not support it properly
    const cancelEvent = new PointerEvent("pointercancel", {
      bubbles: true,
      cancelable: true,
      clientX: 100,
      pointerId: 1,
    });
    track.dispatchEvent(cancelEvent);

    // Fire an unrelated pointermove at clientX=400 (should NOT resume dragging from stale anchor)
    fireEvent.pointerMove(track, { clientX: 400, pointerId: 1 });

    // Verify segment stayed at the state set by pointerdown (not changed by the stale drag resumption)
    expect(slider).toHaveAttribute("aria-valuetext", stateAfterPointerDown);
  });

  test("blocks drag operations when disabled=true", () => {
    mockTrackRect();
    render(<Harness disabled={true} />);
    const track = screen.getByTestId("point-timeline");
    const slider = screen.getByRole("slider", { name: "구간 선택" });
    const initialValue = slider.getAttribute("aria-valuetext");

    // Attempt to drag while disabled
    fireEvent.pointerDown(track, { clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(track, { clientX: 300, pointerId: 1 });
    fireEvent.pointerUp(track, { clientX: 300, pointerId: 1 });

    // Verify segment did not change
    expect(slider).toHaveAttribute("aria-valuetext", initialValue);
  });

  test("blocks keyboard operations when disabled=true", () => {
    render(<Harness disabled={true} />);
    const slider = screen.getByRole("slider", { name: "구간 선택" });
    const initialValue = slider.getAttribute("aria-valuenow");

    slider.focus();
    // Attempt keyboard move while disabled
    fireEvent.keyDown(slider, { key: "ArrowRight" });

    // Verify segment did not change
    expect(slider).toHaveAttribute("aria-valuenow", initialValue);
  });

  test("removes slider from tab order and sets aria-disabled when disabled=true", () => {
    render(<Harness disabled={true} />);
    const slider = screen.getByRole("slider", { name: "구간 선택" });

    expect(slider).toHaveAttribute("tabIndex", "-1");
    expect(slider).toHaveAttribute("aria-disabled", "true");
  });
});
