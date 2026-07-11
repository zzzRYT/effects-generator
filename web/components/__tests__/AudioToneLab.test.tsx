import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { AudioToneLab } from "@/components/audio-lab/AudioToneLab";

const player = vi.hoisted(() => ({
  durationMs: 180_000,
  playRange: vi.fn(),
  seekTo: vi.fn(),
  stop: vi.fn(),
  containerRef: vi.fn(),
}));

vi.mock("@/components/audio-lab/useYouTubePlayer", () => ({
  useYouTubePlayer: () => player,
}));

const props = {
  guitars: [{ id: "g1", slug: "cort-g250", brand: "Cort", model: "G250" }],
  processors: [
    { id: "p1", slug: "valeton-gp150", brand: "Valeton", model: "GP-150" },
  ],
};

function fillBase() {
  fireEvent.change(screen.getByLabelText("아티스트"), {
    target: { value: "Oasis" },
  });
  fireEvent.change(screen.getByLabelText("곡명"), {
    target: { value: "Wonderwall" },
  });
  fireEvent.change(screen.getByLabelText("YouTube URL"), {
    target: { value: "https://youtu.be/dQw4w9WgXcQ" },
  });
  fireEvent.click(screen.getByRole("button", { name: "영상 불러오기" }));
}

describe("AudioToneLab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  test("loads a YouTube URL and allows one to three role lanes", () => {
    render(<AudioToneLab {...props} />);
    fillBase();
    expect(screen.getByTestId("youtube-player")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "lead" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: "backing 활성화" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "solo 활성화" }));
    expect(screen.getByRole("group", { name: "backing" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "solo" })).toBeInTheDocument();
  });

  test("locks inputs while polling and shows anonymous A/B settings", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ experimentId: "exp-1" }), { status: 202 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "exp-1",
            status: "ready",
            progress: { stage: "ready" },
            variants: { A: { amp: "UK 800" }, B: { amp: "US Deluxe" } },
          }),
        ),
      );
    render(<AudioToneLab {...props} />);
    fillBase();
    fireEvent.click(screen.getByRole("button", { name: "A/B 분석 시작" }));

    expect(screen.getByLabelText("아티스트")).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("분석");
    await screen.findByRole("heading", { name: "익명 A/B 평가" });
    expect(screen.getByText("UK 800")).toBeInTheDocument();
    expect(screen.getByText("US Deluxe")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("baseline");
    expect(document.body.textContent).not.toContain("enriched");
  });

  test("requires six scores and preference, then reveals identities", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ experimentId: "exp-1" }), { status: 202 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "exp-1",
            status: "ready",
            progress: {},
            variants: { A: { amp: "UK 800" }, B: { amp: "US Deluxe" } },
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "exp-1",
            status: "evaluated",
            progress: {},
            variants: { A: { amp: "UK 800" }, B: { amp: "US Deluxe" } },
            reveal: { A: "enriched", B: "baseline" },
            preferredVariant: "enriched",
          }),
        ),
      );
    render(<AudioToneLab {...props} />);
    fillBase();
    fireEvent.click(screen.getByRole("button", { name: "A/B 분석 시작" }));
    await screen.findByRole("heading", { name: "익명 A/B 평가" });

    const submit = screen.getByRole("button", { name: "평가 제출" });
    expect(submit).toBeDisabled();
    for (const label of ["A", "B"]) {
      for (const metric of ["논리적 정합성", "체인 타당성", "노브 실사용성"]) {
        fireEvent.change(screen.getByLabelText(`${label} ${metric}`), {
          target: { value: "4" },
        });
      }
    }
    fireEvent.click(screen.getByRole("radio", { name: "A 선호" }));
    expect(submit).toBeEnabled();
    fireEvent.click(submit);

    await screen.findByRole("heading", { name: "평가 결과" });
    expect(screen.getByText(/A = enriched/)).toBeInTheDocument();
  });

  test("shows a retry after failure and avoids acoustic-similarity claims", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ experimentId: "exp-1" }), { status: 202 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "exp-1",
            status: "failed",
            progress: {},
            failureCode: "provider:request_failed",
          }),
        ),
      );
    render(<AudioToneLab {...props} />);
    fillBase();
    expect(screen.getByText(/실제 음향 유사도를 입증하지 않습니다/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "A/B 분석 시작" }));
    await screen.findByRole("button", { name: "다시 시도" });
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    await waitFor(() => expect(screen.getByLabelText("아티스트")).toBeEnabled());
  });
});
