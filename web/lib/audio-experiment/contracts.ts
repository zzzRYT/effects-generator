import type { AudioSegment } from "../pipeline/audio-observations";
import type { Block } from "../types";

export type ExperimentVariant = "baseline" | "enriched";
export type BlindLabel = "A" | "B";
export type BlindAssignment = Record<BlindLabel, ExperimentVariant>;
export type ExperimentStatus =
  | "queued"
  | "analyzing"
  | "generating"
  | "projecting"
  | "ready"
  | "failed"
  | "evaluated";

export interface ExperimentRequest {
  youtubeUrl: string;
  videoId: string;
  durationMs: number;
  segment: AudioSegment;
  artist: string;
  title: string;
  guitar: string;
  processor: string;
}

export interface VariantScores {
  logicalFit: number;
  signalChain: number;
  knobUsability: number;
}

export interface ExperimentEvaluation {
  scores: Record<BlindLabel, VariantScores>;
  preference: BlindLabel;
}

export interface ToneExperimentRow {
  id: string;
  request: unknown;
  youtube_url: string;
  video_id: string;
  segment: unknown;
  model_used: string;
  prompt_version: string;
  projector_version: string;
  status: ExperimentStatus;
  progress: unknown;
  audio_observations: unknown | null;
  baseline_result: unknown | null;
  enriched_result: unknown | null;
  blind_assignment: BlindAssignment | null;
  evaluation: ExperimentEvaluation | null;
  preferred_variant: ExperimentVariant | null;
  failure_code: string | null;
  failure_detail: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface PublicExperiment {
  id: string;
  status: ExperimentStatus;
  progress: unknown;
  variants?: Record<BlindLabel, PublicProjection>;
  failureCode?: string;
  reveal?: BlindAssignment;
  evaluation?: ExperimentEvaluation;
  preferredVariant?: ExperimentVariant;
}

export interface PublicProjection {
  status: string;
  chain: Block[] | null;
  nullReason: string | null;
}
