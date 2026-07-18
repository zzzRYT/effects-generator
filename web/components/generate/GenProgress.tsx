"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { decideJobAction, shouldNavigateFromStaged, type JobStatusResponse } from "@/lib/generate/decide-action";
import { StrumLoader } from "./StrumLoader";
import styles from "./generate.module.css";

const POLL_MS = 2500;
const TIMEOUT_MS = 180_000; // 3분 — 그래도 안 끝나면 시간초과 안내.
const STAGE_MS = 2800; // 단계 순환 주기(밀리초)

interface GenProgressProps {
  jobId: string;
  artist: string;
  song: string;
  onReset: () => void;
  /** 캐시 히트 시 연출 모드용 slug (optional, GenerateForm에서 전달) */
  stagedSlug?: string;
}

// 생성 진행 — /api/jobs/[id] 폴링. done/ready 면 상세로 이동, failed/timeout 이면 안내 + 재시도.
// 캐시 히트(stagedSlug)면 연출 모드: MIN_STAGED_MS 동안 단계 순환 후 네비게이션.
export function GenProgress({ jobId, artist, song, onReset, stagedSlug }: GenProgressProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [stageIndex, setStageIndex] = useState(0);
  const [statusLabels, setStatusLabels] = useState<string[]>([]);

  // 단계 순환 타이머 (모든 모드에서 사용)
  useEffect(() => {
    if (error) return;
    const id = setInterval(() => {
      setStageIndex((s) => (s + 1) % (statusLabels.length || 1));
    }, STAGE_MS);
    return () => clearInterval(id);
  }, [error, statusLabels.length]);

  // 연출 모드 (캐시 히트) — MIN_STAGED_MS 후 네비게이션
  useEffect(() => {
    if (!stagedSlug) return; // 폴링 모드로 진행

    let active = true;
    const startedAt = Date.now();

    const timer = setInterval(() => {
      if (!active) return;
      const elapsed = Date.now() - startedAt;
      if (shouldNavigateFromStaged(elapsed)) {
        if (active) {
          router.push(`/songs/${stagedSlug}`);
        }
      }
    }, 500);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [stagedSlug, router]);

  // 폴링 모드 (stagedSlug 없음) — 실시간 /api/jobs/[id] 조회
  useEffect(() => {
    if (stagedSlug) return; // 연출 모드

    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();

    async function poll() {
      if (!active) return;
      try {
        const res = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
        const data: JobStatusResponse = await res.json();
        if (!active) return;

        const action = decideJobAction(data);

        if (action.type === "navigate" && action.slug) {
          router.push(`/songs/${action.slug}`);
          return;
        }

        if (action.type === "error") {
          setError(action.message ?? "생성에 실패했어요");
          return;
        }

        if (action.type === "poll") {
          // 진행 중 — 레이블 업데이트하고 계속 폴링
          setStatusLabels(action.labels || []);
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
  }, [jobId, router, stagedSlug]);

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

  // 표시할 단계 문구 (연출 모드 또는 폴링 모드의 실시간 레이블)
  const currentLabel =
    statusLabels.length > 0
      ? statusLabels[stageIndex % statusLabels.length]
      : "톤을 만드는 중...";

  return (
    <div className={styles.progress} role="status" aria-live="polite">
      <StrumLoader />
      <p className={styles.progressText}>
        <strong>{artist}</strong> — {song}
      </p>
      <p className={styles.progressSub}>
        {/* 스크린리더용 안정 문장 1회 안내. 순환 단계는 시각 전용(2.8s 마다 재낭독 방지). */}
        <span className={styles.srOnly}>톤을 만드는 중이에요. 최대 1~2분 걸려요.</span>
        <span key={stageIndex} className={styles.stage} aria-hidden="true">
          {currentLabel}
        </span>
        <span className={styles.hint} aria-hidden="true">
          {" "}
          · 최대 1~2분
        </span>
      </p>
    </div>
  );
}
