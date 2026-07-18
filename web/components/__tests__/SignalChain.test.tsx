import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Block } from "@/lib/types";
import { SignalChain } from "@/components/signal-chain/SignalChain";

const blocks: Block[] = [
  { type: "DST", category: "OD", model: "Green OD", enabled: true, knobs: [] },
  { type: "AMP", model: "UK 800", enabled: true, knobs: [] },
  { type: "CAB", model: "UK 30", enabled: true, knobs: [] },
];

describe("SignalChain", () => {
  it("블록을 배열 순서대로 렌더한다 (ui-1.2)", () => {
    render(<SignalChain blocks={blocks} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Green OD");
    expect(items[1]).toHaveTextContent("UK 800");
    expect(items[2]).toHaveTextContent("UK 30");
  });

  it("블록 사이에만 커넥터(N-1개)를 넣는다", () => {
    const { container } = render(<SignalChain blocks={blocks} />);
    const connectors = container.querySelectorAll('[aria-hidden="true"]');
    // 커넥터(→) 2개 + LED span 등 aria-hidden 포함될 수 있어 텍스트로 카운트
    const arrows = Array.from(connectors).filter((n) => n.textContent === "→");
    expect(arrows).toHaveLength(2);
  });

  it("블록 1개면 커넥터 없음", () => {
    const { container } = render(<SignalChain blocks={[blocks[0]]} />);
    const arrows = Array.from(
      container.querySelectorAll('[aria-hidden="true"]'),
    ).filter((n) => n.textContent === "→");
    expect(arrows).toHaveLength(0);
  });
});
