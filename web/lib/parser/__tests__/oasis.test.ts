import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parsePatch } from "../parsePatch";

// vitest root = web/ → 실제 SoT 패치는 ../patches/.
const OASIS_PATH = resolve(
  process.cwd(),
  "../patches/g250-gp150/oasis-dont-look-back-in-anger.md",
);
const OASIS_FILE = "patches/g250-gp150/oasis-dont-look-back-in-anger.md";

describe("실제 데이터 — 오아시스 3변주 (AC1)", () => {
  const raw = readFileSync(OASIS_PATH, "utf8");
  const { song, errors, warnings } = parsePatch(raw, OASIS_FILE);

  it("에러 없이 파싱된다", () => {
    expect(errors).toEqual([]);
    expect(song).not.toBeNull();
  });

  it("3변주 / 16블록 / 44노브", () => {
    expect(song!.variations).toHaveLength(3);
    const blocks = song!.variations.flatMap((v) => v.signalChain);
    expect(blocks).toHaveLength(16);
    const knobs = blocks.flatMap((b) => b.knobs);
    expect(knobs).toHaveLength(44);
  });

  it("정석 JCM800: UK 800 Gain 5.5 / Mid 7", () => {
    const v = song!.variations[0];
    expect(v.label).toBe("정석 JCM800");
    const amp = v.signalChain.find((b) => b.type === "AMP")!;
    expect(amp.model).toBe("UK 800");
    expect(amp.knobs.find((k) => k.name === "Gain")!.value).toBe(5.5);
    expect(amp.knobs.find((k) => k.name === "Mid")!.value).toBe(7);
  });

  it("Green OD 솔로 부스트는 DST 모듈 + category OD (모듈 택소노미 회귀 가드)", () => {
    const blocks = song!.variations.flatMap((v) => v.signalChain);
    const ts = blocks.filter((b) => b.model === "Green OD");
    expect(ts.length).toBeGreaterThan(0);
    for (const b of ts) {
      expect(b.type).toBe("DST"); // OD 모듈이 아니라 DST 모듈의 모델
      expect(b.category).toBe("OD");
    }
    // 단일 의미 모듈(AMP)엔 category 없음
    const amp = blocks.find((b) => b.type === "AMP")!;
    expect("category" in amp).toBe(false);
  });

  it("CAB 은 IR-only(빈 knobs)", () => {
    const cab = song!.variations[0].signalChain.find((b) => b.type === "CAB")!;
    expect(cab.knobs).toEqual([]);
  });

  it("Slapback DLY Time 120ms", () => {
    const dly = song!.variations[0].signalChain.find((b) => b.type === "DLY")!;
    const time = dly.knobs.find((k) => k.name === "Time")!;
    expect(time.value).toBe(120);
    expect(time.unit).toBe("ms");
  });

  it("정석: switching A blockModels = [Green OD, Slapback]", () => {
    expect(song!.variations[0].switching!.A!.blockModels).toEqual([
      "Green OD",
      "Slapback",
    ]);
  });

  it("합주용 변주: EQ(footswitch B) + switching A/B 정합", () => {
    const v3 = song!.variations[2];
    const eq = v3.signalChain.find((b) => b.type === "EQ")!;
    expect(eq.footswitch).toBe("B");
    expect(v3.switching!.B!.blockModels).toEqual(["Guitar EQ 1"]);
    expect(v3.switching!.A!.blockModels).toEqual(["Slapback"]);
  });

  it("실데이터는 경고 없음", () => {
    expect(warnings).toEqual([]);
  });
});
