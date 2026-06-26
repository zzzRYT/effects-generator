import { describe, expect, test } from "vitest";
import { adaptPatch, type DbPatch, type DbSong } from "../adapt";

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
          model: "TS-808",
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
      switching: { A: "솔로 — TS-808 ON" },
    },
  ],
};

describe("adaptPatch", () => {
  const result = adaptPatch(song, patch);

  test("곡 메타·rig·slug 파생", () => {
    expect(result.artist).toBe("Oasis");
    expect(result.rig).toBe("g250-gp150");
    expect(result.slug).toBe("oasis-dont-look-back-in-anger");
    expect(result.genre).toBe("브릿팝");
    expect(result.confidence).toBe("높음");
  });

  test("signal_chain(snake) → signalChain(camel)", () => {
    const v = result.variations[0];
    expect(v.signalChain).toHaveLength(2);
    expect(v.signalChain[0].model).toBe("TS-808");
    expect(v.signalChain[1].type).toBe("AMP");
  });

  test("guitar.selector → selectorLabel 런타임 파생(G250)", () => {
    expect(result.variations[0].guitar?.selectorLabel).toBe("브릿지 험버커");
    expect(result.variations[0].guitar?.volume).toBe(10);
  });

  test("switching 문자열 → {description, blockModels(footswitch 매칭)}", () => {
    const sw = result.variations[0].switching;
    expect(sw?.A?.description).toBe("솔로 — TS-808 ON");
    expect(sw?.A?.blockModels).toEqual(["TS-808"]); // footswitch:A 인 블록의 model
    expect(sw?.B).toBeUndefined();
  });

  test("null genre/confidence → undefined", () => {
    const r = adaptPatch(song, { ...patch, genre: null, confidence: null });
    expect(r.genre).toBeUndefined();
    expect(r.confidence).toBeUndefined();
  });
});
