import { describe, it, expect } from "vitest";
import { parsePatch } from "../parsePatch";
import { buildGuitarRegistry } from "../guitarRegistry";
import * as F from "./fixtures";

const FILE = "patches/g250-gp150/test.md";

describe("parsePatch — 정상", () => {
  it("정상 패치를 Song 으로 파싱한다", () => {
    const { song, errors, warnings } = parsePatch(F.VALID, FILE);
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
    expect(song).not.toBeNull();
    expect(song!.artist).toBe("Test Artist");
    expect(song!.title).toBe("Test Song");
    expect(song!.rig).toBe("g250-gp150");
    expect(song!.slug).toBe("test");
    expect(song!.variations).toHaveLength(1);
  });

  it("signal_chain block(모듈) 순서를 보존한다", () => {
    const { song } = parsePatch(F.VALID, FILE);
    expect(song!.variations[0].signalChain.map((b) => b.type)).toEqual([
      "DST",
      "AMP",
      "CAB",
      "DLY",
      "RVB",
    ]);
  });

  it("category(효과종류)를 보존한다 — DST/OD, 없는 블록은 생략", () => {
    const { song } = parsePatch(F.VALID, FILE);
    const chain = song!.variations[0].signalChain;
    expect(chain[0].category).toBe("OD"); // DST 모듈의 오버드라이브
    expect("category" in chain[1]).toBe(false); // AMP — category 없음
  });

  it("unit 을 보존한다", () => {
    const { song } = parsePatch(F.VALID, FILE);
    const dly = song!.variations[0].signalChain.find((b) => b.type === "DLY")!;
    expect(dly.knobs.find((k) => k.name === "Time")!.unit).toBe("ms");
  });

  it("빈 knobs(IR-only CAB)를 보존한다", () => {
    const { song } = parsePatch(F.VALID, FILE);
    const cab = song!.variations[0].signalChain.find((b) => b.type === "CAB")!;
    expect(cab.knobs).toEqual([]);
  });

  it("부동소수 자릿수를 보존한다", () => {
    const { song } = parsePatch(F.FLOAT_PRECISION, FILE);
    const vals = song!.variations[0].signalChain[0].knobs.map((k) => k.value);
    expect(vals).toEqual([5.5, 0.8, 1.5, 6.234]);
  });

  it("switching.blockModels 를 footswitch 로 자동 추출한다", () => {
    const { song } = parsePatch(F.VALID, FILE);
    expect(song!.variations[0].switching!.A!.blockModels).toEqual([
      "TS-808",
      "Slapback",
    ]);
    expect(song!.variations[0].switching!.A!.description).toContain("솔로");
  });

  it("guitar 세팅(셀렉터/볼륨/톤/코일스플릿/메모)을 보존한다", () => {
    const { song } = parsePatch(F.VALID, FILE);
    const g = song!.variations[0].guitar!;
    expect(g.selector).toBe(1);
    expect(g.volume).toBe(8);
    expect(g.tone).toBe(7);
    expect(g.coilSplit).toBe(false);
    expect(g.note).toBe("테스트 메모");
  });

  it("registry 없으면 selectorLabel 을 파생하지 않는다(숫자만 보존)", () => {
    const { song } = parsePatch(F.VALID, FILE);
    expect(song!.variations[0].guitar!.selector).toBe(1);
    expect(song!.variations[0].guitar!.selectorLabel).toBeUndefined();
  });

  it("optional 필드가 null 이면 \"null\" 문자열이 아니라 생략한다", () => {
    const { song, errors } = parsePatch(F.NULL_BASE_GEAR, FILE);
    expect(errors).toEqual([]);
    const block = song!.variations[0].signalChain[0];
    expect("base_gear" in block).toBe(false);
  });
});

describe("parsePatch — 변주 독립성/결정성", () => {
  it("변주 3개를 독립 객체로 파싱한다", () => {
    const { song } = parsePatch(F.MULTI_VARIATION, FILE);
    expect(song!.variations).toHaveLength(3);
    const gains = song!.variations.map((v) => v.signalChain[0].knobs[0].value);
    expect(gains).toEqual([5, 6, 7]);
    expect(song!.variations[0].signalChain).not.toBe(
      song!.variations[1].signalChain,
    );
  });

  it("결정적: 같은 입력 → 동일 결과", () => {
    const a = parsePatch(F.MULTI_VARIATION, FILE);
    const b = parsePatch(F.MULTI_VARIATION, FILE);
    expect(a.song).toEqual(b.song);
  });
});

describe("parsePatch — 검증 실패(빌드 실패 케이스)", () => {
  const cases: ReadonlyArray<readonly [string, string, string]> = [
    ["MISSING_FRONTMATTER", F.MISSING_FRONTMATTER, "frontmatter-missing"],
    ["FRONTMATTER_MISSING_KEY", F.FRONTMATTER_MISSING_KEY, "frontmatter-missing"],
    ["NO_SIGNAL_CHAIN", F.NO_SIGNAL_CHAIN, "signal-chain-count"],
    ["TWO_SIGNAL_CHAIN", F.TWO_SIGNAL_CHAIN, "signal-chain-count"],
    ["MALFORMED_JSON", F.MALFORMED_JSON, "signal-chain-json"],
    ["BAD_BLOCK_TYPE", F.BAD_BLOCK_TYPE, "block-field"],
    ["BAD_CATEGORY", F.BAD_CATEGORY, "block-field"],
    ["ORPHAN_CATEGORY", F.ORPHAN_CATEGORY, "block-field"],
    ["BLOCK_MISSING_FIELD", F.BLOCK_MISSING_FIELD, "block-field"],
    ["KNOB_VALUE_NOT_NUMBER", F.KNOB_VALUE_NOT_NUMBER, "knob-field"],
    ["SWITCHING_MALFORMED", F.SWITCHING_MALFORMED, "switching-json"],
    ["UNCLOSED_FENCE", F.UNCLOSED_FENCE, "signal-chain-count"],
    ["JSON_NOT_ARRAY", F.JSON_NOT_ARRAY, "signal-chain-json"],
    ["BLOCK_BAD_FOOTSWITCH", F.BLOCK_BAD_FOOTSWITCH, "block-field"],
    ["BLOCK_IS_ARRAY", F.BLOCK_IS_ARRAY, "block-field"],
    ["KNOB_IS_ARRAY", F.KNOB_IS_ARRAY, "knob-field"],
    ["GUITAR_MALFORMED", F.GUITAR_MALFORMED, "guitar-json"],
    ["GUITAR_NOT_OBJECT", F.GUITAR_NOT_OBJECT, "guitar-json"],
    ["GUITAR_BAD_SELECTOR", F.GUITAR_BAD_SELECTOR, "guitar-field"],
    ["GUITAR_BAD_VOLUME", F.GUITAR_BAD_VOLUME, "guitar-field"],
  ];
  it.each(cases)("%s → song=null + ruleId %s", (_name, raw, ruleId) => {
    const { song, errors } = parsePatch(raw, FILE);
    expect(song).toBeNull();
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.ruleId === ruleId)).toBe(true);
    expect(errors[0].file).toBe(FILE);
    expect(errors[0].line).toBeGreaterThan(0);
  });
});

describe("parsePatch — 경고(비실패)", () => {
  it("switching 이 가리키는 footswitch 블록이 없으면 경고하되 파싱은 성공", () => {
    const { song, errors, warnings } = parsePatch(F.SWITCHING_MISMATCH, FILE);
    expect(errors).toEqual([]);
    expect(song).not.toBeNull();
    expect(warnings.length).toBeGreaterThan(0);
    expect(song!.variations[0].switching!.A!.blockModels).toEqual([]);
  });
});

describe("parsePatch — guitar.selectorLabel 파생(registry)", () => {
  const REG = buildGuitarRegistry(
    [
      `---\nrig: g250-gp150\nguitar: cort-g250\n---\n`,
    ],
    [
      `---\nmodel: cort-g250\n---\n- **5-way 셀렉터**:\n  1. 브릿지 험버커\n  2. 브릿지 + 미들\n  3. 미들\n  4. 미들 + 넥\n  5. 넥\n`,
    ],
  );

  it("registry 가 있으면 selector 숫자에 기타 모델 라벨을 붙인다", () => {
    const { song, errors } = parsePatch(F.VALID, FILE, REG);
    expect(errors).toEqual([]);
    expect(song!.variations[0].guitar!.selectorLabel).toBe("브릿지 험버커");
  });

  it("rig 의 기타 모델이 registry 에 없으면 빌드 실패(guitar-field) — selector 유무 무관", () => {
    const { song, errors } = parsePatch(F.VALID, FILE, buildGuitarRegistry([], []));
    expect(song).toBeNull();
    expect(errors.some((e) => e.ruleId === "guitar-field")).toBe(true);
  });

  it("coilSplit 만 있고 selector 없어도 rig 미해결이면 빌드 실패", () => {
    const { song, errors } = parsePatch(
      F.GUITAR_COILSPLIT,
      FILE,
      buildGuitarRegistry([], []),
    );
    expect(song).toBeNull();
    expect(errors.some((e) => e.ruleId === "guitar-field")).toBe(true);
  });

  it("coilSplit:true 인데 기타 모델이 코일스플릿 미명시면 경고(비실패)", () => {
    const noSplitReg = buildGuitarRegistry(
      [`---\nrig: g250-gp150\nguitar: cort-g250\n---\n`],
      [`---\nmodel: cort-g250\n---\n- **5-way 셀렉터**:\n  1. 브릿지 험버커\n  5. 넥\n- **코일 스플릿**: 확인 필요\n`],
    );
    const { song, errors, warnings } = parsePatch(F.GUITAR_COILSPLIT, FILE, noSplitReg);
    expect(errors).toEqual([]);
    expect(song).not.toBeNull();
    expect(song!.variations[0].guitar!.coilSplit).toBe(true);
    expect(warnings.some((w) => /코일 스플릿/.test(w.message))).toBe(true);
  });
});
