import { describe, expect, test, vi } from "vitest";
import type { LlmClient } from "../../llm/client";
import type { AudioObservation } from "../audio-observations";
import { generateCanonDraft } from "../canon-draft";

const CANON_JSON = JSON.stringify({
  roles: {
    lead: {
      chain: [
        {
          type: "AMP",
          base_gear: { name: "Marshall JCM800", category: "amp" },
          enabled: true,
          knobs: [{ name: "Gain", value: 7, scale: "0-10" }],
        },
      ],
      confidence: 0.8,
    },
    backing: { chain: null, null_reason: "백킹 파트 불명확", confidence: 0.4 },
    solo: { chain: null, null_reason: "솔로 없음", confidence: 0.9 },
  },
  sources: ["source"],
});

const OBSERVATIONS: AudioObservation[] = [
  {
    role: "lead",
    startMs: 10_000,
    endMs: 30_000,
    gain: "crunch",
    brightness: "balanced",
    compression: "medium",
    effects: [],
    notes: "중역이 선명함",
    confidence: 0.8,
  },
];

function llmReturning(value: string): {
  llm: LlmClient;
  chat: ReturnType<typeof vi.fn>;
} {
  const chat = vi.fn(async () => value);
  return {
    llm: {
      capabilities: {
        audioInput: true,
        videoInput: true,
        structuredOutput: true,
      },
      chat,
    },
    chat,
  };
}

const INPUT = {
  artist: "Oasis",
  title: "Wonderwall",
  research: { notes: "문헌 관측" },
  grounding: "Marshall JCM800",
};

describe("generateCanonDraft", () => {
  test("audio observations are the only enriched prompt delta", async () => {
    const { llm, chat } = llmReturning(CANON_JSON);

    const baseline = await generateCanonDraft(INPUT, { llm, model: "fixed-model" });
    const enriched = await generateCanonDraft(
      { ...INPUT, audioObservations: OBSERVATIONS },
      { llm, model: "fixed-model" },
    );

    expect(chat.mock.calls[0][1]).toEqual({ json: true, temperature: 0 });
    const baselinePrompt = chat.mock.calls[0][0][1].content as string;
    const enrichedPrompt = chat.mock.calls[1][0][1].content as string;
    expect(enrichedPrompt).toBe(
      `${baselinePrompt}\n\n[오디오 관측]\n${JSON.stringify(OBSERVATIONS)}`,
    );
    expect(baseline.roles).toHaveLength(3);
    expect(enriched.roles).toHaveLength(3);
    expect(baseline.modelUsed).toBe("fixed-model");
  });

  test("keeps invalid roles as skipped gate outcomes", async () => {
    const invalid = JSON.stringify({
      roles: {
        lead: { chain: [{ type: "NOPE", enabled: true, knobs: [] }] },
        backing: { chain: null, null_reason: "없음" },
        solo: { chain: null, null_reason: "없음" },
      },
    });
    const { llm } = llmReturning(invalid);

    const result = await generateCanonDraft(INPUT, { llm });

    expect(result.roles[0]).toMatchObject({ role: "lead", status: "skipped" });
    expect(result.roles[0].issues?.length).toBeGreaterThan(0);
  });
});
