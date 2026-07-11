import { getLlmClient } from "../llm/client";
import { sbFetch, sbInsert, sbSelect } from "../supabase/rest";
import { analyzeSongMedia, type AudioObservation } from "../pipeline/audio-observations";
import {
  generateCanonDraft,
  type CanonDraftResult,
} from "../pipeline/canon-draft";
import { ensureSong } from "../pipeline/generate";
import { loadGrounding } from "../pipeline/grounding";
import {
  projectCanonDraft,
  type EffectsCatalog,
  type ProjectDraftResult,
} from "../pipeline/project-draft";
import { researchSong, type ResearchResult } from "../pipeline/research";
import type { ResolvedRequest } from "../pipeline/types";
import { assignBlind } from "./blind";
import type { ExperimentRequest, ExperimentStatus } from "./contracts";

export interface RunnerGenerateInput extends ExperimentRequest {
  research: ResearchResult;
  grounding: string;
  audioObservations?: AudioObservation[];
}

export interface RunnerDeps {
  ensureSong(
    request: ExperimentRequest,
    resolved: ResolvedRequest,
  ): Promise<string>;
  research(input: {
    songId: string;
    artist: string;
    title: string;
  }): Promise<ResearchResult>;
  grounding(): Promise<{ context: string }>;
  catalog(processorId: string): Promise<EffectsCatalog>;
  analyze(input: {
    youtubeUrl: string;
    segments: ExperimentRequest["segments"];
  }): Promise<AudioObservation[]>;
  generate(input: RunnerGenerateInput): Promise<CanonDraftResult>;
  project(
    canonical: CanonDraftResult["roles"],
    catalog: EffectsCatalog,
  ): ProjectDraftResult;
  update(
    id: string,
    status: ExperimentStatus,
    patch?: Record<string, unknown>,
  ): Promise<void>;
  ready(
    id: string,
    baseline: CanonDraftResult,
    enriched: CanonDraftResult,
    baselineProjection: ProjectDraftResult,
    enrichedProjection: ProjectDraftResult,
  ): Promise<void>;
  fail(id: string, code: string, detail: string): Promise<void>;
}

class ExperimentFailure extends Error {
  constructor(
    readonly code: string,
    cause: unknown,
  ) {
    super(cause instanceof Error ? cause.message : String(cause));
  }
}

function branchFailure(code: string, error: unknown): never {
  throw new ExperimentFailure(code, error);
}

function assertComparable(result: ProjectDraftResult, code: string): void {
  const skipped = result.roles.filter((role) => role.status === "skipped");
  if (skipped.length > 0) {
    throw new ExperimentFailure(
      code,
      skipped
        .map((role) => `${role.role}:${role.issues?.[0]?.message ?? "skipped"}`)
        .join("; "),
    );
  }
}

function classify(error: unknown): string {
  if (error instanceof ExperimentFailure) return error.code;
  if (error instanceof Error && error.message.startsWith("provider:")) {
    return error.message.split(/\s/, 1)[0];
  }
  return "experiment:failed";
}

export async function runToneExperiment(
  id: string,
  request: ExperimentRequest,
  resolved: ResolvedRequest,
  deps: RunnerDeps = createDefaultRunnerDeps(),
): Promise<void> {
  try {
    await deps.update(id, "analyzing");
    const songId =
      resolved.song.id ?? (await deps.ensureSong(request, resolved));
    const [research, grounding, catalog] = await Promise.all([
      deps.research({ songId, artist: request.artist, title: request.title }),
      deps.grounding(),
      deps.catalog(resolved.processor.id),
    ]);
    const audioObservations = await deps.analyze({
      youtubeUrl: request.youtubeUrl,
      segments: request.segments,
    });

    await deps.update(id, "generating", {
      audio_observations: audioObservations,
    });
    const shared = {
      ...request,
      research,
      grounding: grounding.context,
    };
    const [baseline, enriched] = await Promise.all([
      deps
        .generate({ ...shared, audioObservations: undefined })
        .catch((error) => branchFailure("baseline:generation_failed", error)),
      deps
        .generate({ ...shared, audioObservations })
        .catch((error) => branchFailure("enriched:generation_failed", error)),
    ]);

    await deps.update(id, "projecting");
    let baselineProjection: ProjectDraftResult;
    let enrichedProjection: ProjectDraftResult;
    try {
      baselineProjection = deps.project(baseline.roles, catalog);
      assertComparable(baselineProjection, "baseline:projection_failed");
    } catch (error) {
      if (error instanceof ExperimentFailure) throw error;
      return branchFailure("baseline:projection_failed", error);
    }
    try {
      enrichedProjection = deps.project(enriched.roles, catalog);
      assertComparable(enrichedProjection, "enriched:projection_failed");
    } catch (error) {
      if (error instanceof ExperimentFailure) throw error;
      return branchFailure("enriched:projection_failed", error);
    }

    await deps.ready(
      id,
      baseline,
      enriched,
      baselineProjection,
      enrichedProjection,
    );
  } catch (error) {
    await deps.fail(
      id,
      classify(error),
      error instanceof Error ? error.message : String(error),
    );
  }
}

async function patchExperiment(
  id: string,
  body: Record<string, unknown>,
): Promise<void> {
  await sbFetch(`tone_experiments?id=eq.${encodeURIComponent(id)}`, {
    admin: true,
    method: "PATCH",
    body,
  });
}

export function createDefaultRunnerDeps(): RunnerDeps {
  const llm = getLlmClient();
  const model = process.env.LLM_MODEL ?? "gemini-2.5-flash";
  return {
    ensureSong: (request, resolved) =>
      ensureSong(request, resolved, sbInsert),
    research: (input) =>
      researchSong(input, {
        llm,
        select: sbSelect,
        insert: sbInsert,
        model,
      }),
    grounding: () => loadGrounding({ select: sbSelect }),
    async catalog(processorId) {
      const rows = await sbSelect<{ effects_catalog: unknown }>(
        "processors",
        `id=eq.${encodeURIComponent(processorId)}&select=effects_catalog`,
      );
      const catalog = rows[0]?.effects_catalog as EffectsCatalog | undefined;
      if (!catalog || !Array.isArray(catalog.entries)) {
        throw new Error("projection:catalog_missing");
      }
      return catalog;
    },
    analyze: (input) => analyzeSongMedia(input, llm),
    generate: (input) =>
      generateCanonDraft(
        {
          artist: input.artist,
          title: input.title,
          research: input.research.notes,
          grounding: input.grounding,
          audioObservations: input.audioObservations,
        },
        { llm, model },
      ),
    project: (roles, catalog) =>
      projectCanonDraft(
        roles.map((role) => ({
          role: role.role,
          status: role.status,
          chain: role.chain,
          nullReason: role.nullReason,
          issues: role.issues,
        })),
        catalog,
      ),
    update: (experimentId, status, patch = {}) =>
      patchExperiment(experimentId, {
        status,
        progress: { stage: status },
        ...patch,
      }),
    ready: (
      experimentId,
      baseline,
      enriched,
      baselineProjection,
      enrichedProjection,
    ) =>
      patchExperiment(experimentId, {
        status: "ready",
        progress: { stage: "ready" },
        baseline_result: { canonical: baseline, projection: baselineProjection },
        enriched_result: { canonical: enriched, projection: enrichedProjection },
        blind_assignment: assignBlind(),
        completed_at: new Date().toISOString(),
      }),
    fail: (experimentId, code, detail) =>
      patchExperiment(experimentId, {
        status: "failed",
        progress: { stage: "failed" },
        failure_code: code,
        failure_detail: detail,
        baseline_result: null,
        enriched_result: null,
        completed_at: new Date().toISOString(),
      }),
  };
}
