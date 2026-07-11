import { beforeEach, describe, expect, test, vi } from "vitest";
import { POST } from "../route";

const mocks = vi.hoisted(() => ({
  after: vi.fn(),
  getLlmClient: vi.fn(),
  hasAdminSession: vi.fn(),
  resolveRequest: vi.fn(),
  runToneExperiment: vi.fn(),
  sbInsert: vi.fn(),
}));

vi.mock("next/server", () => ({ after: mocks.after }));
vi.mock("@/lib/admin/require-admin", () => ({
  hasAdminSession: mocks.hasAdminSession,
}));
vi.mock("@/lib/llm/client", () => ({ getLlmClient: mocks.getLlmClient }));
vi.mock("@/lib/pipeline/resolver", () => ({ resolveRequest: mocks.resolveRequest }));
vi.mock("@/lib/audio-experiment/runner", () => ({
  runToneExperiment: mocks.runToneExperiment,
}));
vi.mock("@/lib/supabase/rest", () => ({ sbInsert: mocks.sbInsert }));

const BODY = {
  youtubeUrl: "https://youtu.be/dQw4w9WgXcQ",
  durationMs: 180_000,
  artist: "Oasis",
  title: "Wonderwall",
  guitar: "Cort G250",
  processor: "Valeton GP-150",
  segments: [{ role: "lead", startMs: 10_000, endMs: 30_000 }],
};

const RESOLVED = {
  song: { id: "song-1", artist_norm: "oasis", title_norm: "wonderwall" },
  guitar: { id: "g1", slug: "cort-g250", body_archetype: "superstrat" },
  processor: { id: "p1", slug: "valeton-gp-150" },
};

function request(body: unknown = BODY) {
  return new Request("http://x/api/lab/audio-tone/experiments", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST audio tone experiment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hasAdminSession.mockResolvedValue(true);
    mocks.getLlmClient.mockReturnValue({ capabilities: { videoInput: true } });
    mocks.resolveRequest.mockResolvedValue({ ok: true, resolved: RESOLVED });
    mocks.sbInsert.mockResolvedValue([{ id: "exp-1" }]);
  });

  test("rejects unauthenticated requests before DB work", async () => {
    mocks.hasAdminSession.mockResolvedValue(false);
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(mocks.sbInsert).not.toHaveBeenCalled();
  });

  test("rejects malformed JSON and invalid segments", async () => {
    expect((await POST(request("{"))).status).toBe(400);
    expect(
      (
        await POST(
          request({
            ...BODY,
            segments: [{ role: "lead", startMs: 0, endMs: 4_999 }],
          }),
        )
      ).status,
    ).toBe(400);
  });

  test("rejects unresolved gear and unsupported video before insert", async () => {
    mocks.resolveRequest.mockResolvedValueOnce({
      ok: false,
      unresolved: [{ kind: "processor", query: "unknown" }],
    });
    expect((await POST(request())).status).toBe(422);

    mocks.getLlmClient.mockReturnValueOnce({ capabilities: { videoInput: false } });
    expect((await POST(request())).status).toBe(422);
    expect(mocks.sbInsert).not.toHaveBeenCalled();
  });

  test("inserts a queued experiment and starts after work", async () => {
    const response = await POST(request());
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({ experimentId: "exp-1" });
    expect(mocks.sbInsert).toHaveBeenCalledWith(
      "tone_experiments",
      expect.objectContaining({ status: "queued", video_id: "dQw4w9WgXcQ" }),
      { admin: true },
    );
    expect(mocks.after).toHaveBeenCalledOnce();
    await mocks.after.mock.calls[0][0]();
    expect(mocks.runToneExperiment).toHaveBeenCalledWith(
      "exp-1",
      expect.objectContaining({ videoId: "dQw4w9WgXcQ" }),
      RESOLVED,
    );
  });
});
