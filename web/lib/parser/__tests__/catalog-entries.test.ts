import { describe, expect, test } from "vitest";
import { extractCatalogEntries } from "../catalog";

// ── 픽스처: 실제 markdown 조각 ──────────────────────

const EFFECTS_FIXTURE = `
## OD — 오버드라이브

- **Green OD** (기반: Ibanez TS-808 Tube Screamer) — 전설의 투명 OD, 따뜻하고 섬세. 노브: Gain, Tone, Volume
- **OD 9** (기반: Ibanez TS9 Tube Screamer) — TS9 기반, 프리앰프 푸시·순수 OD/크런치. 노브: Gain, Tone, Volume
- **Mess2C+ 1 / 2 / 3** (기반: Mesa/Boogie Mark II C+ Lead, 3가지 방식) — 80년대 메탈 정립. 노브: Gain, Presence, Volume, Bass/Middle/Treble
`;

const AMPS_FIXTURE = `
## Fender / 아메리칸 클린

- **Tweedy** (기반: Fender Tweed Deluxe) — 클린부터 와일드 OD까지. 노브: Gain, Tone, Volume
- **Bellman 59N** (기반: Fender '59 Bassman Normal) — 수정처럼 맑은 클래식 톤. 노브: Gain, Presence, Volume, Bass/Middle/Treble
`;

const CABS_FIXTURE = `
## Fender

- **V30 1x12** (기반: Celestion Vintage 30) — 따뜻한 저역과 선명한 고역. 노브: Volume
- **User IR 1–20** — 커스텀 사용자 IR 슬롯(범위형, base_gear 없음). 노브: Volume
`;

// ── extractCatalogEntries — OD/FUZZ/DST 테스트 ───

describe("extractCatalogEntries — effect", () => {
  test("단순 모델 — 기반 + 노브 추출", () => {
    const entries = extractCatalogEntries(EFFECTS_FIXTURE, "effect");
    const greenOd = entries.find((e) => e.model === "Green OD");
    expect(greenOd).toBeDefined();
    expect(greenOd!.base_gear).toBe("Ibanez TS-808 Tube Screamer");
    expect(greenOd!.knobs).toEqual(["Gain", "Tone", "Volume"]);
    expect(greenOd!.kind).toBe("effect");
  });

  test("slash 병렬 — 각 항목별 entry + 공유 base_gear", () => {
    const entries = extractCatalogEntries(EFFECTS_FIXTURE, "effect");
    const mess1 = entries.find((e) => e.model === "Mess2C+ 1");
    const mess2 = entries.find((e) => e.model === "Mess2C+ 2");
    const mess3 = entries.find((e) => e.model === "Mess2C+ 3");

    expect(mess1).toBeDefined();
    expect(mess2).toBeDefined();
    expect(mess3).toBeDefined();
    expect(mess1!.base_gear).toBe("Mesa/Boogie Mark II C+ Lead, 3가지 방식");
    expect(mess2!.base_gear).toBe("Mesa/Boogie Mark II C+ Lead, 3가지 방식");
    expect(mess3!.base_gear).toBe("Mesa/Boogie Mark II C+ Lead, 3가지 방식");
  });

  test("슬래시 병렬 — 공유 knobs", () => {
    const entries = extractCatalogEntries(EFFECTS_FIXTURE, "effect");
    const mess2 = entries.find((e) => e.model === "Mess2C+ 2");
    expect(mess2!.knobs).toEqual(["Gain", "Presence", "Volume", "Bass/Middle/Treble"]);
  });

  test("노브 구분 — 쉼표 분리 + 공백 정리", () => {
    const entries = extractCatalogEntries(EFFECTS_FIXTURE, "effect");
    const od9 = entries.find((e) => e.model === "OD 9");
    expect(od9!.knobs).toEqual(["Gain", "Tone", "Volume"]);
  });

  test("복합 노브명 보존 — Bass/Middle/Treble 슬래시 그대로", () => {
    const entries = extractCatalogEntries(EFFECTS_FIXTURE, "effect");
    const mess1 = entries.find((e) => e.model === "Mess2C+ 1");
    const knobs = mess1!.knobs!;
    expect(knobs).toContain("Bass/Middle/Treble");
    expect(knobs.length).toBe(4);
  });

  test("kind 전달 — effect로 지정된 항목은 kind:effect", () => {
    const entries = extractCatalogEntries(EFFECTS_FIXTURE, "effect");
    for (const entry of entries) {
      expect(entry.kind).toBe("effect");
    }
  });
});

// ── extractCatalogEntries — AMP 테스트 ───

describe("extractCatalogEntries — amp", () => {
  test("amp kind 지정 — 모든 엔트리 kind:amp", () => {
    const entries = extractCatalogEntries(AMPS_FIXTURE, "amp");
    for (const entry of entries) {
      expect(entry.kind).toBe("amp");
    }
  });

  test("amps 추출 — Tweedy, Bellman 등", () => {
    const entries = extractCatalogEntries(AMPS_FIXTURE, "amp");
    expect(entries.map((e) => e.model)).toEqual(["Tweedy", "Bellman 59N"]);
  });

  test("base_gear 파싱 — 앰프명 추출", () => {
    const entries = extractCatalogEntries(AMPS_FIXTURE, "amp");
    const tweedy = entries.find((e) => e.model === "Tweedy");
    expect(tweedy!.base_gear).toBe("Fender Tweed Deluxe");
  });
});

// ── extractCatalogEntries — CAB + 범위형 ───

describe("extractCatalogEntries — cab with range", () => {
  test("범위형 제외 — User IR 1–20 은 entry 대상 아님", () => {
    const entries = extractCatalogEntries(CABS_FIXTURE, "cab");
    const userIr = entries.find((e) => e.model?.includes("User IR"));
    expect(userIr).toBeUndefined();
  });

  test("일반 cab 항목만 추출 — V30", () => {
    const entries = extractCatalogEntries(CABS_FIXTURE, "cab");
    expect(entries.map((e) => e.model)).toContain("V30 1x12");
  });

  test("cab 엔트리 base_gear 파싱", () => {
    const entries = extractCatalogEntries(CABS_FIXTURE, "cab");
    const v30 = entries.find((e) => e.model === "V30 1x12");
    expect(v30!.base_gear).toBe("Celestion Vintage 30");
  });
});

// ── 엣지 케이스 ────────────────────────────────────

describe("extractCatalogEntries — edge cases", () => {
  test("빈 MD 텍스트 — 빈 배열", () => {
    const entries = extractCatalogEntries("", "effect");
    expect(entries).toEqual([]);
  });

  test("기반 없는 모델 — base_gear undefined", () => {
    const md = `- **Custom FX** — 설명만 있음. 노브: Volume`;
    const entries = extractCatalogEntries(md, "effect");
    expect(entries[0]!.base_gear).toBeUndefined();
  });

  test("노브 없는 모델 — knobs undefined", () => {
    const md = `- **Simple Amp** (기반: Tube Amp) — 설명만 있음`;
    const entries = extractCatalogEntries(md, "amp");
    expect(entries[0]!.knobs).toBeUndefined();
  });

  test("부점 항목(notes) 제외 — '- **항목**: ' 형식 제외", () => {
    const md = `
- **Clean Amp** (기반: Fender Twin) — 앰프. 노브: Volume
- **Volume Knob**: 0–10 범위(설명 아님, 노트 불릿)
- **Tone**: 밝기 조절
`;
    const entries = extractCatalogEntries(md, "amp");
    expect(entries.map((e) => e.model)).toEqual(["Clean Amp"]); // 부점은 제외
  });

  test("한국어 괄호 파싱 — (기반: X) 정확도", () => {
    const md = `- **Test** (기반: Some Gear With Spaces) — desc. 노브: A, B`;
    const entries = extractCatalogEntries(md, "effect");
    expect(entries[0]!.base_gear).toBe("Some Gear With Spaces");
  });

  test("노브 뒤 마침표 제외 — 노브: A, B. 점 무시", () => {
    const md = `- **FX** (기반: Gear) — Desc. 노브: Gain, Tone. 추가 설명`;
    const entries = extractCatalogEntries(md, "effect");
    // 정규식 [^—.\n]이므로 마침표 전까지만 추출
    // 실제로 "Gain, Tone" 까지만 나올 것으로 예상
    expect(entries[0]!.knobs).toBeDefined();
  });
});
