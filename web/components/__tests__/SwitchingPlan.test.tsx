import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { SwitchingPlan as SwitchingPlanData } from "@/lib/types";
import { SwitchingPlan } from "@/components/signal-chain/SwitchingPlan";

const plan: SwitchingPlanData = {
  A: { description: "솔로 — Green OD + Slapback ON", blockModels: ["Green OD", "Slapback"] },
};

describe("SwitchingPlan", () => {
  it("스위칭 플랜 섹션과 설명·개수·모델을 렌더 (fs-4.10)", () => {
    render(<SwitchingPlan switching={plan} />);
    expect(
      screen.getByRole("region", { name: "스위칭 플랜" }),
    ).toBeInTheDocument();
    expect(screen.getByText("CTRL A")).toBeInTheDocument();
    expect(screen.getByText(/솔로 — Green OD/)).toBeInTheDocument();
    expect(screen.getByText(/\(2개: Green OD, Slapback\)/)).toBeInTheDocument();
  });

  it("switching 이 없으면 아무것도 렌더하지 않는다", () => {
    const { container } = render(<SwitchingPlan />);
    expect(container.firstChild).toBeNull();
  });

  it("blockModels 가 빈 경우 개수 병기를 생략", () => {
    render(
      <SwitchingPlan
        switching={{ B: { description: "설명만", blockModels: [] } }}
      />,
    );
    expect(screen.getByText("설명만")).toBeInTheDocument();
    expect(screen.queryByText(/개:/)).toBeNull();
  });
});
