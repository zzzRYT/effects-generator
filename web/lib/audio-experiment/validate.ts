import type { AudioSegment } from "../pipeline/audio-observations";
import type {
  ExperimentEvaluation,
  ExperimentRequest,
  VariantScores,
} from "./contracts";

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const MIN_SEGMENT_MS = 5_000;
const MAX_SEGMENT_MS = 60_000;
const MAX_TEXT = 100;

function fail(code: string): never {
  throw new Error(code);
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function requiredText(value: unknown): string {
  if (typeof value !== "string") return fail("input:invalid_request");
  const normalized = value.trim();
  if (!normalized || normalized.length > MAX_TEXT) {
    return fail("input:invalid_request");
  }
  return normalized;
}

export function normalizeYouTubeUrl(value: unknown): {
  youtubeUrl: string;
  videoId: string;
} {
  if (typeof value !== "string") return fail("input:invalid_youtube_url");
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return fail("input:invalid_youtube_url");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return fail("input:invalid_youtube_url");
  }

  const hostname = url.hostname.toLowerCase().replace(/^(www\.|m\.)/, "");
  let videoId: string | null = null;
  if (hostname === "youtu.be") {
    videoId = url.pathname.split("/").filter(Boolean)[0] ?? null;
  } else if (hostname === "youtube.com") {
    if (url.pathname === "/watch") videoId = url.searchParams.get("v");
    else if (url.pathname.startsWith("/shorts/")) {
      videoId = url.pathname.split("/").filter(Boolean)[1] ?? null;
    }
  }

  if (!videoId || !VIDEO_ID.test(videoId)) {
    return fail("input:invalid_youtube_url");
  }
  return {
    youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
    videoId,
  };
}

function parseSegment(value: unknown, durationMs: number): AudioSegment {
  const source = record(value);
  if (!source) return fail("input:invalid_segment");
  const { startMs, endMs } = source;
  if (!Number.isInteger(startMs) || !Number.isInteger(endMs)) {
    return fail("input:invalid_segment");
  }
  const start = startMs as number;
  const end = endMs as number;
  const length = end - start;
  if (
    start < 0 ||
    end <= start ||
    length < MIN_SEGMENT_MS ||
    length > MAX_SEGMENT_MS ||
    end > durationMs
  ) {
    return fail("input:invalid_segment");
  }
  return { startMs: start, endMs: end };
}

export function validateExperimentInput(value: unknown): ExperimentRequest {
  const input = record(value);
  if (!input) return fail("input:invalid_request");
  if (!Number.isInteger(input.durationMs) || (input.durationMs as number) <= 0) {
    return fail("input:invalid_segment");
  }
  const youtube = normalizeYouTubeUrl(input.youtubeUrl);
  return {
    ...youtube,
    durationMs: input.durationMs as number,
    artist: requiredText(input.artist),
    title: requiredText(input.title),
    guitar: requiredText(input.guitar),
    processor: requiredText(input.processor),
    segment: parseSegment(input.segment, input.durationMs as number),
  };
}

function scores(value: unknown): VariantScores {
  const source = record(value);
  if (!source) return fail("evaluation:invalid");
  const values = [source.logicalFit, source.signalChain, source.knobUsability];
  if (
    values.some(
      (score) =>
        !Number.isInteger(score) || (score as number) < 1 || (score as number) > 5,
    )
  ) {
    return fail("evaluation:invalid");
  }
  return {
    logicalFit: source.logicalFit as number,
    signalChain: source.signalChain as number,
    knobUsability: source.knobUsability as number,
  };
}

export function validateEvaluation(value: unknown): ExperimentEvaluation {
  const input = record(value);
  const inputScores = record(input?.scores);
  if (
    !input ||
    !inputScores ||
    (input.preference !== "A" && input.preference !== "B")
  ) {
    return fail("evaluation:invalid");
  }
  return {
    scores: { A: scores(inputScores.A), B: scores(inputScores.B) },
    preference: input.preference,
  };
}
