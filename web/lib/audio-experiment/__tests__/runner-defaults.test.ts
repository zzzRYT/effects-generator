import { beforeEach, describe, expect, test, vi } from "vitest";
import { createDefaultRunnerDeps } from "../runner";

const mocks = vi.hoisted(() => ({
  analyzeSongMedia: vi.fn(),
  ensureSong: vi.fn(),
  generateCanonDraft: vi.fn(),
  getLlmClient: vi.fn(),
  loadGrounding: vi.fn(),
  projectCanonDraft: vi.fn(),
  researchSong: vi.fn(),
  sbFetch: vi.fn(),
  sbInsert: vi.fn(),
  sbSelect: vi.fn(),
}));

vi.mock("../../llm/client", () => ({ getLlmClient: mocks.getLlmClient }));
vi.mock("../../supabase/rest", () => ({
  sbFetch: mocks.sbFetch,
  sbInsert: mocks.sbInsert,
  sbSelect: mocks.sbSelect,
}));
vi.mock("../../pipeline/audio-observations", () => ({
  analyzeSongMedia: mocks.analyzeSongMedia,
}));
vi.mock("../../pipeline/canon-draft", () => ({
  generateCanonDraft: mocks.generateCanonDraft,
}));
vi.mock("../../pipeline/generate", () => ({ ensureSong: mocks.ensureSong }));
vi.mock("../../pipeline/grounding", () => ({ loadGrounding: mocks.loadGrounding }));
vi.mock("../../pipeline/project-draft", () => ({
  projectCanonDraft: mocks.projectCanonDraft,
}));
vi.mock("../../pipeline/research", () => ({ researchSong: mocks.researchSong }));

const REQUEST = {
  youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  videoId: "dQw4w9WgXcQ",
  durationMs: 20_000,
  segments: [{ role: "lead" as const, startMs: 0, endMs: 20_000 }],
  artist: "Oasis",
  title: "Wonderwall",
  guitar: "G250",
  processor: "GP-150",
};
const RESOLVED = {
  song: { id: null, artist_norm: "oasis", title_norm: "wonderwall" },
  guitar: { id: "g1", slug: "g250", body_archetype: "superstrat" as const },
  processor: { id: "p1", slug: "gp150" },
};

describe("createDefaultRunnerDeps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getLlmClient.mockReturnValue({ capabilities: { videoInput: true } });
    mocks.sbFetch.mockResolvedValue(new Response(null, { status: 204 }));
    mocks.sbSelect.mockResolvedValue([{ effects_catalog: { entries: [] } }]);
    mocks.ensureSong.mockResolvedValue("song-1");
    mocks.researchSong.mockResolvedValue({ notes: {}, cached: true, modelUsed: "m" });
    mocks.loadGrounding.mockResolvedValue({ context: "context" });
    mocks.analyzeSongMedia.mockResolvedValue([]);
    mocks.generateCanonDraft.mockResolvedValue({ roles: [], sources: [], modelUsed: "m" });
    mocks.projectCanonDraft.mockReturnValue({ roles: [] });
  });

  test("composes cache, analysis, draft and projection dependencies", async () => {
    const deps = createDefaultRunnerDeps();
    await expect(deps.ensureSong(REQUEST, RESOLVED)).resolves.toBe("song-1");
    await deps.research({ songId: "song-1", artist: "Oasis", title: "Wonderwall" });
    await deps.grounding();
    await expect(deps.catalog("p1")).resolves.toEqual({ entries: [] });
    await deps.analyze({ youtubeUrl: REQUEST.youtubeUrl, segments: REQUEST.segments });
    await deps.generate({ ...REQUEST, research: { notes: {}, cached: true, modelUsed: "m" }, grounding: "context" });
    deps.project([], { entries: [] });

    expect(mocks.ensureSong).toHaveBeenCalled();
    expect(mocks.researchSong).toHaveBeenCalled();
    expect(mocks.analyzeSongMedia).toHaveBeenCalled();
    expect(mocks.generateCanonDraft).toHaveBeenCalled();
    expect(mocks.projectCanonDraft).toHaveBeenCalled();
  });

  test("patches progress, ready results and atomic failure", async () => {
    const deps = createDefaultRunnerDeps();
    const canon = { roles: [], sources: [], modelUsed: "m" };
    const projection = { roles: [] };
    await deps.update("exp-1", "analyzing", { audio_observations: [] });
    await deps.ready("exp-1", canon, canon, projection, projection);
    await deps.fail("exp-1", "failed", "detail");

    expect(mocks.sbFetch).toHaveBeenCalledTimes(3);
    expect(mocks.sbFetch.mock.calls[1][1].body).toMatchObject({ status: "ready" });
    expect(mocks.sbFetch.mock.calls[2][1].body).toMatchObject({
      status: "failed",
      baseline_result: null,
      enriched_result: null,
    });
  });

  test("rejects a processor without an effects catalog", async () => {
    mocks.sbSelect.mockResolvedValueOnce([]);
    await expect(createDefaultRunnerDeps().catalog("missing")).rejects.toThrow(
      "projection:catalog_missing",
    );
  });
});
