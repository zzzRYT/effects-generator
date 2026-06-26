"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./generate.module.css";

const POLL_MS = 2500;
const TIMEOUT_MS = 180_000; // 3분 — 그래도 안 끝나면 시간초과 안내.

interface GenProgressProps {
  jobId: string;
  artist: string;
  song: string;
  onReset: () => void;
}

// 생성 진행 — /api/jobs/[id] 폴링. ready 면 상세로 이동, failed/timeout 이면 안내 + 재시도.
export function GenProgress({ jobId, artist, song, onReset }: GenProgressProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();

    async function poll() {
      if (!active) return;
      try {
        const res = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
        const data = await res.json();
        if (!active) return;
        if (data.status === "ready" && data.slug) {
          router.push(`/songs/${data.slug}`);
          return;
        }
        if (data.status === "failed") {
          setError(data.error ?? "생성에 실패했어요");
          return;
        }
      } catch {
        // 일시 오류 — 계속 폴링.
      }
      if (Date.now() - startedAt > TIMEOUT_MS) {
        setError("시간이 오래 걸리고 있어요 — 잠시 후 다시 시도해 주세요");
        return;
      }
      timer = setTimeout(poll, POLL_MS);
    }

    timer = setTimeout(poll, POLL_MS);
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [jobId, router]);

  if (error) {
    return (
      <div className={styles.progress} role="alert">
        <p className={styles.progressErr}>{error}</p>
        <button className={styles.retry} type="button" onClick={onReset}>
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className={styles.progress} role="status" aria-live="polite">
      <div className={styles.spinner} aria-hidden="true" />
      <p className={styles.progressText}>
        <strong>{artist}</strong> — {song}
      </p>
      <p className={styles.progressSub}>톤을 조사하고 패치를 만드는 중… (최대 1~2분)</p>
    </div>
  );
}
