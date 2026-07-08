import { describe, expect, test } from "vitest";
import { adaptPatch, adaptToneRole, type DbPatch, type DbSong, type DbTone, type DbCanonicalTone } from "./adapt";

const song: DbSong = {
  id: "s1",
  artist: "Oasis",
  title: "Don't Look Back in Anger",
  artist_norm: "oasis",
  title_norm: "don't look back in anger",
  created_at: "2026-06-26T00:00:00Z",
};

const patch: DbPatch = {
  id: "p1",
  song_id: "s1",
  processor_slug: "gp150",
  version: 1,
  confidence: "높음",
  genre: "브릿팝",
  model_used: "gemini-2.5-flash",
  status: "ready",
  created_at: "2026-06-26T00:00:00Z",
  variations: [
    {
      label: "메인",
      signal_chain: [
        {
          type: "DST",
          category: "OD",
          model: "Green OD",
          base_gear: "Ibanez TS-808",
          enabled: false,
          footswitch: "A",
          knobs: [{ name: "Gain", value: 2 }],
        },
        {
          type: "AMP",
          model: "UK 800",
          base_gear: "Marshall JCM800",
          enabled: true,
          knobs: [{ name: "Gain", value: 5.5 }],
        },
      ],
      guitar: { selector: 1, volume: 10, tone: 7, coilSplit: false, note: "벌스 롤백" },
      switching: { A: "솔로 — Green OD ON" },
    },
  ],
};

describe("adaptPatch", () => {
  test("converts DbPatch to Song (variations 포맷)", () => {
    const result = adaptPatch(song, patch);
    expect(result.artist).toBe("Oasis");
    expect(result.title).toBe("Don't Look Back in Anger");
    // PROCESSOR_RIG에서 gp150 → g250-gp150으로 매핑됨
    expect(result.rig).toBe("g250-gp150");
    expect(result.genre).toBe("브릿팝");
    expect(result.slug).toBe("oasis-dont-look-back-in-anger");
    expect(result.variations).toHaveLength(1);
    expect(result.variations[0].label).toBe("메인");
    expect(result.variations[0].signalChain).toHaveLength(2);
  });

  test("guitar setting selectorLabel 추가", () => {
    const result = adaptPatch(song, patch);
    const guitar = result.variations[0].guitar;
    expect(guitar).toBeDefined();
    expect(guitar?.selector).toBe(1);
    expect(guitar?.selectorLabel).toBe("브릿지 험버커");
  });

  test("switching 맵 변환", () => {
    const result = adaptPatch(song, patch);
    const switching = result.variations[0].switching;
    expect(switching).toBeDefined();
    expect(switching?.A).toBeDefined();
    expect(switching?.A?.description).toBe("솔로 — Green OD ON");
    expect(switching?.A?.blockModels).toEqual(["Green OD"]);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// tones 기반 어댑터 테스트
// ────────────────────────────────────────────────────────────────────────────

const canonicalTone: DbCanonicalTone = {
  id: "c1",
  song_id: "s1",
  role: "lead",
  chain: [
    {
      type: "DST",
      category: "OD",
      base_gear: { name: "Ibanez TS-808", category: "OD" },
      enabled: true,
      knobs: [{ name: "Gain", value: 7 }],
    },
  ],
  null_reason: null,
};

const tone: DbTone = {
  id: "t1",
  canonical_tone_id: "c1",
  song_id: "s1",
  body_archetype: "strat",
  processor_id: "p1",
  role: "lead",
  signal_chain: [
    {
      type: "DST",
      category: "OD",
      model: "Green OD",
      enabled: true,
      knobs: [{ name: "Gain", value: 7 }],
    },
  ],
  null_reason: null,
  label: null,
};

describe("adaptToneRole", () => {
  test("rendered tone (signal_chain 있음)", () => {
    const result = adaptToneRole(tone, canonicalTone);
    expect(result.role).toBe("lead");
    expect(result.status).toBe("rendered");
    expect(result.signalChain).toHaveLength(1);
    expect(result.signalChain?.[0].model).toBe("Green OD");
  });

  test("null tone (signal_chain 없고 null_reason 있음)", () => {
    const nullTone: DbTone = { ...tone, signal_chain: null, null_reason: "이 곡엔 이 파트 없음" };
    const nullCanonical: DbCanonicalTone = { ...canonicalTone, chain: null, null_reason: "이 곡엔 이 파트 없음" };
    const result = adaptToneRole(nullTone, nullCanonical);
    expect(result.role).toBe("lead");
    expect(result.status).toBe("null");
    expect(result.signalChain).toBeNull();
    expect(result.nullReason).toBe("이 곡엔 이 파트 없음");
  });

  test("missing tone (canonical 있으나 tones 없음)", () => {
    const result = adaptToneRole(null, canonicalTone);
    expect(result.role).toBe("lead");
    expect(result.status).toBe("missing");
    expect(result.signalChain).toBeNull();
  });

  test("파생 역할 표기 (label 있음)", () => {
    const derivedTone: DbTone = { ...tone, role: "real_amp", label: "lead 파생" };
    const result = adaptToneRole(derivedTone, null);
    expect(result.sourceRole).toBe("lead");
    expect(result.label).toBe("lead 파생");
  });
});

