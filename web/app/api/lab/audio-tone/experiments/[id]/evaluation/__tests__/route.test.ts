import { beforeEach, describe, expect, test, vi } from "vitest";
import { POST } from "../route";

const mocks = vi.hoisted(() => ({
  hasAdminSession: vi.fn(),
  sbFetch: vi.fn(),
  sbSelect: vi.fn(),
}));

vi.mock("@/lib/admin/require-admin", () => ({
  hasAdminSession: mocks.hasAdminSession,
}));
vi.mock("@/lib/supabase/rest", () => ({
  sbFetch: mocks.sbFetch,
  sbSelect: mocks.sbSelect,
}));

const EVALUATION = {
  scores: {
    A: { logicalFit: 4, signalChain: 5, knobUsability: 3 },
    B: { logicalFit: 5, signalChain: 4, knobUsability: 4 },
  },
  preference: "A",
};

const READY = {
  id: "exp-1",
  status: "ready",
  progress: {},
  baseline_result: {
    canonical: { modelUsed: "private baseline model", sources: ["private"] },
    projection: { status: "projected", chain: [{ type: "AMP", model: "US Deluxe", enabled: true, knobs: [] }], nullReason: null },
  },
  enriched_result: {
    canonical: { modelUsed: "private enriched model", sources: ["private"] },
    projection: { status: "projected", chain: [{ type: "AMP", model: "UK 800", enabled: true, knobs: [] }], nullReason: null },
  },
  blind_assignment: { A: "enriched", B: "baseline" },
  evaluation: null,
  preferred_variant: null,
  failure_code: null,
  failure_detail: null,
};

const context = { params: Promise.resolve({ id: "exp-1" }) };

function request(body: unknown = EVALUATION) {
  return new Request("http://x", { method: "POST", body: JSON.stringify(body) });
}

describe("POST audio tone evaluation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hasAdminSession.mockResolvedValue(true);
    mocks.sbSelect.mockResolvedValue([READY]);
    mocks.sbFetch.mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            ...READY,
            status: "evaluated",
            evaluation: EVALUATION,
            preferred_variant: "enriched",
          },
        ]),
      ),
    );
  });

  test("rejects unauthenticated and malformed evaluations", async () => {
    mocks.hasAdminSession.mockResolvedValueOnce(false);
    expect((await POST(request(), context)).status).toBe(401);
    expect(mocks.sbSelect).not.toHaveBeenCalled();
    expect(
      (await POST(request({ ...EVALUATION, preference: "baseline" }), context)).status,
    ).toBe(400);
  });

  test("atomically evaluates ready once and reveals identities", async () => {
    const response = await POST(request(), context);
    expect(response.status).toBe(200);
    expect(mocks.sbFetch.mock.calls[0][0]).toContain("status=eq.ready");
    expect(mocks.sbFetch.mock.calls[0][1].body).toMatchObject({
      status: "evaluated",
      preferred_variant: "enriched",
    });
    const body = await response.json();
    expect(body.reveal).toEqual({ A: "enriched", B: "baseline" });
    expect(JSON.stringify(body)).not.toContain("private enriched model");
  });

  test("returns 409 when the conditional update finds no ready row", async () => {
    mocks.sbFetch.mockResolvedValueOnce(new Response("[]"));
    expect((await POST(request(), context)).status).toBe(409);
  });
});
