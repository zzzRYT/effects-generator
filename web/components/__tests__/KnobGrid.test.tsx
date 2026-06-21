import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Knob } from "@/lib/types";
import { KnobGrid } from "@/components/signal-chain/KnobGrid";

describe("KnobGrid", () => {
  it("노브를 name/value 로 분리해 렌더한다", () => {
    const knobs: Knob[] = [
      { name: "Time", value: 640, unit: "ms" },
      { name: "Gain", value: 5.5 },
    ];
    render(<KnobGrid knobs={knobs} />);
    expect(screen.getByText("Time")).toBeInTheDocument();
    expect(screen.getByText("640ms")).toBeInTheDocument();
    expect(screen.getByText("Gain")).toBeInTheDocument();
    expect(screen.getByText("5.5 (0–10)")).toBeInTheDocument();
  });

  it("빈 노브 배열은 '노브 없음' 표시 (crash 0)", () => {
    const { container } = render(<KnobGrid knobs={[]} />);
    expect(screen.getByText("노브 없음")).toBeInTheDocument();
    expect(container.querySelector("[data-knob-empty]")).toBeTruthy();
  });
});
