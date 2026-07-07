import { describe, expect, test } from "vitest";
import { buildCanonPrompt, buildResearchPrompt } from "../prompts";

describe("buildResearchPrompt", () => {
  test("곡·아티스트와 JSON 스키마를 포함", () => {
    const { system, user } = buildResearchPrompt("Oasis", "Wonderwall");
    expect(system).toMatch(/리서처/);
    expect(user).toContain("Wonderwall");
    expect(user).toContain("Oasis");
    expect(user).toContain('"gear"');
    expect(user).toContain('"sources"');
  });
});

describe("buildCanonPrompt", () => {
  const base = { artist: "Oasis", title: "Wonderwall", research: { notes: "n" }, grounding: "등록된 실기 없음" };

  test("3-role 정의·base_gear 스키마·기기무관 규칙 포함", () => {
    const { system, user } = buildCanonPrompt(base);
    expect(system).toMatch(/기기와 무관|기기무관/);
    expect(system).toMatch(/모델명.*쓰지/);
    expect(user).toContain("lead");
    expect(user).toContain("backing");
    expect(user).toContain("solo");
    expect(user).toContain("base_gear");
  });

  test("리서치 노트와 그라운딩 컨텍스트를 주입", () => {
    const { user } = buildCanonPrompt(base);
    expect(user).toContain('"notes":"n"');
    expect(user).toContain("등록된 실기 없음");
  });

  test("허용 블록 타입 목록을 parser 상수에서 렌더", () => {
    const { user } = buildCanonPrompt(base);
    expect(user).toContain("AMP");
    expect(user).toContain("DST");
    expect(user).toContain("RVB");
    // 단일 의미 모듈엔 category 금지 안내
    expect(user).toMatch(/category .*금지|그 외 타입엔 category 금지/);
  });
});
