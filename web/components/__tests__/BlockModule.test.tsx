import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { Block } from "@/lib/types";
import { BlockModule } from "@/components/signal-chain/BlockModule";

function block(overrides: Partial<Block> = {}): Block {
  return {
    type: "DST",
    model: "TS-808",
    enabled: true,
    knobs: [{ name: "Gain", value: 5.5 }],
    ...overrides,
  };
}

describe("BlockModule", () => {
  it("모델명·모듈 약어·효과종류 라벨·노브를 렌더한다", () => {
    render(<BlockModule block={block({ category: "OD" })} />);
    expect(screen.getByText("TS-808")).toBeInTheDocument();
    expect(screen.getByText("DST")).toBeInTheDocument(); // 모듈 배지 약어
    expect(screen.getByText("오버드라이브")).toBeInTheDocument(); // category 라벨
    expect(screen.getByText("Gain")).toBeInTheDocument();
  });

  it("category 를 data-category 로 노출한다", () => {
    const { container } = render(
      <BlockModule block={block({ category: "OD" })} />,
    );
    expect(container.querySelector("article")).toHaveAttribute(
      "data-category",
      "OD",
    );
  });

  it("category 없으면 효과종류 라벨 미표기", () => {
    render(<BlockModule block={block({ type: "AMP" })} />);
    expect(screen.queryByText("오버드라이브")).toBeNull();
  });

  it("data-group 으로 토큰을 노출한다 (category 우선)", () => {
    const { container } = render(<BlockModule block={block({ type: "AMP" })} />);
    expect(container.querySelector("article")).toHaveAttribute(
      "data-group",
      "amp",
    );
    // PRE 모듈이라도 category=BOOST 면 드라이브색(od) 그룹
    const { container: c2 } = render(
      <BlockModule block={block({ type: "PRE", category: "BOOST" })} />,
    );
    expect(c2.querySelector("article")).toHaveAttribute("data-group", "od");
  });

  it("enabled=false 면 data-enabled=false + OFF 라벨, 노브 값은 유지", () => {
    render(<BlockModule block={block({ enabled: false })} />);
    const article = screen.getByText("TS-808").closest("article")!;
    expect(article).toHaveAttribute("data-enabled", "false");
    expect(within(article).getByText(/OFF/)).toBeInTheDocument();
    expect(within(article).getByText(/5\.5/)).toBeInTheDocument();
  });

  it("기본 OFF + 풋스위치면 'A로 켬' 안내", () => {
    render(
      <BlockModule block={block({ enabled: false, footswitch: "A" })} />,
    );
    expect(screen.getByText(/기본 OFF · A로 켬/)).toBeInTheDocument();
  });

  it("풋스위치 블록은 aria-label 배지", () => {
    render(<BlockModule block={block({ footswitch: "B" })} />);
    expect(
      screen.getByLabelText("CTRL B 풋스위치로 토글"),
    ).toBeInTheDocument();
  });

  it("풋스위치 없으면 배지 영역 clean", () => {
    render(<BlockModule block={block()} />);
    expect(screen.queryByLabelText(/풋스위치로 토글/)).toBeNull();
  });

  it("base_gear 가 있으면 표시", () => {
    render(<BlockModule block={block({ base_gear: "Ibanez TS808" })} />);
    expect(screen.getByText("Ibanez TS808")).toBeInTheDocument();
  });

  it("LED 는 enabled 에 따라 data-on", () => {
    const { container, rerender } = render(<BlockModule block={block()} />);
    expect(container.querySelector("[data-on='true']")).toBeTruthy();
    rerender(<BlockModule block={block({ enabled: false })} />);
    expect(container.querySelector("[data-on='false']")).toBeTruthy();
  });
});
