import { describe, expect, test } from "vitest";
import type { ToneExperimentRow } from "../contracts";
import { assignBlind, toPublicExperiment } from "../blind";

function row(status: ToneExperimentRow["status"]): ToneExperimentRow {
  return {
    id: "exp-1",
    request: {},
    youtube_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    video_id: "dQw4w9WgXcQ",
    segments: [],
    model_used: "gemini-2.5-flash",
    prompt_version: "1",
    projector_version: "1",
    status,
    progress: { stage: status },
    audio_observations: null,
    baseline_result: { marker: "text result" },
    enriched_result: { marker: "audio result" },
    blind_assignment: { A: "enriched", B: "baseline" },
    evaluation: null,
    preferred_variant: null,
    failure_code: status === "failed" ? "provider:request_failed" : null,
    failure_detail: status === "failed" ? "secret provider detail" : null,
    created_at: "2026-07-11T00:00:00Z",
    updated_at: "2026-07-11T00:00:00Z",
    completed_at: null,
  };
}

describe("blind experiment projection", () => {
  test("supports deterministic injected A/B assignment", () => {
    expect(assignBlind(() => 0.1)).toEqual({ A: "baseline", B: "enriched" });
    expect(assignBlind(() => 0.9)).toEqual({ A: "enriched", B: "baseline" });
  });

  test("shows anonymous variants without mapping before evaluation", () => {
    const publicValue = toPublicExperiment(row("ready"), false);

    expect(publicValue).toMatchObject({
      id: "exp-1",
      status: "ready",
      variants: {
        A: { marker: "audio result" },
        B: { marker: "text result" },
      },
    });
    expect(JSON.stringify(publicValue)).not.toContain("blind_assignment");
    expect(JSON.stringify(publicValue)).not.toContain('"baseline"');
    expect(JSON.stringify(publicValue)).not.toContain('"enriched"');
  });

  test("reveals identities only for an evaluated experiment", () => {
    expect(toPublicExperiment(row("ready"), true)).not.toHaveProperty("reveal");
    expect(toPublicExperiment(row("evaluated"), true)).toMatchObject({
      reveal: { A: "enriched", B: "baseline" },
    });
  });

  test("never exposes internal failure detail", () => {
    const publicValue = toPublicExperiment(row("failed"), false);
    expect(publicValue).toMatchObject({
      status: "failed",
      failureCode: "provider:request_failed",
    });
    expect(JSON.stringify(publicValue)).not.toContain("secret provider detail");
  });
});
