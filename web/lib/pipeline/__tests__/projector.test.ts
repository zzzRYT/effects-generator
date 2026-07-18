import { describe, expect, test } from "vitest";
import {
  buildReverseIndex,
  deriveOutputTarget,
  projectChain,
  PROJECTOR_VERSION,
  type CatalogEntry,
  type ReverseIndex,
} from "../projector";
import type { CanonBlock } from "../types";
import type { Block } from "../../types";

// ── 픽스처 ────────────────────────────────────────────

const ENTRIES: CatalogEntry[] = [
  {
    model: "Green OD",
    kind: "effect",
    base_gear: "Ibanez TS-808 Tube Screamer",
    knobs: ["Gain", "Tone", "Volume"],
  },
  {
    model: "OD 9",
    kind: "effect",
    base_gear: "Ibanez TS9 Tube Screamer",
    knobs: ["Gain", "Tone", "Volume"],
  },
  {
    model: "Blues OD",
    kind: "effect",
    base_gear: undefined, // 오리지널 모델
    knobs: ["Gain", "Tone", "Volume"],
  },
  {
    model: "Tweedy",
    kind: "amp",
    base_gear: "Fender Tweed Deluxe",
    knobs: ["Gain", "Tone", "Volume"],
  },
  {
    model: "Dark Twin",
    kind: "amp",
    base_gear: "Fender '65 Twin Reverb",
    knobs: ["Gain", "Volume", "Bass/Middle/Treble", "Bright"],
  },
  {
    model: "Vintage 30",
    kind: "cab",
    base_gear: "Celestion Vintage 30",
    knobs: ["Volume"],
  },
  {
    model: "Green OD Alt",
    kind: "effect",
    base_gear: "Ibanez TS-808 Tube Screamer",
    knobs: ["Gain", "Tone"],
  },
];

const INDEX: ReverseIndex = buildReverseIndex(ENTRIES);

const CANON_BLOCK_OD: CanonBlock = {
  type: "DST",
  category: "OD",
  base_gear: { name: "Ibanez TS-808 Tube Screamer", category: "OD" },
  knobs: [{ name: "Gain", value: 5, scale: "0-10" }],
  enabled: true,
};

const CANON_BLOCK_AMP: CanonBlock = {
  type: "AMP",
  base_gear: { name: "Fender Tweed Deluxe", category: "AMP" },
  knobs: [{ name: "Gain", value: 7, scale: "0-10" }],
  enabled: true,
};

const CANON_BLOCK_CAB: CanonBlock = {
  type: "CAB",
  base_gear: { name: "Celestion Vintage 30", category: "CAB" },
  knobs: [{ name: "Volume", value: 8, scale: "0-10" }],
  enabled: true,
};

const CANON_BLOCK_UNMAPPED: CanonBlock = {
  type: "DST",
  category: "OD",
  base_gear: { name: "Unknown Pedal XYZ", category: "OD" },
  knobs: [{ name: "Gain", value: 5, scale: "0-10" }],
  enabled: false,
};

// ── buildReverseIndex ──────────────────────────────

describe("buildReverseIndex", () => {
  test("인덱싱 — base_gear로부터 entries 조회 가능 (shared slugify: TS-808 → ts-808)", () => {
    const idx = buildReverseIndex(ENTRIES);
    // slugify("Ibanez TS-808 Tube Screamer") → "ibanez-ts-808-tube-screamer"
    const odEntries = idx.entries["ibanez-ts-808-tube-screamer"];
    expect(odEntries).toBeDefined();
    expect(odEntries!.length).toBe(2); // Green OD, Green OD Alt
  });

  test("base_gear 없는 엔트리는 제외", () => {
    const idx = buildReverseIndex(ENTRIES);
    const missing = idx.entries["blues-od"];
    expect(missing).toBeUndefined();
  });

  test("다른 base_gear는 별도 인덱스 엔트리", () => {
    const idx = buildReverseIndex(ENTRIES);
    const tweedy = idx.entries["fender-tweed-deluxe"];
    expect(tweedy).toBeDefined();
    expect(tweedy![0]!.model).toBe("Tweedy");
  });

  test("문서 순서 보존 — 같은 base_gear의 여러 엔트리 순서", () => {
    const idx = buildReverseIndex(ENTRIES);
    const odEntries = idx.entries["ibanez-ts-808-tube-screamer"];
    expect(odEntries![0]!.model).toBe("Green OD"); // 먼저 나타난 항목
    expect(odEntries![1]!.model).toBe("Green OD Alt");
  });
});

// ── projectChain ───────────────────────────────────

describe("projectChain", () => {
  test("단순 투영 — 캐논 → 기기 signal_chain", () => {
    const canon = [CANON_BLOCK_OD];
    const result = projectChain(canon, INDEX);
    expect(result.ok).toBe(true);
    expect(result.chain).toBeDefined();
    expect(result.chain![0]).toEqual({
      type: "DST",
      category: "OD",
      model: "Green OD",
      base_gear: "Ibanez TS-808 Tube Screamer",
      knobs: [{ name: "Gain", value: 5, scale: "0-10" }],
      enabled: true,
    } as Block);
  });

  test("1:N 디스앰비 — 문서 순서 첫 항목 채택 + notes 기록", () => {
    const canon = [CANON_BLOCK_OD];
    const result = projectChain(canon, INDEX);
    expect(result.ok).toBe(true);
    expect(result.notes).toContain("1:N 디스앰비");
    expect(result.notes).toContain("Green OD");
    expect(result.notes).toContain("Green OD Alt");
  });

  test("kind 필터링 — AMP type은 amp 카탈로그만 매칭", () => {
    const canon = [CANON_BLOCK_AMP];
    const result = projectChain(canon, INDEX);
    expect(result.ok).toBe(true);
    expect(result.chain![0]!.type).toBe("AMP");
    expect(result.chain![0]!.model).toBe("Tweedy");
  });

  test("kind 필터링 — CAB type은 cab 카탈로그만 매칭", () => {
    const canon = [CANON_BLOCK_CAB];
    const result = projectChain(canon, INDEX);
    expect(result.ok).toBe(true);
    expect(result.chain![0]!.type).toBe("CAB");
    expect(result.chain![0]!.model).toBe("Vintage 30");
  });

  test("미매핑 블록 — base_gear를 찾을 수 없음", () => {
    const canon = [CANON_BLOCK_UNMAPPED];
    const result = projectChain(canon, INDEX);
    expect(result.ok).toBe(false);
    expect(result.unmapped).toBeDefined();
    expect(result.unmapped![0]).toEqual({
      name: "Unknown Pedal XYZ",
      category: "OD",
      blockIndex: 0,
    });
  });

  test("혼합 체인 — 일부 미매핑 시 전체 실패", () => {
    const canon = [CANON_BLOCK_OD, CANON_BLOCK_UNMAPPED];
    const result = projectChain(canon, INDEX);
    expect(result.ok).toBe(false);
    expect(result.unmapped!.length).toBe(1); // 첫 번째는 성공했지만, 두 번째 미매핑으로 전체 실패.
  });

  test("knobs 보존 — 캐논 knobs는 투영에서 그대로 복사", () => {
    const canon = [{ ...CANON_BLOCK_OD, knobs: [{ name: "Custom", value: 9, scale: "0-10" }] }];
    const result = projectChain(canon, INDEX);
    expect(result.chain![0]!.knobs).toEqual([{ name: "Custom", value: 9, scale: "0-10" }]);
  });

  test("footswitch 보존", () => {
    const canon = [{ ...CANON_BLOCK_OD, footswitch: "A" as const }];
    const result = projectChain(canon, INDEX);
    expect(result.chain![0]!.footswitch).toBe("A");
  });

  test("불변성 — 입력 캐논 블록 미변형", () => {
    const canon = [CANON_BLOCK_OD];
    const original = JSON.stringify(canon);
    projectChain(canon, INDEX);
    expect(JSON.stringify(canon)).toBe(original);
  });
});

// ── deriveOutputTarget ─────────────────────────────

describe("deriveOutputTarget", () => {
  test("real_amp — CAB enabled:false", () => {
    const chain: Block[] = [
      { type: "AMP", model: "Tweedy", enabled: true, knobs: [] },
      { type: "CAB", model: "Vintage 30", enabled: true, knobs: [] },
    ];
    const result = deriveOutputTarget(chain, "real_amp");
    expect(result[1]!.enabled).toBe(false);
    expect(result[0]!.enabled).toBe(true); // 다른 블록은 영향 없음.
  });

  test("phone — CAB enabled:true", () => {
    const chain: Block[] = [
      { type: "AMP", model: "Tweedy", enabled: true, knobs: [] },
      { type: "CAB", model: "Vintage 30", enabled: false, knobs: [] },
    ];
    const result = deriveOutputTarget(chain, "phone");
    expect(result[1]!.enabled).toBe(true);
  });

  test("CAB 없음 — 체인 무변형", () => {
    const chain: Block[] = [{ type: "AMP", model: "Tweedy", enabled: true, knobs: [] }];
    const result = deriveOutputTarget(chain, "real_amp");
    expect(result).toEqual(chain);
  });

  test("불변성 — 입력 체인 미변형, 새 배열 반환", () => {
    const chain: Block[] = [
      { type: "CAB", model: "Vintage 30", enabled: true, knobs: [] },
    ];
    const original = JSON.stringify(chain);
    const result = deriveOutputTarget(chain, "real_amp");
    expect(JSON.stringify(chain)).toBe(original); // 입력 미변형
    expect(result).not.toBe(chain); // 새 배열
    expect(result[0]).not.toBe(chain[0]); // 새 블록 객체
  });

  test("CAB 여러 개 — 모두 처리", () => {
    const chain: Block[] = [
      { type: "CAB", model: "V30", enabled: false, knobs: [] },
      { type: "AMP", model: "Tweedy", enabled: true, knobs: [] },
      { type: "CAB", model: "G12T-75", enabled: false, knobs: [] },
    ];
    const result = deriveOutputTarget(chain, "phone");
    expect(result[0]!.enabled).toBe(true);
    expect(result[2]!.enabled).toBe(true);
  });
});

// ── 상수 ────────────────────────────────────────────

describe("PROJECTOR_VERSION", () => {
  test("버전은 문자열", () => {
    expect(typeof PROJECTOR_VERSION).toBe("string");
    expect(PROJECTOR_VERSION).toBe("1");
  });
});
