import { describe, it, expect } from "vitest";
import {
  extractCatalog,
  isKnownModel,
  resolveCatalog,
} from "../catalog";
import { parsePatch } from "../parsePatch";

// 카탈로그 md 의 모델 목록 형태(amps/cabs/effects 와 동일 컨벤션)를 본뜬 픽스처.
const EFFECTS_MD = `# 이펙트

## OD — 오버드라이브
- **Green OD** (기반: Ibanez TS-808) — 전설의 투명 OD
- **OD 9** (기반: Ibanez TS9) — TS9 기반
- **A-Wah** — 오토 필터

## NR
- **Gate 1** (기반: ISP Decimator) — 선형 릴리즈

## 사용 원칙
- **클린 베이스**: Green OD 추천 — 이건 노트지 모델 아님
- **Low Cut / High Cut**으로 정리 — 이것도 노트
`;

const AMPS_MD = `# 앰프
- **UK 800** (기반: Marshall JCM800) — 80년대 록
- **Mess2C+ 1 / 2 / 3** (기반: Mesa Mark II C+) — 메탈
- **SnapTone** — NAM 로드용
`;

const CABS_MD = `# 캐비넷
- **Twin 2x12** (기반: Fender '65 Twin Reverb) — 2x12
- **User IR 1–20** — 외부 IR 20슬롯
`;

describe("extractCatalog", () => {
  const cat = extractCatalog([EFFECTS_MD, AMPS_MD, CABS_MD]);

  it("모델 목록 항목을 정확히 추출한다", () => {
    expect(cat.exact.has("Green OD")).toBe(true);
    expect(cat.exact.has("OD 9")).toBe(true);
    expect(cat.exact.has("A-Wah")).toBe(true);
    expect(cat.exact.has("Gate 1")).toBe(true);
    expect(cat.exact.has("UK 800")).toBe(true);
    expect(cat.exact.has("Twin 2x12")).toBe(true);
    expect(cat.exact.has("SnapTone")).toBe(true);
  });

  it("노트 불릿(**라벨**: ... / **...**으로)은 모델로 잡지 않는다", () => {
    expect(cat.exact.has("클린 베이스")).toBe(false);
    expect(cat.exact.has("Low Cut / High Cut")).toBe(false);
    expect(cat.exact.has("High Cut")).toBe(false);
  });

  it('"A / B / C" 콤보를 개별 모델로 펼친다', () => {
    expect(cat.exact.has("Mess2C+ 1")).toBe(true);
    expect(cat.exact.has("Mess2C+ 2")).toBe(true);
    expect(cat.exact.has("Mess2C+ 3")).toBe(true);
  });

  it("범위형(1–20)은 접두사로 등록한다", () => {
    expect(cat.prefixes).toContain("User IR ");
    expect(cat.exact.has("User IR 1–20")).toBe(false);
  });
});

describe("isKnownModel", () => {
  const cat = extractCatalog([EFFECTS_MD, AMPS_MD, CABS_MD]);

  it("정확 일치 모델을 허용한다", () => {
    expect(isKnownModel("Green OD", cat)).toBe(true);
    expect(isKnownModel("Mess2C+ 2", cat)).toBe(true);
  });

  it("범위형 접두사 모델을 허용한다", () => {
    expect(isKnownModel("User IR 7", cat)).toBe(true);
  });

  it("base-gear 이름(실기명)은 거부한다", () => {
    expect(isKnownModel("TS-808", cat)).toBe(false); // → Green OD 여야 함
    expect(isKnownModel("Fuzz Face", cat)).toBe(false); // → Red Haze
    expect(isKnownModel("EP Booster", cat)).toBe(false); // → Boost
    expect(isKnownModel("Fender '65 Twin Reverb", cat)).toBe(false); // → Twin 2x12 (CAB)
  });
});

describe("resolveCatalog", () => {
  const cat = extractCatalog([EFFECTS_MD]);
  const options = {
    catalogByProcessor: { "valeton-gp150": cat },
    processorByRig: { "g250-gp150": "valeton-gp150" },
  };

  it("rig → 프로세서 → 카탈로그를 해석한다", () => {
    expect(resolveCatalog("g250-gp150", options)).toBe(cat);
  });

  it("옵션·매핑이 없으면 null(검증 스킵)", () => {
    expect(resolveCatalog("g250-gp150")).toBeNull();
    expect(resolveCatalog("unknown-rig", options)).toBeNull();
  });
});

describe("parsePatch 모델 카탈로그 게이트", () => {
  const cat = extractCatalog([EFFECTS_MD, AMPS_MD, CABS_MD]);
  const options = {
    catalogByProcessor: { "valeton-gp150": cat },
    processorByRig: { "g250-gp150": "valeton-gp150" },
  };

  const patch = (model: string) => `---
artist: Test
title: T
rig: g250-gp150
---

## Variation: v
\`\`\`signal_chain
[{"type":"DST","category":"OD","model":"${model}","enabled":true,"knobs":[]}]
\`\`\`
`;

  it("카탈로그에 있는 model 은 통과한다", () => {
    const { song, errors } = parsePatch(patch("Green OD"), "patches/g250-gp150/t.md", options);
    expect(errors).toHaveLength(0);
    expect(song).not.toBeNull();
  });

  it("base-gear 이름은 model-unknown 에러로 빌드를 막는다", () => {
    const { song, errors } = parsePatch(patch("TS-808"), "patches/g250-gp150/t.md", options);
    expect(song).toBeNull();
    expect(errors.some((e) => e.ruleId === "model-unknown")).toBe(true);
  });

  it("옵션을 안 주면 model 검증을 건너뛴다(하위호환)", () => {
    const { errors } = parsePatch(patch("TS-808"), "patches/g250-gp150/t.md");
    expect(errors.some((e) => e.ruleId === "model-unknown")).toBe(false);
  });
});
