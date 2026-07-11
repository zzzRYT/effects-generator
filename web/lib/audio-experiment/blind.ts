import type {
  BlindAssignment,
  ExperimentVariant,
  PublicExperiment,
  ToneExperimentRow,
} from "./contracts";

export function assignBlind(random: () => number = Math.random): BlindAssignment {
  return random() < 0.5
    ? { A: "baseline", B: "enriched" }
    : { A: "enriched", B: "baseline" };
}

function resultFor(row: ToneExperimentRow, variant: ExperimentVariant): unknown {
  return variant === "baseline" ? row.baseline_result : row.enriched_result;
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
