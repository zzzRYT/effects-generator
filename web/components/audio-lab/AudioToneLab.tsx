"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  BlindLabel,
  ExperimentEvaluation,
  PublicExperiment,
  PublicProjection,
} from "@/lib/audio-experiment/contracts";
import { normalizeYouTubeUrl } from "@/lib/audio-experiment/validate";
import { clampSegment } from "@/lib/audio-experiment/timeline";
import type { AudioRole, AudioSegment } from "@/lib/pipeline/audio-observations";
import { RoleRangeLane } from "./RoleRangeLane";
import { useYouTubePlayer } from "./useYouTubePlayer";
import styles from "./audio-tone-lab.module.css";

interface GearOption {
  id: string;
  slug: string;
  brand: string;
  model: string;
}

interface AudioToneLabProps {
  guitars: GearOption[];
  processors: GearOption[];
}

type Phase =
  | { type: "editing" }
  | { type: "submitting" }
  | { type: "polling"; experimentId: string; status: string }
  | { type: "evaluating"; experimentId: string; result: PublicExperiment }
  | { type: "revealed"; result: PublicExperiment }
  | { type: "failed"; message: string };

const ROLE_LABELS: Record<AudioRole, string> = {
  lead: "lead",
  backing: "backing",
  solo: "solo",
};
const METRICS = [
  ["logicalFit", "논리적 정합성"],
  ["signalChain", "체인 타당성"],
  ["knobUsability", "노브 실사용성"],
] as const;

function SettingsValue({ value }: { value: unknown }) {
  if (value === null || typeof value !== "object") {
    return <span>{String(value)}</span>;
  }
  if (Array.isArray(value)) {
    return (
      <ul>
        {value.map((item, index) => (
          <li key={index}><SettingsValue value={item} /></li>
        ))}
      </ul>
    );
  }
  return (
    <dl>
      {Object.entries(value as Record<string, unknown>).map(([key, item]) => (
        <div key={key}>
          <dt>{key}</dt>
          <dd><SettingsValue value={item} /></dd>
        </div>
      ))}
    </dl>
  );
}

function VariantSettings({ variant }: { variant: PublicProjection }) {
  return (
    <div>
      {variant.roles.map((role) => (
        <section key={role.role}>
          <h4>{role.role}</h4>
          {role.chain ? <SettingsValue value={role.chain} /> : <p>{role.nullReason ?? role.status}</p>}
        </section>
      ))}
    </div>
  );
}

function emptyScores(): Record<BlindLabel, Record<string, string>> {
  return {
    A: { logicalFit: "", signalChain: "", knobUsability: "" },
    B: { logicalFit: "", signalChain: "", knobUsability: "" },
  };
}

export function AudioToneLab({ guitars, processors }: AudioToneLabProps) {
  const [artist, setArtist] = useState("");
  const [title, setTitle] = useState("");
  const [guitar, setGuitar] = useState(guitars[0]?.model ?? "");
  const [processor, setProcessor] = useState(processors[0]?.model ?? "");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [segments, setSegments] = useState<AudioSegment[]>([
    { role: "lead", startMs: 0, endMs: 20_000 },
  ]);
  const [phase, setPhase] = useState<Phase>({ type: "editing" });
  const [scores, setScores] = useState(emptyScores);
  const [preference, setPreference] = useState<BlindLabel | null>(null);
  const {
    containerRef,
    durationMs,
    playRange,
  } = useYouTubePlayer(videoId);
  const pollingExperimentId =
    phase.type === "polling" ? phase.experimentId : null;
  const visibleSegments = useMemo(
    () => segments.map((segment) => clampSegment(segment, durationMs || 20_000)),
    [durationMs, segments],
  );
  const locked = phase.type !== "editing";

  useEffect(() => {
    if (!pollingExperimentId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const startedAt = Date.now();
    const id = pollingExperimentId;

    async function poll() {
      try {
        const response = await fetch(`/api/lab/audio-tone/experiments/${id}`, {
          cache: "no-store",
        });
        const result = (await response.json()) as PublicExperiment & { error?: string };
        if (!active) return;
        if (!response.ok) throw new Error(result.error ?? "실험 조회 실패");
        if (result.status === "ready") {
          setPhase({ type: "evaluating", experimentId: id, result });
          return;
        }
        if (result.status === "failed") {
          setPhase({ type: "failed", message: result.failureCode ?? "실험 실패" });
          return;
        }
        setPhase({ type: "polling", experimentId: id, status: result.status });
      } catch {
        // 일시적인 조회 실패는 제한 시간 안에서 재시도한다.
      }
      if (Date.now() - startedAt >= 180_000) {
        setPhase({ type: "failed", message: "실험 조회 시간 초과" });
        return;
      }
      timer = setTimeout(poll, 2_500);
    }
    void poll();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [pollingExperimentId]);

  function loadVideo() {
    setFormError(null);
    try {
      const normalized = normalizeYouTubeUrl(youtubeUrl);
      setYoutubeUrl(normalized.youtubeUrl);
      setVideoId(normalized.videoId);
    } catch {
      setVideoId(null);
      setFormError("지원되는 YouTube URL을 입력하세요");
    }
  }

  function toggleRole(role: AudioRole) {
    setSegments((current) => {
      const exists = current.some((segment) => segment.role === role);
      if (exists) return current.length === 1 ? current : current.filter((s) => s.role !== role);
      return [...current, { role, startMs: 0, endMs: Math.min(20_000, durationMs || 20_000) }];
    });
  }

  async function startExperiment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!videoId || durationMs < 5_000) {
      setFormError("영상을 먼저 불러오세요");
      return;
    }
    setFormError(null);
    setPhase({ type: "submitting" });
    try {
      const response = await fetch("/api/lab/audio-tone/experiments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artist,
          title,
          guitar,
          processor,
          youtubeUrl,
          durationMs,
          segments: visibleSegments,
        }),
      });
      const body = await response.json();
      if (!response.ok || typeof body.experimentId !== "string") {
        throw new Error(body.error ?? "실험 생성 실패");
      }
      setPhase({ type: "polling", experimentId: body.experimentId, status: "queued" });
    } catch (error) {
      setPhase({
        type: "failed",
        message: error instanceof Error ? error.message : "실험 생성 실패",
      });
    }
  }

  const evaluationValid =
    preference !== null &&
    (["A", "B"] as const).every((label) =>
      METRICS.every(([metric]) => scores[label][metric] !== ""),
    );

  async function submitEvaluation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phase.type !== "evaluating" || !preference || !evaluationValid) return;
    const evaluation: ExperimentEvaluation = {
      scores: {
        A: {
          logicalFit: Number(scores.A.logicalFit),
          signalChain: Number(scores.A.signalChain),
          knobUsability: Number(scores.A.knobUsability),
        },
        B: {
          logicalFit: Number(scores.B.logicalFit),
          signalChain: Number(scores.B.signalChain),
          knobUsability: Number(scores.B.knobUsability),
        },
      },
      preference,
    };
    try {
      const response = await fetch(
        `/api/lab/audio-tone/experiments/${phase.experimentId}/evaluation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(evaluation),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "평가 저장 실패");
      setPhase({ type: "revealed", result });
    } catch (error) {
      setPhase({
        type: "failed",
        message: error instanceof Error ? error.message : "평가 저장 실패",
      });
    }
  }

  if (phase.type === "failed") {
    return (
      <section className={styles.feedback} role="alert">
        <h2>실험을 완료하지 못했어요</h2>
        <p>{phase.message}</p>
        <button type="button" onClick={() => setPhase({ type: "editing" })}>다시 시도</button>
      </section>
    );
  }

  if (phase.type === "revealed") {
    return (
      <section className={styles.feedback}>
        <h2>평가 결과</h2>
        <p>A = {phase.result.reveal?.A}</p>
        <p>B = {phase.result.reveal?.B}</p>
        <p>선호 결과: {phase.result.preferredVariant}</p>
      </section>
    );
  }

  return (
    <div className={styles.lab}>
      <p className={styles.scopeNote}>
        이 실험은 설정의 타당성을 비교하며 실제 음향 유사도를 입증하지 않습니다.
      </p>
      <form className={styles.form} onSubmit={startExperiment}>
        <fieldset className={styles.inputPanel} disabled={locked}>
          <div className={styles.fieldGrid}>
            <label>아티스트<input required value={artist} onChange={(e) => setArtist(e.target.value)} /></label>
            <label>곡명<input required value={title} onChange={(e) => setTitle(e.target.value)} /></label>
            <label>기타<select value={guitar} onChange={(e) => setGuitar(e.target.value)}>{guitars.map((item) => <option key={item.id} value={item.model}>{item.brand} {item.model}</option>)}</select></label>
            <label>프로세서<select value={processor} onChange={(e) => setProcessor(e.target.value)}>{processors.map((item) => <option key={item.id} value={item.model}>{item.brand} {item.model}</option>)}</select></label>
          </div>
          <div className={styles.urlRow}>
            <label>YouTube URL<input required value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} /></label>
            <button type="button" onClick={loadVideo}>영상 불러오기</button>
          </div>
          {formError ? <p className={styles.error} role="alert">{formError}</p> : null}
          {videoId ? <div className={styles.player} ref={containerRef} data-testid="youtube-player" /> : null}
          <fieldset className={styles.roles}>
            <legend>분석 역할</legend>
            {(["lead", "backing", "solo"] as const).map((role) => (
              <label key={role}>
                <input type="checkbox" checked={segments.some((segment) => segment.role === role)} onChange={() => toggleRole(role)} />
                {ROLE_LABELS[role]} 활성화
              </label>
            ))}
          </fieldset>
          <div className={styles.lanes}>
            {visibleSegments.map((segment) => (
              <RoleRangeLane
                key={segment.role}
                segment={segment}
                durationMs={durationMs || 20_000}
                onChange={(next) => setSegments((current) => current.map((item) => item.role === next.role ? next : item))}
                onPreview={playRange}
              />
            ))}
          </div>
          <button className={styles.primary} type="submit">A/B 분석 시작</button>
        </fieldset>
      </form>

      {(phase.type === "submitting" || phase.type === "polling") ? (
        <section className={styles.progress} role="status" aria-live="polite">
          <h2>분석 진행 중</h2>
          <p>{phase.type === "submitting" ? "실험 생성" : phase.status}</p>
          <p>영상 확인 → 오디오 관측 → A/B 캐논 생성 → GP-150 투영</p>
        </section>
      ) : null}

      {phase.type === "evaluating" && phase.result.variants ? (
        <form className={styles.evaluation} onSubmit={submitEvaluation}>
          <h2>익명 A/B 평가</h2>
          <p>설정의 논리와 실사용성을 평가합니다. 실제 음향 유사도를 입증하지 않습니다.</p>
          <div className={styles.variantGrid}>
            {(["A", "B"] as const).map((label) => (
              <section key={label} className={styles.variant}>
                <h3>설정 {label}</h3>
                <VariantSettings variant={phase.result.variants![label]} />
                {METRICS.map(([metric, metricLabel]) => (
                  <label key={metric}>{label} {metricLabel}
                    <select aria-label={`${label} ${metricLabel}`} value={scores[label][metric]} onChange={(event) => setScores((current) => ({ ...current, [label]: { ...current[label], [metric]: event.target.value } }))}>
                      <option value="">선택</option>
                      {[1, 2, 3, 4, 5].map((score) => <option key={score} value={score}>{score}</option>)}
                    </select>
                  </label>
                ))}
                <label><input type="radio" name="preference" checked={preference === label} onChange={() => setPreference(label)} />{label} 선호</label>
              </section>
            ))}
          </div>
          <button className={styles.primary} type="submit" disabled={!evaluationValid}>평가 제출</button>
        </form>
      ) : null}
    </div>
  );
}
