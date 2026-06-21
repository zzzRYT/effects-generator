import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Song } from "@/lib/types";
import { SongDetail } from "@/components/song-detail/SongDetail";
import { TypeBadge } from "@/components/ui/TypeBadge";

// next/link 를 단순 a 로 모킹(jsdom).
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

// SongDetail → VariationTabs → VariationTabsClient(useSearchParams) 경로를 위한 모킹.
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/songs/g250-gp150/oasis-dont-look-back-in-anger",
}));

const song: Song = {
  artist: "Oasis",
  title: "Don't Look Back in Anger",
  rig: "g250-gp150",
  genre: "브릿팝",
  confidence: "높음",
  slug: "oasis-dont-look-back-in-anger",
  variations: [
    {
      label: "정석 JCM800",
      signalChain: [{ type: "AMP", model: "UK 800", enabled: true, knobs: [] }],
    },
    {
      label: "빈티지 Plexi",
      signalChain: [{ type: "AMP", model: "UK SLP", enabled: true, knobs: [] }],
    },
  ],
};

describe("SongDetail", () => {
  it("헤더(아티스트·제목·rig·장르·신뢰도)를 렌더한다", () => {
    render(<SongDetail song={song} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Don't Look Back in Anger",
    );
    expect(screen.getByText("Oasis")).toBeInTheDocument();
    expect(screen.getByText("g250-gp150")).toBeInTheDocument();
    expect(screen.getByText("브릿팝")).toBeInTheDocument();
    expect(screen.getByText(/높음/)).toBeInTheDocument();
  });

  it("모든 변주를 탭 + 패널로 렌더한다(2개 이상이면 탭바)", () => {
    render(<SongDetail song={song} />);
    // 패널 — 모든 변주 정적 렌더(no-JS 폴백). 접근명은 aria-labelledby(탭 라벨)가 제공.
    const panels = screen.getAllByRole("tabpanel");
    expect(panels).toHaveLength(2);
    // 탭바 — 변주 라벨이 탭으로
    expect(
      screen.getByRole("tab", { name: "정석 JCM800" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "빈티지 Plexi" })).toBeInTheDocument();
  });

  it("곡 목록 백링크가 있다 (키보드 접근 + 내비)", () => {
    render(<SongDetail song={song} />);
    const back = screen.getByRole("link", { name: /곡 목록/ });
    expect(back).toHaveAttribute("href", "/");
  });

  it("genre/confidence 없는 곡도 crash 0", () => {
    const minimal: Song = { ...song, genre: undefined, confidence: undefined };
    render(<SongDetail song={minimal} />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });
});

describe("TypeBadge", () => {
  it("타입 약어를 배경 토큰과 함께 렌더 (색만으로 의미 전달 금지)", () => {
    render(<TypeBadge type="DLY" />);
    const badge = screen.getByText("DLY");
    expect(badge).toBeInTheDocument();
    expect(badge.style.backgroundColor).toContain("--color-dly");
  });
});
