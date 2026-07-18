import { describe, expect, test } from "vitest";
import type { CanonBlock } from "../types";
import { projectCanonDraft, projectSingleTone } from "../project-draft";

const LEAD_CHAIN: CanonBlock[] = [
  {
    type: "AMP",
    base_gear: { name: "Marshall JCM800", category: "amp" },
    enabled: true,
    knobs: [{ name: "Gain", value: 7, scale: "0-10" }],
  },
  {
    type: "CAB",
    base_gear: { name: "Celestion Vintage 30", category: "cab" },
    enabled: true,
    knobs: [],
  },
];

const CATALOG = {
  entries: [
    { model: "UK 800", kind: "amp", base_gear: "Marshall JCM800" },
    { model: "Vintage 30", kind: "cab", base_gear: "Celestion Vintage 30" },
  ],
  defaults: {},
};

describe("projectCanonDraft", () => {
  test("returns five roles without DB writes and derives output targets", () => {
    const result = projectCanonDraft(
      [
        { id: "c1", role: "lead", chain: LEAD_CHAIN, nullReason: null },
        {
          id: "c2",
          role: "backing",
          chain: null,
          nullReason: "백킹 없음",
        },
        { id: "c3", role: "solo", chain: null, nullReason: "솔로 없음" },
      ],
      CATALOG,
    );

    expect(result.roles.map((role) => role.role)).toEqual([
      "lead",
      "backing",
      "solo",
      "real_amp",
      "phone",
    ]);
    expect(result.roles[0]).toMatchObject({ status: "projected" });
    expect(result.roles[1]).toMatchObject({ status: "null" });
    expect(result.roles[3].chain?.find((block) => block.type === "CAB")?.enabled).toBe(
      false,
    );
    expect(result.roles[4].chain?.find((block) => block.type === "CAB")?.enabled).toBe(
      true,
    );
  });

  test("keeps projection failures atomic per role", () => {
    const result = projectCanonDraft(
      [
        {
          role: "lead",
          chain: [
            {
              ...LEAD_CHAIN[0],
              base_gear: { name: "Unknown Amp", category: "amp" },
            },
          ],
          nullReason: null,
        },
      ],
      CATALOG,
    );

    expect(result.roles[0]).toMatchObject({ role: "lead", status: "skipped" });
    expect(result.roles[0].chain).toBeNull();
    expect(result.roles.slice(-2).every((role) => role.status === "skipped")).toBe(
      true,
    );
  });
});

describe("projectSingleTone", () => {
  const CATALOG = {
    entries: [
      { model: "UK 800", kind: "amp", base_gear: "Marshall JCM800" },
      { model: "Vintage 30", kind: "cab", base_gear: "Celestion Vintage 30" },
    ],
    defaults: {},
  };
  const CHAIN: CanonBlock[] = [
    {
      type: "AMP",
      base_gear: { name: "Marshall JCM800", category: "amp" },
      enabled: true,
      knobs: [{ name: "Gain", value: 7, scale: "0-10" }],
    },
  ];

  test("projects a single valid chain without role bookkeeping", () => {
    const result = projectSingleTone({ chain: CHAIN, nullReason: null }, CATALOG);
    expect(result.status).toBe("projected");
    expect(result.chain?.[0]).toMatchObject({ model: "UK 800" });
  });

  test("passes through a legitimate null canon", () => {
    const result = projectSingleTone({ chain: null, nullReason: "구간 불명확" }, CATALOG);
    expect(result).toEqual({ status: "null", chain: null, nullReason: "구간 불명확" });
  });

  test("marks a canon gate failure as skipped without projecting", () => {
    const result = projectSingleTone(
      { chain: null, status: "skipped", issues: [{ path: "chain", message: "게이트 실패" }] },
      CATALOG,
    );
    expect(result).toMatchObject({ status: "skipped", chain: null });
  });

  test("fails atomically when any block is unmapped", () => {
    const result = projectSingleTone(
      {
        chain: [{ ...CHAIN[0], base_gear: { name: "Unknown Amp", category: "amp" } }],
        nullReason: null,
      },
      CATALOG,
    );
    expect(result.status).toBe("skipped");
    expect(result.chain).toBeNull();
    expect(result.issues?.length).toBeGreaterThan(0);
  });
});
