import { describe, expect, test } from "vitest";
import { buildReverseIndex, projectChain } from "../projector";
import type { CatalogEntry } from "../../parser/catalog";
import type { CanonBlock } from "../types";

// 기능 모듈 디폴트 폴백(설계 §2 ④, 2026-07-08 사용자 승인) — NR/EQ/DLY/RVB/VOL 은 base_gear
// 미매핑 시 effects_catalog.defaults 의 지정 모델로 폴백(노브 유지). 톤 정체성 모듈은 폴백 없음.

const ENTRIES: CatalogEntry[] = [
  { model: "UK 800", kind: "amp", base_gear: "Marshall JCM800" },
];
const INDEX = buildReverseIndex(ENTRIES);
const DEFAULTS = { NR: "Gate 1", EQ: "Guitar EQ 1", DLY: "Digital Delay S", RVB: "Room", VOL: "Volume" };

const DLY_BLOCK: CanonBlock = {
  type: "DLY",
  base_gear: { name: "Boss DD-3", category: "DLY" },
  knobs: [
    { name: "Time", value: 120, unit: "ms" },
    { name: "Mix", value: 20, unit: "%" },
  ],
  enabled: true,
};

describe("기능 모듈 디폴트 폴백", () => {
  test("DLY 미매핑 → defaults.DLY 폴백 + 캐논 knobs 유지 + notes 기록", () => {
    const r = projectChain([DLY_BLOCK], INDEX, DEFAULTS);
    expect(r.ok).toBe(true);
    expect(r.chain![0]!.model).toBe("Digital Delay S");
    expect(r.chain![0]!.base_gear).toBe("Boss DD-3"); // 실기명 보존
    expect(r.chain![0]!.knobs).toEqual(DLY_BLOCK.knobs); // 노브는 캐논 값 그대로
    expect(r.notes).toContain("기능 폴백");
    expect(r.notes).toContain("Digital Delay S");
  });

  test("AMP(톤 정체성 모듈) 미매핑 → 폴백 없이 unmapped", () => {
    const amp: CanonBlock = {
      type: "AMP",
      base_gear: { name: "Rando Amp 9000", category: "amp" },
      knobs: [],
      enabled: true,
    };
    const r = projectChain([amp], INDEX, DEFAULTS);
    expect(r.ok).toBe(false);
    expect(r.unmapped![0]!.name).toBe("Rando Amp 9000");
  });

  test("defaults 미제공 시 DLY 도 unmapped(하위호환)", () => {
    const r = projectChain([DLY_BLOCK], INDEX);
    expect(r.ok).toBe(false);
    expect(r.unmapped![0]!.name).toBe("Boss DD-3");
  });

  test("base_gear 매칭이 되면 폴백하지 않음 — 매칭 우선", () => {
    const matched: CanonBlock = {
      type: "DLY",
      base_gear: { name: "Maxon AD900", category: "DLY" },
      knobs: [],
      enabled: true,
    };
    const withEntry = buildReverseIndex([
      ...ENTRIES,
      { model: "999 Echo", kind: "effect", base_gear: "Maxon AD900" },
    ]);
    const r = projectChain([matched], withEntry, DEFAULTS);
    expect(r.ok).toBe(true);
    expect(r.chain![0]!.model).toBe("999 Echo"); // 디폴트(Digital Delay S)가 아니라 매칭 결과
  });
});
