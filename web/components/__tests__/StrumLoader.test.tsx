import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { StrumLoader } from "@/components/generate/StrumLoader";

describe("StrumLoader", () => {
  it("6개의 현(path)을 렌더한다", () => {
    const { container } = render(<StrumLoader />);
    expect(container.querySelectorAll("path")).toHaveLength(6);
  });

  it("장식 요소이므로 svg 는 aria-hidden + focusable=false", () => {
    const { container } = render(<StrumLoader />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("focusable", "false");
  });

  it("각 현은 팔레트 색과 스트럼 시차(animation-delay)를 갖는다", () => {
    const { container } = render(<StrumLoader />);
    const strings = Array.from(container.querySelectorAll("path"));
    // 첫 현은 시차 0, 이후 현은 0이 아닌 지연 → 다운스트럼.
    expect(strings[0].style.animationDelay).toBe("0s");
    expect(strings[5].style.animationDelay).not.toBe("0s");
    // 색은 토큰 변수로 지정.
    expect(strings[0].style.color).toContain("--color-");
  });
});
