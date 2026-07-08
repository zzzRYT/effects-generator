"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GEN_MAX, type GenerateErrors } from "@/lib/generate/validate";
import { decideAction, type GenerateApiResponse } from "@/lib/generate/decide-action";
import { GenProgress } from "./GenProgress";
import styles from "./generate.module.css";

interface GenerateFormProps {
  guitars?: Array<{ id: string; slug: string; brand: string; model: string }>;
  processors?: Array<{ id: string; slug: string; brand: string; model: string }>;
}

// 생성 폼 — 아티스트+곡+기타+이펙터 입력 → /api/generate.
// 캐시 히트면 연출 모드(GenProgress), 폴링이면 실시간 모드.
// 미등록 기어면 요청 폼으로 유도(프리필).
export function GenerateForm({ guitars = [], processors = [] }: GenerateFormProps) {
  const router = useRouter();
  const [artist, setArtist] = useState("");
  const [song, setSong] = useState("");
  const [guitar, setGuitar] = useState(guitars[0]?.model || ""); // 기타명 (선택 또는 직접 입력)
  const [guitarMode, setGuitarMode] = useState<"select" | "direct">("select"); // UI 모드
  const [processor, setProcessor] = useState(processors[0]?.model || ""); // 이펙터명 (선택 또는 직접 입력)
  const [processorMode, setProcessorMode] = useState<"select" | "direct">("select"); // UI 모드
  const [errors, setErrors] = useState<GenerateErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [stagedSlug, setStagedSlug] = useState<string | null>(null); // 캐시 히트 slug
  const [unresolvedGear, setUnresolvedGear] = useState<Array<{ kind: string; query: string }> | null>(null); // 미등록 기어
  const [submitting, setSubmitting] = useState(false);
  const honeypotRef = useRef<HTMLInputElement>(null); // 봇 트랩 — 숨김, 정상 사용자는 비움

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setErrors({});
    setFormError(null);
    setJobId(null);
    setStagedSlug(null);
    setUnresolvedGear(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artist,
          song,
          guitar, // 현재 입력/선택값 그대로 사용
          processor, // 현재 입력/선택값 그대로 사용
          botcheck: honeypotRef.current?.value ?? "",
        }),
      });

      const jsonData = await res.json();

      if (!res.ok) {
        // 실패 응답 — errors 또는 error 필드 확인
        if (jsonData.errors) setErrors(jsonData.errors as GenerateErrors);
        else setFormError(jsonData.error ?? "요청에 실패했어요");
        setSubmitting(false);
        return;
      }

      const data: GenerateApiResponse = jsonData;

      // decideAction으로 응답 분기
      const action = decideAction(data);

      if (action.type === "navigate" && action.slug) {
        // 즉시 이동 (캐시 히트지만 연출 먼저)
        router.push(`/songs/${action.slug}`);
        return;
      }

      if (action.type === "stage" && action.slug) {
        // 캐시 히트, 연출 모드로 진행
        setStagedSlug(action.slug);
        return;
      }

      if (action.type === "poll" && action.jobId) {
        // 실시간 폴링 모드
        setJobId(action.jobId);
        return;
      }

      if (action.type === "unresolved") {
        // 미등록 기어 → 요청 폼으로 유도
        setUnresolvedGear(action.unresolved || []);
        setSubmitting(false);
        return;
      }

      if (action.type === "error") {
        setFormError(action.message ?? "알 수 없는 오류가 발생했어요");
        setSubmitting(false);
        return;
      }

      setFormError("알 수 없는 응답이에요");
      setSubmitting(false);
    } catch {
      setFormError("네트워크 오류 — 잠시 후 다시 시도하세요");
      setSubmitting(false);
    }
  }

  // 진행 중 (폴링 또는 연출 모드)
  if (jobId || stagedSlug) {
    return (
      <GenProgress
        jobId={jobId || ""}
        artist={artist}
        song={song}
        stagedSlug={stagedSlug || undefined}
        onReset={() => {
          setJobId(null);
          setStagedSlug(null);
          setSubmitting(false);
        }}
      />
    );
  }

  // 미등록 기어 — 요청 폼 프리필 링크로 유도
  if (unresolvedGear && unresolvedGear.length > 0) {
    const gearList = unresolvedGear.map((g) => `${g.kind}: ${g.query}`).join(", ");
    const requestUrl = `/request?song=${encodeURIComponent(gearList)}`;
    return (
      <div className={styles.unresolved} role="alert">
        <p className={styles.unresolvedTitle}>지원 준비중이에요</p>
        <p className={styles.unresolvedDesc}>
          입력해주신 기어({gearList})는 아직 저희 라이브러리에 없어요.
        </p>
        <p className={styles.unresolvedCta}>
          <a href={requestUrl} className={styles.requestLink}>
            기어 추가 요청하기
          </a>
        </p>
        <button
          className={styles.backBtn}
          type="button"
          onClick={() => {
            setUnresolvedGear(null);
            setSubmitting(false);
          }}
        >
          돌아가기
        </button>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {/* 아티스트 */}
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

      {/* 곡 */}
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

      {/* 기타 선택 */}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="gen-guitar">
          기타
        </label>
        {guitarMode === "select" ? (
          <select
            id="gen-guitar"
            className={styles.input}
            value={guitar}
            onChange={(e) => {
              if (e.target.value === "__direct__") {
                setGuitarMode("direct");
                setGuitar("");
              } else {
                setGuitar(e.target.value);
              }
            }}
            aria-invalid={errors.guitar ? "true" : undefined}
            aria-describedby={errors.guitar ? "gen-guitar-err" : undefined}
          >
            <option value="">기타 선택...</option>
            {guitars.map((g) => (
              <option key={g.id} value={g.model}>
                {g.brand} {g.model}
              </option>
            ))}
            <option value="__direct__">직접 입력</option>
          </select>
        ) : (
          <>
            <input
              id="gen-guitar"
              className={styles.input}
              value={guitar}
              onChange={(e) => setGuitar(e.target.value)}
              placeholder="예: Fender Stratocaster"
              maxLength={GEN_MAX.guitar}
              autoComplete="off"
              aria-invalid={errors.guitar ? "true" : undefined}
              aria-describedby={errors.guitar ? "gen-guitar-err" : undefined}
            />
            <button
              type="button"
              className={styles.modeToggle}
              onClick={() => {
                setGuitarMode("select");
                setGuitar(guitars[0]?.model || "");
              }}
            >
              목록으로
            </button>
          </>
        )}
        {errors.guitar && (
          <p id="gen-guitar-err" className={styles.fieldErr}>
            {errors.guitar}
          </p>
        )}
      </div>

      {/* 멀티이펙터 선택 */}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="gen-processor">
          멀티이펙터
        </label>
        {processorMode === "select" ? (
          <select
            id="gen-processor"
            className={styles.input}
            value={processor}
            onChange={(e) => {
              if (e.target.value === "__direct__") {
                setProcessorMode("direct");
                setProcessor("");
              } else {
                setProcessor(e.target.value);
              }
            }}
            aria-invalid={errors.processor ? "true" : undefined}
            aria-describedby={errors.processor ? "gen-processor-err" : undefined}
          >
            <option value="">멀티이펙터 선택...</option>
            {processors.map((p) => (
              <option key={p.id} value={p.model}>
                {p.brand} {p.model}
              </option>
            ))}
            <option value="__direct__">직접 입력</option>
          </select>
        ) : (
          <>
            <input
              id="gen-processor"
              className={styles.input}
              value={processor}
              onChange={(e) => setProcessor(e.target.value)}
              placeholder="예: Boss GT-1"
              maxLength={GEN_MAX.processor}
              autoComplete="off"
              aria-invalid={errors.processor ? "true" : undefined}
              aria-describedby={errors.processor ? "gen-processor-err" : undefined}
            />
            <button
              type="button"
              className={styles.modeToggle}
              onClick={() => {
                setProcessorMode("select");
                setProcessor(processors[0]?.model || "");
              }}
            >
              목록으로
            </button>
          </>
        )}
        {errors.processor && (
          <p id="gen-processor-err" className={styles.fieldErr}>
            {errors.processor}
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
