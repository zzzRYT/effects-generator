import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { useYouTubePlayer } from "@/components/audio-lab/useYouTubePlayer";

const controls = {
  destroy: vi.fn(),
  pauseVideo: vi.fn(),
  playVideo: vi.fn(),
  seekTo: vi.fn(),
};
let currentTime = 0;

describe("useYouTubePlayer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    currentTime = 0;
    class Player {
      constructor(_element: HTMLElement, options: { events: { onReady(event: unknown): void } }) {
        options.events.onReady({ target: this });
      }
      destroy = controls.destroy;
      getCurrentTime() { return currentTime; }
      getDuration() { return 180; }
      pauseVideo = controls.pauseVideo;
      playVideo = controls.playVideo;
      seekTo = controls.seekTo;
    }
    Object.defineProperty(window, "YT", {
      value: { Player },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    delete window.YT;
  });

  test("creates a player, exposes duration and controls, then destroys it", async () => {
    const node = document.createElement("div");
    const { result, unmount } = renderHook(() => useYouTubePlayer("dQw4w9WgXcQ"));
    await act(async () => {
      result.current.containerRef(node);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.durationMs).toBe(180_000);

    act(() => result.current.seekTo(10_000));
    expect(controls.seekTo).toHaveBeenCalledWith(10, true);
    act(() => result.current.playRange(20_000, 25_000));
    expect(controls.seekTo).toHaveBeenLastCalledWith(20, true);
    expect(controls.playVideo).toHaveBeenCalledOnce();
    act(() => vi.advanceTimersByTime(5_000));
    expect(controls.pauseVideo).toHaveBeenCalledOnce();
    act(() => result.current.stop());
    expect(controls.pauseVideo).toHaveBeenCalledTimes(2);

    unmount();
    expect(controls.destroy).toHaveBeenCalledOnce();
  });

  test("polls current playback time while the player is ready", async () => {
    const node = document.createElement("div");
    const { result } = renderHook(() => useYouTubePlayer("dQw4w9WgXcQ"));
    await act(async () => {
      result.current.containerRef(node);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.currentTimeMs).toBe(0);
    currentTime = 12.4;
    act(() => vi.advanceTimersByTime(250));
    expect(result.current.currentTimeMs).toBe(12_400);
  });

  test("does nothing without a video or ready player", () => {
    const { result } = renderHook(() => useYouTubePlayer(null));
    act(() => {
      result.current.seekTo(1_000);
      result.current.playRange(0, 5_000);
      result.current.stop();
    });
    expect(controls.seekTo).not.toHaveBeenCalled();
    expect(controls.playVideo).not.toHaveBeenCalled();
  });
});
