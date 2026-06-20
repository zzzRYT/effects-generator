import { describe, it, expect } from "vitest";
import { parsePatch } from "../parsePatch";
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

  it("signal_chain block 순서를 보존한다", () => {
    const { song } = parsePatch(F.VALID, FILE);
    expect(song!.variations[0].signalChain.map((b) => b.type)).toEqual([
      "OD",
      "AMP",
      "CAB",
      "DLY",
      "RVB",
    ]);
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

  it("pickup 을 보존한다", () => {
    const { song } = parsePatch(F.VALID, FILE);
    expect(song!.variations[0].pickup).toBe("브릿지 험버커");
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
    ["BLOCK_MISSING_FIELD", F.BLOCK_MISSING_FIELD, "block-field"],
    ["KNOB_VALUE_NOT_NUMBER", F.KNOB_VALUE_NOT_NUMBER, "knob-field"],
    ["SWITCHING_MALFORMED", F.SWITCHING_MALFORMED, "switching-json"],
    ["UNCLOSED_FENCE", F.UNCLOSED_FENCE, "signal-chain-count"],
    ["JSON_NOT_ARRAY", F.JSON_NOT_ARRAY, "signal-chain-json"],
    ["BLOCK_BAD_FOOTSWITCH", F.BLOCK_BAD_FOOTSWITCH, "block-field"],
    ["BLOCK_IS_ARRAY", F.BLOCK_IS_ARRAY, "block-field"],
    ["KNOB_IS_ARRAY", F.KNOB_IS_ARRAY, "knob-field"],
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
