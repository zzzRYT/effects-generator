import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { AudioToneLab } from "@/components/audio-lab/AudioToneLab";

const player = vi.hoisted(() => ({
  durationMs: 180_000,
  currentTimeMs: 0,
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

  test("loads a YouTube URL and shows the point timeline with a default segment", () => {
    render(<AudioToneLab {...props} />);
    fillBase();
    expect(screen.getByTestId("youtube-player")).toBeInTheDocument();
    expect(screen.getByTestId("point-timeline")).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "구간 선택" })).toHaveAttribute(
      "aria-valuetext",
      "00:00–00:20",
    );
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
            variants: {
              A: {
                status: "projected",
                chain: [{ model: "UK 800" }],
                nullReason: null,
                canonical: { modelUsed: "DO NOT RENDER", sources: ["PRIVATE SOURCE"] },
              },
              B: { status: "projected", chain: [{ model: "US Deluxe" }], nullReason: null },
            },
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
    expect(document.body.textContent).not.toContain("canonical");
    expect(document.body.textContent).not.toContain("modelUsed");
    expect(document.body.textContent).not.toContain("DO NOT RENDER");
    expect(document.body.textContent).not.toContain("PRIVATE SOURCE");
  });

  test("requires six scores and preference, then reveals identities and allows another segment", async () => {
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
            variants: {
              A: { status: "projected", chain: [{ model: "UK 800" }], nullReason: null },
              B: { status: "projected", chain: [{ model: "US Deluxe" }], nullReason: null },
            },
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "exp-1",
            status: "evaluated",
            progress: {},
            variants: {
              A: { status: "projected", chain: [{ model: "UK 800" }], nullReason: null },
              B: { status: "projected", chain: [{ model: "US Deluxe" }], nullReason: null },
            },
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

    fireEvent.click(screen.getByRole("button", { name: "다른 구간 다시 보기" }));
    expect(screen.getByLabelText("아티스트")).toHaveValue("Oasis");
    expect(screen.getByTestId("point-timeline")).toBeInTheDocument();
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

  test("clears formError when restarting with a new segment after evaluation", async () => {
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
            variants: {
              A: { status: "projected", chain: [{ model: "UK 800" }], nullReason: null },
              B: { status: "projected", chain: [{ model: "US Deluxe" }], nullReason: null },
            },
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "exp-1",
            status: "evaluated",
            progress: {},
            variants: {
              A: { status: "projected", chain: [{ model: "UK 800" }], nullReason: null },
              B: { status: "projected", chain: [{ model: "US Deluxe" }], nullReason: null },
            },
            reveal: { A: "enriched", B: "baseline" },
            preferredVariant: "enriched",
          }),
        ),
      );
    render(<AudioToneLab {...props} />);

    // Try to load invalid URL to set formError
    fireEvent.change(screen.getByLabelText("YouTube URL"), {
      target: { value: "invalid-url" },
    });
    fireEvent.click(screen.getByRole("button", { name: "영상 불러오기" }));
    await screen.findByText("지원되는 YouTube URL을 입력하세요");

    // Now fill in valid data
    fillBase();
    fireEvent.click(screen.getByRole("button", { name: "A/B 분석 시작" }));
    await screen.findByRole("heading", { name: "익명 A/B 평가" });
    for (const label of ["A", "B"]) {
      for (const metric of ["논리적 정합성", "체인 타당성", "노브 실사용성"]) {
        fireEvent.change(screen.getByLabelText(`${label} ${metric}`), {
          target: { value: "4" },
        });
      }
    }
    fireEvent.click(screen.getByRole("radio", { name: "A 선호" }));
    fireEvent.click(screen.getByRole("button", { name: "평가 제출" }));
    await screen.findByRole("heading", { name: "평가 결과" });

    // Verify error message is gone after restart
    expect(screen.queryByText("지원되는 YouTube URL을 입력하세요")).not.toBeInTheDocument();

    // Click "다른 구간 다시 보기" and verify error is still cleared
    fireEvent.click(screen.getByRole("button", { name: "다른 구간 다시 보기" }));
    await waitFor(() => {
      expect(screen.getByLabelText("아티스트")).toBeEnabled();
    });
    expect(screen.queryByText("지원되는 YouTube URL을 입력하세요")).not.toBeInTheDocument();
  });

  test("blocks PointTimeline interaction while locked (polling/evaluating phases)", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ experimentId: "exp-1" }), { status: 202 }),
      );
    render(<AudioToneLab {...props} />);
    fillBase();

    // Get the initial segment value
    const slider = screen.getByRole("slider", { name: "구간 선택" });
    const initialValue = slider.getAttribute("aria-valuetext");

    // Start the experiment (transitions to submitting/polling)
    fireEvent.click(screen.getByRole("button", { name: "A/B 분석 시작" }));
    await screen.findByRole("status");

    // The slider should now be disabled
    expect(slider).toHaveAttribute("aria-disabled", "true");

    // Attempt to interact with the disabled slider (should be a no-op)
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(slider).toHaveAttribute("aria-valuetext", initialValue);
  });
});
