"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GEN_MAX, type GenerateErrors } from "@/lib/generate/validate";
import { GenProgress } from "./GenProgress";
import styles from "./generate.module.css";

// 생성 폼 — 아티스트+곡 입력 → /api/generate. 캐시 히트면 즉시 상세 이동, 미스면 진행 폴링(GenProgress).
export function GenerateForm() {
  const router = useRouter();
  const [artist, setArtist] = useState("");
  const [song, setSong] = useState("");
  const [errors, setErrors] = useState<GenerateErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const honeypotRef = useRef<HTMLInputElement>(null); // 봇 트랩 — 숨김, 정상 사용자는 비움

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setErrors({});
    setFormError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artist,
          song,
          botcheck: honeypotRef.current?.value ?? "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.errors) setErrors(data.errors as GenerateErrors);
        else setFormError(data.error ?? "요청에 실패했어요");
        setSubmitting(false);
        return;
      }
      if (data.status === "ready" && data.slug) {
        router.push(`/songs/${data.slug}`);
        return; // submitting 유지 — 페이지 전환
      }
      if (data.status === "pending" && data.jobId) {
        setJobId(data.jobId); // 진행 화면으로
        return;
      }
      setFormError("알 수 없는 응답이에요");
      setSubmitting(false);
    } catch {
      setFormError("네트워크 오류 — 잠시 후 다시 시도하세요");
      setSubmitting(false);
    }
  }

  if (jobId) {
    return (
      <GenProgress
        jobId={jobId}
        artist={artist}
        song={song}
        onReset={() => {
          setJobId(null);
          setSubmitting(false);
        }}
      />
    );
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="gen-artist">
          아티스트
        </label>
        <input
          id="gen-artist"
          className={styles.input}
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          placeholder="예: Oasis"
          maxLength={GEN_MAX.artist}
          autoComplete="off"
          aria-invalid={errors.artist ? "true" : undefined}
          aria-describedby={errors.artist ? "gen-artist-err" : undefined}
        />
        {errors.artist && (
          <p id="gen-artist-err" className={styles.fieldErr}>
            {errors.artist}
          </p>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="gen-song">
          곡 이름
        </label>
        <input
          id="gen-song"
          className={styles.input}
          value={song}
          onChange={(e) => setSong(e.target.value)}
          placeholder="예: Don't Look Back in Anger"
          maxLength={GEN_MAX.song}
          autoComplete="off"
          aria-invalid={errors.song ? "true" : undefined}
          aria-describedby={errors.song ? "gen-song-err" : undefined}
        />
        {errors.song && (
          <p id="gen-song-err" className={styles.fieldErr}>
            {errors.song}
          </p>
        )}
      </div>

      {/* 허니팟 — 화면 밖 숨김. 봇이 채우면 서버가 거부. aria-hidden + tabIndex -1 로 보조기술/키보드 제외. */}
      <input
        ref={honeypotRef}
        type="text"
        name="botcheck"
        className={styles.honeypot}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      {formError && (
        <p className={styles.formErr} role="alert">
          {formError}
        </p>
      )}

      <button className={styles.submit} type="submit" disabled={submitting}>
        {submitting ? "생성 중…" : "톤 생성"}
      </button>
    </form>
  );
}
