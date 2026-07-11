import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, test, vi } from "vitest";
import { RoleRangeLane } from "@/components/audio-lab/RoleRangeLane";
import type { AudioSegment } from "@/lib/pipeline/audio-observations";

function Harness({ onPreview = vi.fn() }: { onPreview?: (start: number, end: number) => void }) {
  const [segment, setSegment] = useState<AudioSegment>({
    role: "lead",
    startMs: 10_000,
    endMs: 30_000,
  });
  return (
    <RoleRangeLane
      segment={segment}
      durationMs={120_000}
      onChange={setSegment}
      onPreview={onPreview}
    />
  );
}

describe("RoleRangeLane", () => {
  test("gives each range thumb a distinct accessible name", () => {
    render(<Harness />);
    expect(screen.getByRole("slider", { name: "lead 시작" })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "lead 종료" })).toBeInTheDocument();
  });

  test("supports one-second and Shift five-second keyboard updates", () => {
    render(<Harness />);
    const start = screen.getByRole("slider", { name: "lead 시작" });
    fireEvent.keyDown(start, { key: "ArrowRight" });
    expect(start).toHaveValue("11000");
    fireEvent.keyDown(start, { key: "ArrowRight", shiftKey: true });
    expect(start).toHaveValue("16000");
  });

  test("synchronizes valid timestamp text input", () => {
    render(<Harness />);
    const startText = screen.getByRole("textbox", { name: "lead 시작 시간" });
    fireEvent.change(startText, { target: { value: "00:20" } });
    fireEvent.blur(startText);
    expect(screen.getByRole("slider", { name: "lead 시작" })).toHaveValue(
      "20000",
    );
  });

  test("previews the selected range", () => {
    const onPreview = vi.fn();
    render(<Harness onPreview={onPreview} />);
    fireEvent.click(screen.getByRole("button", { name: "lead 구간 재생" }));
    expect(onPreview).toHaveBeenCalledWith(10_000, 30_000);
  });
});
