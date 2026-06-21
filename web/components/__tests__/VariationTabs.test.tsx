import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Song } from "@/lib/types";
import { VariationTabs } from "@/components/song-detail/VariationTabs";

// next/navigation 모킹 — 아일랜드(VariationTabsClient)가 jsdom 에서 동작하도록.
// search 를 가변 홀더로 두고 테스트마다 ?v 를 바꾼다.
const nav = vi.hoisted(() => ({
  replace: vi.fn(),
  search: "",
  pathname: "/songs/g250-gp150/oasis-dont-look-back-in-anger",
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(nav.search),
  useRouter: () => ({ replace: nav.replace }),
  usePathname: () => nav.pathname,
}));

function makeSong(labels: string[]): Song {
  return {
    artist: "Oasis",
    title: "Don't Look Back in Anger",
    rig: "g250-gp150",
    slug: "oasis-dont-look-back-in-anger",
    variations: labels.map((label) => ({
      label,
      signalChain: [{ type: "AMP", model: "UK 800", enabled: true, knobs: [] }],
    })),
  };
}

const THREE = ["정석 JCM800", "빈티지 Plexi", "합주용 미드 푸시"];

beforeEach(() => {
  nav.replace.mockClear();
  nav.search = "";
  document.documentElement.classList.remove("js");
});

describe("VariationTabs — 구조 (AC1, AC7)", () => {
  it("변주 수만큼 탭(role=tab)을 라벨과 함께 렌더한다", () => {
    render(<VariationTabs song={makeSong(THREE)} />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveTextContent("정석 JCM800");
    expect(tabs[2]).toHaveTextContent("합주용 미드 푸시");
  });

  it("tablist + N tabpanel, aria-controls↔id 연결", () => {
    render(<VariationTabs song={makeSong(THREE)} />);
    expect(screen.getByRole("tablist", { name: "변주 선택" })).toBeInTheDocument();
    const panels = screen.getAllByRole("tabpanel");
    expect(panels).toHaveLength(3);
    const tab0 = screen.getAllByRole("tab")[0];
    expect(tab0).toHaveAttribute("aria-controls", "vpanel-0");
    expect(panels[0]).toHaveAttribute("id", "vpanel-0");
    expect(panels[0]).toHaveAttribute("aria-labelledby", "vtab-0");
  });

  it("첫 탭이 기본 활성(aria-selected/data-active)", () => {
    render(<VariationTabs song={makeSong(THREE)} />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs[0]).toHaveAttribute("data-active", "true");
    expect(tabs[1]).toHaveAttribute("data-active", "false");
  });

  it("tab.aria-controls ↔ panel.id, panel.aria-labelledby ↔ tab.id 가 전부 정합(드리프트 방지)", () => {
    render(<VariationTabs song={makeSong(THREE)} />);
    const tabs = screen.getAllByRole("tab");
    const panels = screen.getAllByRole("tabpanel");
    tabs.forEach((tab, i) => {
      const panel = panels[i];
      expect(tab.getAttribute("aria-controls")).toBe(panel.id);
      expect(panel.getAttribute("aria-labelledby")).toBe(tab.id);
    });
    // tabbed 패널은 aria-labelledby 가 이름을 제공 → 중복 aria-label 없음(a11y)
    expect(panels[0]).not.toHaveAttribute("aria-label");
  });
});

describe("VariationTabs — 변주 1개 (AC8)", () => {
  it("탭바를 렌더하지 않고 패널만 표시한다", () => {
    render(<VariationTabs song={makeSong(["단일 변주"])} />);
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.getByText("단일 변주")).toBeInTheDocument();
  });
});

describe("VariationTabs — 아일랜드 강화 (AC2, AC3, AC6)", () => {
  it("마운트 시 html.js 부착 + 첫 패널만 활성(data-active)", () => {
    render(<VariationTabs song={makeSong(THREE)} />);
    expect(document.documentElement.classList.contains("js")).toBe(true);
    const panels = screen.getAllByRole("tabpanel");
    expect(panels[0]).toHaveAttribute("data-active", "true");
    expect(panels[1]).toHaveAttribute("data-active", "false");
  });

  it("탭 클릭 → router.replace('?v=2', scroll:false) (URL 상태)", () => {
    render(<VariationTabs song={makeSong(THREE)} />);
    fireEvent.click(screen.getAllByRole("tab")[1]);
    expect(nav.replace).toHaveBeenCalledWith(
      `${nav.pathname}?v=2`,
      { scroll: false },
    );
  });

  it("ArrowRight → 다음 탭으로 ?v 이동 (automatic activation)", () => {
    render(<VariationTabs song={makeSong(THREE)} />);
    fireEvent.keyDown(screen.getAllByRole("tab")[0], { key: "ArrowRight" });
    expect(nav.replace).toHaveBeenCalledWith(
      `${nav.pathname}?v=2`,
      { scroll: false },
    );
  });

  it("End → 마지막 탭, Home → 첫 탭", () => {
    render(<VariationTabs song={makeSong(THREE)} />);
    const tabs = screen.getAllByRole("tab");
    fireEvent.keyDown(tabs[0], { key: "End" });
    expect(nav.replace).toHaveBeenLastCalledWith(
      `${nav.pathname}?v=3`,
      { scroll: false },
    );
    fireEvent.keyDown(tabs[2], { key: "Home" });
    expect(nav.replace).toHaveBeenLastCalledWith(
      `${nav.pathname}?v=1`,
      { scroll: false },
    );
  });

  it("ArrowLeft 는 첫 탭에서 순환해 마지막으로", () => {
    render(<VariationTabs song={makeSong(THREE)} />);
    fireEvent.keyDown(screen.getAllByRole("tab")[0], { key: "ArrowLeft" });
    expect(nav.replace).toHaveBeenCalledWith(
      `${nav.pathname}?v=3`,
      { scroll: false },
    );
  });

  it("ArrowDown/ArrowUp 도 좌우와 동등하게 이동(세로 탭바 대응)", () => {
    render(<VariationTabs song={makeSong(THREE)} />);
    const tabs = screen.getAllByRole("tab");
    fireEvent.keyDown(tabs[0], { key: "ArrowDown" });
    expect(nav.replace).toHaveBeenLastCalledWith(`${nav.pathname}?v=2`, {
      scroll: false,
    });
    fireEvent.keyDown(tabs[0], { key: "ArrowUp" });
    expect(nav.replace).toHaveBeenLastCalledWith(`${nav.pathname}?v=3`, {
      scroll: false,
    });
  });

  it("탐색 외 키(예: 'a')는 무시 — 네비게이션 없음", () => {
    render(<VariationTabs song={makeSong(THREE)} />);
    fireEvent.keyDown(screen.getAllByRole("tab")[0], { key: "a" });
    expect(nav.replace).not.toHaveBeenCalled();
  });
});

describe("VariationTabs — ?v 딥링크 반영 (AC4)", () => {
  it("?v=2 진입 시 2번 패널이 활성(data-active)", () => {
    nav.search = "v=2";
    render(<VariationTabs song={makeSong(THREE)} />);
    const panels = screen.getAllByRole("tabpanel");
    expect(panels[0]).toHaveAttribute("data-active", "false");
    expect(panels[1]).toHaveAttribute("data-active", "true");
    const tabs = screen.getAllByRole("tab");
    expect(tabs[1]).toHaveAttribute("aria-selected", "true");
    expect(tabs[1].tabIndex).toBe(0);
    expect(tabs[0].tabIndex).toBe(-1);
  });

  it("?v 범위밖(99) → 첫 패널 폴백", () => {
    nav.search = "v=99";
    render(<VariationTabs song={makeSong(THREE)} />);
    const panels = screen.getAllByRole("tabpanel");
    expect(panels[0]).toHaveAttribute("data-active", "true");
  });
});
