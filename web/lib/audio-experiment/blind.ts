import type {
  BlindAssignment,
  ExperimentVariant,
  PublicProjection,
  PublicExperiment,
  ToneExperimentRow,
} from "./contracts";

export function assignBlind(random: () => number = Math.random): BlindAssignment {
  return random() < 0.5
    ? { A: "baseline", B: "enriched" }
    : { A: "enriched", B: "baseline" };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function publicKnob(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value) || typeof value.name !== "string" || typeof value.value !== "number") {
    return null;
  }
  return {
    name: value.name,
    value: value.value,
    ...(typeof value.unit === "string" ? { unit: value.unit } : {}),
    ...(value.scale === "0-10" || value.scale === "0-100" ? { scale: value.scale } : {}),
  };
}

function publicBlock(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value) || typeof value.type !== "string" || typeof value.model !== "string") {
    return null;
  }
  return {
    type: value.type,
    ...(typeof value.category === "string" ? { category: value.category } : {}),
    model: value.model,
    ...(typeof value.base_gear === "string" ? { base_gear: value.base_gear } : {}),
    enabled: value.enabled === true,
    ...(value.footswitch === "A" || value.footswitch === "B"
      ? { footswitch: value.footswitch }
      : {}),
    knobs: Array.isArray(value.knobs)
      ? value.knobs.map(publicKnob).filter((knob) => knob !== null)
      : [],
  };
}

function publicProjection(result: unknown): PublicProjection {
  if (!isRecord(result) || !isRecord(result.projection)) return { roles: [] };
  const roles = Array.isArray(result.projection.roles)
    ? result.projection.roles
    : [];
  return {
    roles: roles.flatMap((value) => {
      if (!isRecord(value) || typeof value.role !== "string" || typeof value.status !== "string") {
        return [];
      }
      return [{
        role: value.role,
        status: value.status,
        chain: Array.isArray(value.chain)
          ? value.chain.map(publicBlock).filter((block) => block !== null)
          : null,
        // Canon null reasons are model-authored and can reveal which branch used media.
        nullReason: null,
      }];
    }),
  } as PublicProjection;
}

function resultFor(row: ToneExperimentRow, variant: ExperimentVariant): PublicProjection {
  const result = variant === "baseline" ? row.baseline_result : row.enriched_result;
  return publicProjection(result);
}

export function toPublicExperiment(
  row: ToneExperimentRow,
  reveal: boolean,
): PublicExperiment {
  const result: PublicExperiment = {
    id: row.id,
    status: row.status,
    progress: row.progress,
  };

  if (
    (row.status === "ready" || row.status === "evaluated") &&
    row.blind_assignment
  ) {
    result.variants = {
      A: resultFor(row, row.blind_assignment.A),
      B: resultFor(row, row.blind_assignment.B),
    };
  }
  if (row.status === "failed" && row.failure_code) {
    result.failureCode = row.failure_code;
  }
  if (row.status === "evaluated" && reveal && row.blind_assignment) {
    result.reveal = row.blind_assignment;
    if (row.evaluation) result.evaluation = row.evaluation;
    if (row.preferred_variant) result.preferredVariant = row.preferred_variant;
  }
  return result;
}
