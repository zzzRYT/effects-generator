import { describe, expect, test } from "vitest";
import { validateCanon, validateProjection } from "../gate";
import type { ModelCatalog } from "../../parser/catalog";

const CANON_OK = [
  { type: "DST", category: "OD", base_gear: { name: "Ibanez TS-808", category: "OD" }, enabled: true, knobs: [{ name: "Drive", value: 6, scale: "0-10" }] },
  { type: "AMP", base_gear: { name: "Fender Twin Reverb", category: "AMP" }, enabled: true, knobs: [{ name: "Gain", value: 4 }] },
];

describe("validateCanon", () => {
  test("passes when schema valid and base_gear well-shaped", () => {
    const r = validateCanon(CANON_OK);
    expect(r).toEqual({ ok: true, issues: [] });
  });

  test("passes for base_gear not in any gear KB (KB 실존은 투영이 검증)", () => {
    const chain = [{ type: "DST", category: "FUZZ", base_gear: { name: "Rando Fuzz", category: "FUZZ" }, enabled: true, knobs: [] }];
    expect(validateCanon(chain).ok).toBe(true);
  });

  test("rejects bad type / missing base_gear", () => {
    const chain = [{ type: "NOPE", enabled: true, knobs: [] }];
    const r = validateCanon(chain);
    expect(r.ok).toBe(false);
    expect(r.issues.map((i) => i.path)).toContain("chain[0].type");
    expect(r.issues.map((i) => i.path)).toContain("chain[0].base_gear");
  });

  test("rejects base_gear missing name/category", () => {
    const chain = [{ type: "AMP", base_gear: { name: "Fender Twin Reverb" }, enabled: true, knobs: [] }];
    const r = validateCanon(chain);
    expect(r.ok).toBe(false);
    expect(r.issues.map((i) => i.path)).toContain("chain[0].base_gear");
  });

  test("rejects invalid category for type", () => {
    const chain = [{ type: "AMP", category: "OD", base_gear: { name: "Fender Twin Reverb", category: "AMP" }, enabled: true, knobs: [] }];
    const r = validateCanon(chain);
    expect(r.ok).toBe(false);
    expect(r.issues.map((i) => i.path)).toContain("chain[0].category");
  });

  test("non-array chain fails fast", () => {
    expect(validateCanon(null).ok).toBe(false);
  });
});

const CATALOG: ModelCatalog = {
  exact: new Set(["Green OD", "Twin Verb"]),
  prefixes: ["User IR "],
};

describe("validateProjection", () => {
  test("passes when models exist in catalog and knobs in range", () => {
    const chain = [
      { type: "DST", category: "OD", model: "Green OD", enabled: true, knobs: [{ name: "Drive", value: 7, scale: "0-10" }] },
      { type: "CAB", model: "User IR 3", enabled: true, knobs: [] },
    ];
    expect(validateProjection(chain, CATALOG)).toEqual({ ok: true, issues: [] });
  });

  test("flags FX absent from processor catalog", () => {
    const chain = [{ type: "DST", category: "OD", model: "Nonexistent Pedal", enabled: true, knobs: [] }];
    const r = validateProjection(chain, CATALOG);
    expect(r.ok).toBe(false);
    expect(r.issues[0].message).toMatch(/카탈로그에 없음/);
  });

  test("flags knob out of scale range and negative value", () => {
    const chain = [{ type: "AMP", model: "Twin Verb", enabled: true, knobs: [
      { name: "Gain", value: 12, scale: "0-10" },
      { name: "Bass", value: -1 },
    ] }];
    const r = validateProjection(chain, CATALOG);
    expect(r.ok).toBe(false);
    expect(r.issues).toHaveLength(2);
  });

  test("missing model field fails", () => {
    const chain = [{ type: "AMP", enabled: true, knobs: [] }];
    const r = validateProjection(chain, CATALOG);
    expect(r.ok).toBe(false);
    expect(r.issues.map((i) => i.path)).toContain("signal_chain[0].model");
  });
});
