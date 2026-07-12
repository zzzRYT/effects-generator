import { beforeEach, describe, expect, test, vi } from "vitest";
import { GET } from "../route";

const mocks = vi.hoisted(() => ({
  hasAdminSession: vi.fn(),
  sbSelect: vi.fn(),
}));

vi.mock("@/lib/admin/require-admin", () => ({
  hasAdminSession: mocks.hasAdminSession,
}));
vi.mock("@/lib/supabase/rest", () => ({ sbSelect: mocks.sbSelect }));

const ROW = {
  id: "exp-1",
  status: "ready",
  progress: { stage: "ready" },
  baseline_result: {
    canonical: { modelUsed: "private baseline model", sources: ["private"] },
    projection: { roles: [{ role: "lead", status: "projected", chain: [{ type: "AMP", model: "US Deluxe", enabled: true, knobs: [] }], nullReason: null }] },
  },
  enriched_result: {
    canonical: { modelUsed: "private enriched model", sources: ["private"] },
    projection: { roles: [{ role: "lead", status: "projected", chain: [{ type: "AMP", model: "UK 800", enabled: true, knobs: [] }], nullReason: null }] },
  },
  blind_assignment: { A: "enriched", B: "baseline" },
  failure_code: null,
  failure_detail: null,
  evaluation: null,
  preferred_variant: null,
};

const context = { params: Promise.resolve({ id: "exp-1" }) };

describe("GET audio tone experiment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hasAdminSession.mockResolvedValue(true);
    mocks.sbSelect.mockResolvedValue([ROW]);
  });

  test("rejects unauthenticated requests before select", async () => {
    mocks.hasAdminSession.mockResolvedValue(false);
    expect((await GET(new Request("http://x"), context)).status).toBe(401);
    expect(mocks.sbSelect).not.toHaveBeenCalled();
  });

  test("returns anonymized ready variants", async () => {
    const response = await GET(new Request("http://x"), context);
    const body = await response.json();
    expect(body.variants).toEqual({
      A: { roles: [{ role: "lead", status: "projected", chain: [{ type: "AMP", model: "UK 800", enabled: true, knobs: [] }], nullReason: null }] },
      B: { roles: [{ role: "lead", status: "projected", chain: [{ type: "AMP", model: "US Deluxe", enabled: true, knobs: [] }], nullReason: null }] },
    });
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("blind_assignment");
    expect(serialized).not.toContain("canonical");
    expect(serialized).not.toContain("modelUsed");
  });

  test("returns a stable failure code without detail", async () => {
    mocks.sbSelect.mockResolvedValueOnce([
      {
        ...ROW,
        status: "failed",
        failure_code: "provider:request_failed",
        failure_detail: "secret",
      },
    ]);
    const body = await (await GET(new Request("http://x"), context)).json();
    expect(body.failureCode).toBe("provider:request_failed");
    expect(JSON.stringify(body)).not.toContain("secret");
  });
});
