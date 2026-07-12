import { describe, expect, test } from "vitest";
import {
  validateEvaluation,
  validateExperimentInput,
} from "../validate";

const VIDEO_ID = "dQw4w9WgXcQ";

function input(overrides: Record<string, unknown> = {}) {
  return {
    youtubeUrl: `https://www.youtube.com/watch?v=${VIDEO_ID}`,
    durationMs: 180_000,
    artist: " Oasis ",
    title: " Wonderwall ",
    guitar: " Cort G250 ",
    processor: " Valeton GP-150 ",
    segment: { startMs: 10_000, endMs: 30_000 },
    ...overrides,
  };
}

describe("validateExperimentInput", () => {
  test.each([
    `https://www.youtube.com/watch?v=${VIDEO_ID}`,
    `https://youtu.be/${VIDEO_ID}?t=10`,
    `https://youtube.com/shorts/${VIDEO_ID}`,
  ])("normalizes supported YouTube URL %s", (youtubeUrl) => {
    expect(validateExperimentInput(input({ youtubeUrl }))).toMatchObject({
      youtubeUrl: `https://www.youtube.com/watch?v=${VIDEO_ID}`,
      videoId: VIDEO_ID,
      artist: "Oasis",
      title: "Wonderwall",
      segment: { startMs: 10_000, endMs: 30_000 },
    });
  });

  test.each([
    "https://example.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com.evil/watch?v=dQw4w9WgXcQ",
    "https://youtube.com/watch?v=short",
  ])("rejects unsupported or malformed URL %s", (youtubeUrl) => {
    expect(() => validateExperimentInput(input({ youtubeUrl }))).toThrow(
      "input:invalid_youtube_url",
    );
  });

  test("rejects a non-object segment", () => {
    expect(() =>
      validateExperimentInput(input({ segment: [{ startMs: 0, endMs: 5_000 }] })),
    ).toThrow("input:invalid_segment");
  });

  test.each([
    [4_999, false],
    [5_000, true],
    [60_000, true],
    [60_001, false],
  ])("enforces segment duration boundary %ims", (length, valid) => {
    const run = () =>
      validateExperimentInput(input({ segment: { startMs: 0, endMs: length } }));
    if (valid) expect(run).not.toThrow();
    else expect(run).toThrow("input:invalid_segment");
  });

  test("rejects a segment beyond video duration", () => {
    expect(() =>
      validateExperimentInput(
        input({
          durationMs: 20_000,
          segment: { startMs: 10_000, endMs: 20_001 },
        }),
      ),
    ).toThrow("input:invalid_segment");
  });
});

describe("validateEvaluation", () => {
  const valid = {
    scores: {
      A: { logicalFit: 4, signalChain: 5, knobUsability: 3 },
      B: { logicalFit: 5, signalChain: 4, knobUsability: 4 },
    },
    preference: "B",
  };

  test("accepts six integer scores and A/B preference", () => {
    expect(validateEvaluation(valid)).toEqual(valid);
  });

  test.each([0, 1.5, 6, "5"])("rejects invalid score %s", (score) => {
    expect(() =>
      validateEvaluation({
        ...valid,
        scores: {
          ...valid.scores,
          A: { ...valid.scores.A, logicalFit: score },
        },
      }),
    ).toThrow("evaluation:invalid");
  });
});
