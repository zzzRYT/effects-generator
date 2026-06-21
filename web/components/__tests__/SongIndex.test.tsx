import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import type { Song } from "@/lib/types";
import { SongIndex } from "@/components/song-index/SongIndex";

// next/link → 단순 a, next/navigation → 가변 홀더(아일랜드 jsdom 구동).
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const nav = vi.hoisted(() => ({
  replace: vi.fn(),
  search: "",
  pathname: "/",
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(nav.search),
  useRouter: () => ({ replace: nav.replace }),
  usePathname: () => nav.pathname,
}));

function song(
  artist: string,
  title: string,
  rig: string,
  genre: string,
): Song {
  return {
    artist,
    title,
    rig,
    genre,
    slug: title.toLowerCase().replace(/\s+/g, "-"),
    variations: [
      { label: "v1", signalChain: [{ type: "AMP", model: "x", enabled: true, knobs: [] }] },
    ],
  };
}

const SONGS: Song[] = [
  song("Oasis", "Dont Look Back", "g250-gp150", "브릿팝"),
  song("Muse", "Time Is Running Out", "g250-gp150", "얼터너티브"),
  song("YB", "흰수염고래", "xt-450-gp150", "앤섬 발라드"),
];

beforeEach(() => {
  nav.replace.mockClear();
  nav.search = "";
});

describe("SongIndex — 정적 구조 (AC1, AC8)", () => {
  it("모든 곡 행을 data-* 와 함께 렌더(no-JS 폴백)", () => {
    render(<SongIndex songs={SONGS} />);
    const list = document.getElementById("song-list")!;
    const rows = list.querySelectorAll("[data-key]");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveAttribute("data-rig", "g250-gp150");
    expect(rows[0].getAttribute("data-search")).toContain("oasis");
    expect(rows[0].getAttribute("data-search")).toContain("브릿팝");
  });

  it("총 곡 수를 count(aria-live)에 렌더", () => {
    render(<SongIndex songs={SONGS} />);
    expect(document.getElementById("song-count")).toHaveTextContent("3곡");
  });

  it("빈상태는 기본 숨김", () => {
    render(<SongIndex songs={SONGS} />);
    expect(document.getElementById("song-empty")).not.toBeVisible();
  });

  it("genre 없는 곡도 crash 0 — data-search 는 제목으로 매칭", () => {
    const noGenre: Song = {
      ...song("Nirvana", "Lithium", "g250-gp150", ""),
      genre: undefined,
    };
    render(<SongIndex songs={[noGenre]} />);
    const row = document.querySelector("[data-key]")!;
    expect(row.getAttribute("data-search")).toContain("lithium");
    expect(row.getAttribute("data-search")).not.toContain("undefined");
  });
});

describe("SongIndex — rig 칩 (AC3, AC6)", () => {
  it("전체 + 유니크 rig 칩을 aria-pressed 와 함께 렌더", () => {
    render(<SongIndex songs={SONGS} />);
    expect(screen.getByRole("button", { name: "전체" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.getByRole("button", { name: "g250-gp150" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "xt-450-gp150" }),
    ).toBeInTheDocument();
  });

  it("rig 칩 클릭 → router.replace('/?rig=…')", () => {
    render(<SongIndex songs={SONGS} />);
    fireEvent.click(screen.getByRole("button", { name: "xt-450-gp150" }));
    expect(nav.replace).toHaveBeenCalledWith("/?rig=xt-450-gp150", {
      scroll: false,
    });
  });

  it("검색 입력 → router.replace('/?q=…')", () => {
    render(<SongIndex songs={SONGS} />);
    fireEvent.change(screen.getByRole("searchbox", { name: "곡 검색" }), {
      target: { value: "muse" },
    });
    expect(nav.replace).toHaveBeenCalledWith("/?q=muse", { scroll: false });
  });

  it("'전체' 칩 클릭 → rig 해제, 파라미터 없으면 URL 은 '/'", () => {
    nav.search = "rig=xt-450-gp150";
    render(<SongIndex songs={SONGS} />);
    fireEvent.click(screen.getByRole("button", { name: "전체" }));
    expect(nav.replace).toHaveBeenCalledWith("/", { scroll: false });
  });
});

describe("SongIndex — 아일랜드 필터 (AC2, AC4, AC5, AC7)", () => {
  it("?q=oasis → 매칭 행만 보이고 count 갱신", () => {
    nav.search = "q=oasis";
    render(<SongIndex songs={SONGS} />);
    const rows = document
      .getElementById("song-list")!
      .querySelectorAll<HTMLElement>("[data-key]");
    expect(rows[0]).toBeVisible(); // Oasis
    expect(rows[1]).not.toBeVisible(); // Muse
    expect(rows[2]).not.toBeVisible(); // YB
    expect(document.getElementById("song-count")).toHaveTextContent("1곡");
  });

  it("?rig=xt-450-gp150 → 해당 rig 곡만, 칩 aria-pressed", () => {
    nav.search = "rig=xt-450-gp150";
    render(<SongIndex songs={SONGS} />);
    const rows = document
      .getElementById("song-list")!
      .querySelectorAll<HTMLElement>("[data-key]");
    expect(rows[0]).not.toBeVisible();
    expect(rows[2]).toBeVisible();
    expect(
      screen.getByRole("button", { name: "xt-450-gp150" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "전체" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("q + rig AND 결합", () => {
    nav.search = "q=oasis&rig=xt-450-gp150"; // Oasis 는 g250 → 0 매칭
    render(<SongIndex songs={SONGS} />);
    expect(document.getElementById("song-count")).toHaveTextContent("0곡");
  });

  it("0 결과 → 빈상태 표시 (edge-3.6)", () => {
    nav.search = "q=zzzznomatch";
    render(<SongIndex songs={SONGS} />);
    expect(document.getElementById("song-count")).toHaveTextContent("0곡");
    const empty = document.getElementById("song-empty")!;
    expect(empty).toBeVisible();
    expect(
      within(empty).getByRole("link", { name: "필터 초기화" }),
    ).toHaveAttribute("href", "/");
  });
});
