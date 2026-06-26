"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StrumLoader } from "./StrumLoader";
import styles from "./generate.module.css";

const POLL_MS = 2500;
const TIMEOUT_MS = 180_000; // 3분 — 그래도 안 끝나면 시간초과 안내.

// n8n 파이프라인 단계를 친근하게 순환 표시(실시간 동기 아님 — 진행 중임을 전달하는 안내).
const STAGES = ["톤 조사 중", "장비에 매핑", "패치 빌드", "사운드 검증"] as const;
const STAGE_MS = 2800;

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
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (error) return;
    const id = setInterval(
      () => setStage((s) => (s + 1) % STAGES.length),
      STAGE_MS,
    );
    return () => clearInterval(id);
  }, [error]);

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
      <StrumLoader />
      <p className={styles.progressText}>
        <strong>{artist}</strong> — {song}
      </p>
      <p className={styles.progressSub}>
        {/* 스크린리더용 안정 문장 1회 안내. 순환 단계는 시각 전용(2.8s 마다 재낭독 방지). */}
        <span className={styles.srOnly}>톤을 만드는 중이에요. 최대 1~2분 걸려요.</span>
        <span key={stage} className={styles.stage} aria-hidden="true">
          {STAGES[stage]}
        </span>
        <span className={styles.hint} aria-hidden="true">
          {" "}
          · 최대 1~2분
        </span>
      </p>
    </div>
  );
}
