import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Panel } from "@/components/ui/Panel";

describe("Panel", () => {
  it("children 을 렌더한다", () => {
    render(
      <Panel>
        <span>내용</span>
      </Panel>,
    );
    expect(screen.getByText("내용")).toBeInTheDocument();
  });

  it("as 로 시맨틱 태그를 바꾼다", () => {
    const { container } = render(<Panel as="section">x</Panel>);
    expect(container.querySelector("section")).toBeTruthy();
  });

  it("className 을 병합한다(내부 클래스 유지)", () => {
    const { container } = render(<Panel className="extra">x</Panel>);
    const el = container.firstElementChild!;
    expect(el.className).toContain("extra");
    // 내부 표피 클래스도 남아 있어야 함(병합, 대체 아님)
    expect(el.className.split(" ").length).toBeGreaterThan(1);
  });

  it("임의 props/aria 를 패스스루한다", () => {
    render(
      <Panel aria-label="섀시" data-testid="p">
        x
      </Panel>,
    );
    const el = screen.getByTestId("p");
    expect(el).toHaveAttribute("aria-label", "섀시");
  });

  it("screws=false 면 스크류 장식을 렌더하지 않는다", () => {
    const { container } = render(<Panel screws={false}>x</Panel>);
    // 스크류는 aria-hidden 장식 span — 없어야 함
    expect(container.querySelector("[aria-hidden='true']")).toBeNull();
  });

  it("screws 기본값이면 aria-hidden 장식이 있다", () => {
    const { container } = render(<Panel>x</Panel>);
    expect(container.querySelector("[aria-hidden='true']")).toBeTruthy();
  });

  it("recessed 면 data-recessed 를 노출한다", () => {
    const { container } = render(<Panel recessed>x</Panel>);
    expect(container.firstElementChild).toHaveAttribute("data-recessed", "true");
  });

  // VariationPanel 이 <Panel as="article" {...tabProps}> 로 탭패널 ARIA 를 태워 보낸다.
  // Panel 리팩터가 이 배선을 조용히 끊으면 변주 탭 위젯이 깨진다(회귀 가드).
  it("as='article' 에 tabpanel ARIA 세트를 그대로 전달한다", () => {
    const { container } = render(
      <Panel
        as="article"
        role="tabpanel"
        id="panel-0"
        aria-labelledby="tab-0"
        data-active="true"
        tabIndex={0}
      >
        x
      </Panel>,
    );
    const el = container.querySelector("article")!;
    expect(el).toHaveAttribute("role", "tabpanel");
    expect(el).toHaveAttribute("id", "panel-0");
    expect(el).toHaveAttribute("aria-labelledby", "tab-0");
    expect(el).toHaveAttribute("data-active", "true");
    expect(el).toHaveAttribute("tabindex", "0");
  });
});
