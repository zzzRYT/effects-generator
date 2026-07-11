"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface YouTubePlayer {
  destroy(): void;
  getDuration(): number;
  pauseVideo(): void;
  playVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
}

interface YouTubePlayerConstructor {
  new (
    element: HTMLElement,
    options: {
      videoId: string;
      events: { onReady(event: { target: YouTubePlayer }): void };
    },
  ): YouTubePlayer;
}

declare global {
  interface Window {
    YT?: { Player: YouTubePlayerConstructor };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]',
    );
    if (existing) return;
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => reject(new Error("YouTube Player API 로드 실패"));
    document.head.appendChild(script);
  });
  return apiPromise;
}

export function useYouTubePlayer(videoId: string | null) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const loopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLoop = useCallback(() => {
    if (loopRef.current) clearTimeout(loopRef.current);
    loopRef.current = null;
  }, []);

  useEffect(() => {
    if (!container || !videoId) return;
    let active = true;
    let player: YouTubePlayer | null = null;
    void loadYouTubeApi().then(() => {
      if (!active || !window.YT?.Player) return;
      player = new window.YT.Player(container, {
        videoId,
        events: {
          onReady: (event) => {
            playerRef.current = event.target;
            setDurationMs(Math.round(event.target.getDuration() * 1_000));
          },
        },
      });
    });
    return () => {
      active = false;
      clearLoop();
      playerRef.current = null;
      player?.destroy();
    };
  }, [clearLoop, container, videoId]);

  const seekTo = useCallback((milliseconds: number) => {
    playerRef.current?.seekTo(milliseconds / 1_000, true);
  }, []);

  const stop = useCallback(() => {
    clearLoop();
    playerRef.current?.pauseVideo();
  }, [clearLoop]);

  const playRange = useCallback(
    (startMs: number, endMs: number) => {
      clearLoop();
      const player = playerRef.current;
      if (!player) return;
      player.seekTo(startMs / 1_000, true);
      player.playVideo();
      loopRef.current = setTimeout(() => player.pauseVideo(), endMs - startMs);
    },
    [clearLoop],
  );

  return {
    containerRef: setContainer,
    durationMs,
    seekTo,
    playRange,
    stop,
  };
}
