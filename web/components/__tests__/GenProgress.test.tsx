import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { GenProgress } from "@/components/generate/GenProgress";
import { MIN_STAGED_MS } from "@/lib/generate/decide-action";

const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
vi.mock("@/components/generate/StrumLoader", () => ({ StrumLoader: () => <span>loader</span> }));

describe("GenProgress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => vi.useRealTimers());

  test("staged cache hit navigates after the minimum presentation", async () => {
    render(<GenProgress jobId="" artist="Oasis" song="Wonderwall" stagedSlug="oasis-wonderwall" onReset={vi.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent("Oasis");
    await act(async () => vi.advanceTimersByTimeAsync(MIN_STAGED_MS + 500));
    expect(navigation.push).toHaveBeenCalledWith("/songs/oasis-wonderwall");
  });

  test("polls running jobs then navigates when done", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "projecting" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "done", songSlug: "done-song" })));
    render(<GenProgress jobId="job-1" artist="A" song="S" onReset={vi.fn()} />);
    await act(async () => vi.advanceTimersByTimeAsync(2_500));
    expect(fetch).toHaveBeenCalledOnce();
    await act(async () => vi.advanceTimersByTimeAsync(2_500));
    expect(navigation.push).toHaveBeenCalledWith("/songs/done-song");
  });

  test("shows a retry for failed jobs", async () => {
    const onReset = vi.fn();
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: "failed", failureReason: "provider:request_failed" })),
    );
    render(<GenProgress jobId="job-1" artist="A" song="S" onReset={onReset} />);
    await act(async () => vi.advanceTimersByTimeAsync(2_500));
    expect(screen.getByRole("alert")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(onReset).toHaveBeenCalledOnce();
  });
});
