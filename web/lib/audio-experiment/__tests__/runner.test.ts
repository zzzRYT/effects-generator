import { describe, expect, test, vi } from "vitest";
import type { CanonDraftResult } from "../../pipeline/canon-draft";
import type { ProjectDraftResult } from "../../pipeline/project-draft";
import type { ResolvedRequest } from "../../pipeline/types";
import type { ExperimentRequest } from "../contracts";
import { runToneExperiment, type RunnerDeps } from "../runner";

const REQUEST: ExperimentRequest = {
  youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  videoId: "dQw4w9WgXcQ",
  durationMs: 180_000,
  segments: [{ role: "lead", startMs: 10_000, endMs: 30_000 }],
  artist: "Oasis",
  title: "Wonderwall",
  guitar: "Cort G250",
  processor: "Valeton GP-150",
};

const RESOLVED: ResolvedRequest = {
  song: { id: "song-1", artist_norm: "oasis", title_norm: "wonderwall" },
  guitar: { id: "g1", slug: "cort-g250", body_archetype: "superstrat" },
  processor: { id: "p1", slug: "valeton-gp-150" },
};

const OBSERVATIONS = [
  {
    role: "lead" as const,
    startMs: 10_000,
    endMs: 30_000,
    gain: "crunch" as const,
    brightness: "balanced" as const,
    compression: "medium" as const,
    effects: [],
    notes: "관측",
    confidence: 0.8,
  },
];

const CANON: CanonDraftResult = {
  modelUsed: "gemini-2.5-flash",
  rawResponseHash: "fixture-hash",
  sources: [],
  roles: [
    {
      role: "lead",
      status: "null",
      chain: null,
      nullReason: "fixture",
      confidence: 0.5,
    },
    {
      role: "backing",
      status: "null",
      chain: null,
      nullReason: "fixture",
      confidence: 0.5,
    },
    {
      role: "solo",
      status: "null",
      chain: null,
      nullReason: "fixture",
      confidence: 0.5,
    },
  ],
};

const PROJECTED: ProjectDraftResult = {
  roles: ["lead", "backing", "solo", "real_amp", "phone"].map((role) => ({
    role: role as ProjectDraftResult["roles"][number]["role"],
    status: "projected" as const,
    chain: [],
    nullReason: null,
  })),
};

function dependencies(overrides: Partial<RunnerDeps> = {}) {
  const events: string[] = [];
  const deps: RunnerDeps = {
    ensureSong: vi.fn(async () => "song-new"),
    research: vi.fn(async () => ({
      notes: { notes: "same research" },
      modelUsed: "gemini-2.5-flash",
      cached: true,
    })),
    grounding: vi.fn(async () => ({ context: "same grounding" })),
    catalog: vi.fn(async () => ({ entries: [] })),
    analyze: vi.fn(async () => OBSERVATIONS),
    generate: vi.fn(async () => CANON),
    project: vi.fn(() => PROJECTED),
    update: vi.fn(async (_id, status) => {
      events.push(status);
    }),
    ready: vi.fn(async () => {
      events.push("ready");
    }),
    fail: vi.fn(async () => {
      events.push("failed");
    }),
    ...overrides,
  };
  return { deps, events };
}

describe("runToneExperiment", () => {
  test("runs one analysis and a controlled paired generation to ready", async () => {
    const { deps, events } = dependencies();

    await runToneExperiment("exp-1", REQUEST, RESOLVED, deps);

    expect(events).toEqual(["analyzing", "generating", "projecting", "ready"]);
    expect(deps.analyze).toHaveBeenCalledOnce();
    expect(deps.generate).toHaveBeenCalledTimes(2);
    const [baseline, enriched] = vi.mocked(deps.generate).mock.calls.map(
      ([call]) => call,
    );
    expect({ ...enriched, audioObservations: undefined }).toEqual(baseline);
    expect(baseline.audioObservations).toBeUndefined();
    expect(enriched.audioObservations).toEqual(OBSERVATIONS);
    expect(deps.ready).toHaveBeenCalledOnce();
    expect(deps.fail).not.toHaveBeenCalled();
  });

  test("uses the existing song without writing a songs row", async () => {
    const { deps } = dependencies();
    await runToneExperiment("exp-1", REQUEST, RESOLVED, deps);
    expect(deps.ensureSong).not.toHaveBeenCalled();
  });

  test("fails atomically when either generation branch fails", async () => {
    let call = 0;
    const { deps, events } = dependencies({
      generate: vi.fn(async () => {
        call += 1;
        if (call === 2) throw new Error("provider exploded");
        return CANON;
      }),
    });

    await runToneExperiment("exp-1", REQUEST, RESOLVED, deps);

    expect(events).toEqual(["analyzing", "generating", "failed"]);
    expect(deps.ready).not.toHaveBeenCalled();
    expect(deps.project).not.toHaveBeenCalled();
    expect(deps.fail).toHaveBeenCalledWith(
      "exp-1",
      "enriched:generation_failed",
      expect.stringContaining("provider exploded"),
    );
  });

  test("preserves explicit unsupported-video provider failures", async () => {
    const { deps } = dependencies({
      analyze: vi.fn(async () => {
        throw new Error("provider:video_unsupported");
      }),
    });

    await runToneExperiment("exp-1", REQUEST, RESOLVED, deps);

    expect(deps.fail).toHaveBeenCalledWith(
      "exp-1",
      "provider:video_unsupported",
      "provider:video_unsupported",
    );
  });

  test("classifies only an explicit unavailable-video marker as unavailable", async () => {
    const { deps } = dependencies({
      analyze: vi.fn(async () => {
        throw new Error("provider:video_unavailable private or deleted");
      }),
    });

    await runToneExperiment("exp-1", REQUEST, RESOLVED, deps);

    expect(deps.fail).toHaveBeenCalledWith(
      "exp-1",
      "media:video_unavailable",
      "provider:video_unavailable private or deleted",
    );
  });

  test("does not infer video unavailability from generic provider HTTP errors", async () => {
    const { deps } = dependencies({
      analyze: vi.fn(async () => {
        throw new Error("LLM 404: upstream request failed");
      }),
    });

    await runToneExperiment("exp-1", REQUEST, RESOLVED, deps);

    expect(deps.fail).toHaveBeenCalledWith(
      "exp-1",
      "media:analysis_failed",
      "LLM 404: upstream request failed",
    );
  });

  test("classifies media parsing failures stably", async () => {
    const { deps } = dependencies({
      analyze: vi.fn(async () => {
        throw new Error("audio_observations:invalid");
      }),
    });

    await runToneExperiment("exp-1", REQUEST, RESOLVED, deps);

    expect(deps.fail).toHaveBeenCalledWith(
      "exp-1",
      "media:analysis_failed",
      "audio_observations:invalid",
    );
  });

  test("fails the whole experiment on either projection failure", async () => {
    const failedProjection: ProjectDraftResult = {
      roles: PROJECTED.roles.map((role, index) =>
        index === 0 ? { ...role, status: "skipped" as const } : role,
      ),
    };
    const { deps } = dependencies({
      project: vi
        .fn()
        .mockReturnValueOnce(PROJECTED)
        .mockReturnValueOnce(failedProjection),
    });

    await runToneExperiment("exp-1", REQUEST, RESOLVED, deps);

    expect(deps.ready).not.toHaveBeenCalled();
    expect(deps.fail).toHaveBeenCalledWith(
      "exp-1",
      "enriched:projection_failed",
      expect.any(String),
    );
  });
});
