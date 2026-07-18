import { describe, expect, test, vi } from "vitest";
import { buildGroundingContext, loadGrounding, type GearRow } from "../grounding";

const GEAR: GearRow[] = [
  { name: "Ibanez TS-808", category: "OD" },
  { name: "Fender Twin Reverb", category: "AMP" },
  { name: "Boss DS-1", category: "DST" },
];

describe("buildGroundingContext", () => {
  test("empty gear KB → explicit no-gear guidance", () => {
    expect(buildGroundingContext([])).toMatch(/등록된 실기.*없음/);
  });

  test("groups by category, sorted, names sorted", () => {
    const ctx = buildGroundingContext(GEAR);
    expect(ctx).toContain("- AMP: Fender Twin Reverb");
    expect(ctx).toContain("- DST: Boss DS-1");
    expect(ctx).toContain("- OD: Ibanez TS-808");
    // AMP before DST before OD (category alpha sort)
    expect(ctx.indexOf("AMP")).toBeLessThan(ctx.indexOf("DST"));
    expect(ctx.indexOf("DST")).toBeLessThan(ctx.indexOf("OD"));
  });
});

describe("loadGrounding", () => {
  test("queries approved gear and builds context + KnownGear (slugified)", async () => {
    const select = vi.fn(async () => GEAR);
    const { context, knownGear } = await loadGrounding({ select: select as never });

    const [table, query] = select.mock.calls[0];
    expect(table).toBe("gear");
    expect(query).toContain("status=eq.approved");
    expect(context).toContain("Ibanez TS-808");
    expect(knownGear.names.has("ibanez-ts-808")).toBe(true);
    expect(knownGear.names.has("fender-twin-reverb")).toBe(true);
  });
});
