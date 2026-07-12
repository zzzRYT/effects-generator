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
    baseline_result: {
      canonical: {
        sources: ["secret baseline source"],
        modelUsed: "secret baseline model",
        rawResponseHash: "secret baseline hash",
      },
      projection: {
        roles: [{ role: "lead", status: "null", chain: null, nullReason: "문헌에서 파트를 확인할 수 없음", canonicalId: "secret-id" }],
      },
    },
    enriched_result: {
      canonical: {
        sources: ["secret enriched source"],
        modelUsed: "secret enriched model",
        rawResponseHash: "secret enriched hash",
      },
      projection: {
        roles: [{ role: "lead", status: "null", chain: null, nullReason: "오디오 관측에서 파트를 확인할 수 없음", sourceRole: "lead" }],
      },
    },
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
        A: { roles: [{ role: "lead", chain: null, nullReason: null }] },
        B: { roles: [{ role: "lead", chain: null, nullReason: null }] },
      },
    });
    const serialized = JSON.stringify(publicValue);
    expect(serialized).not.toContain("blind_assignment");
    expect(serialized).not.toContain('"baseline"');
    expect(serialized).not.toContain('"enriched"');
    expect(serialized).not.toContain("canonical");
    expect(serialized).not.toContain("sources");
    expect(serialized).not.toContain("modelUsed");
    expect(serialized).not.toContain("rawResponseHash");
    expect(serialized).not.toContain("canonicalId");
    expect(serialized).not.toContain("sourceRole");
    expect(serialized).not.toContain("오디오 관측");
    expect(serialized).not.toContain("문헌에서");
  });

  test("reveals identities only for an evaluated experiment", () => {
    expect(toPublicExperiment(row("ready"), true)).not.toHaveProperty("reveal");
    expect(toPublicExperiment(row("evaluated"), true)).toMatchObject({
      reveal: { A: "enriched", B: "baseline" },
    });
    expect(JSON.stringify(toPublicExperiment(row("evaluated"), true))).not.toContain(
      "secret enriched source",
    );
    expect(JSON.stringify(toPublicExperiment(row("evaluated"), true))).not.toContain(
      "오디오 관측",
    );
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
