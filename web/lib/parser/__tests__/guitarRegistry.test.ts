import { describe, it, expect } from "vitest";
import {
  parseRigMeta,
  parseGuitarModel,
  buildGuitarRegistry,
} from "../guitarRegistry";

const RIG_G250 = `---
rig: g250-gp150
guitar: cort-g250
processor: valeton-gp150
default: true
---

# Rig — G250 + GP-150
`;

const RIG_MISSING_GUITAR = `---
rig: broken-rig
processor: valeton-gp150
---
`;

const GUITAR_G250 = `---
model: cort-g250
type: guitar
name: Cort G250
pickups: HSS
---

# 기타 모델 — Cort G250

## 스펙

- **5-way 셀렉터** (S-스타일 배선):
  1. 브릿지 험버커
  2. 브릿지 + 미들
  3. 미들
  4. 미들 + 넥
  5. 넥
- **푸시-풀 톤 노브**: 브릿지 험버커 **코일 스플릿** → 싱글코일 톤 확보
`;

const GUITAR_XT = `---
model: xt-450
type: guitar
name: XT-450
pickups: HSS
---

# 기타 모델 — XT-450

- **5-way 셀렉터** (표준 HSS 배선 가정):
  1. 브릿지 험버커
  2. 브릿지 + 미들
  3. 미들
  4. 미들 + 넥
  5. 넥
- **코일 스플릿**: 확인 필요
`;

describe("parseRigMeta", () => {
  it("rig·guitar slug 를 추출한다", () => {
    expect(parseRigMeta(RIG_G250)).toEqual({
      rig: "g250-gp150",
      guitar: "cort-g250",
    });
  });

  it("guitar 키가 없으면 null", () => {
    expect(parseRigMeta(RIG_MISSING_GUITAR)).toBeNull();
  });
});

describe("parseGuitarModel", () => {
  it("5-way 셀렉터 맵을 1–5 → 이름으로 파싱한다", () => {
    const g = parseGuitarModel(GUITAR_G250)!;
    expect(g.model).toBe("cort-g250");
    expect(g.selectorMap.get(1)).toBe("브릿지 험버커");
    expect(g.selectorMap.get(5)).toBe("넥");
    expect(g.selectorMap.size).toBe(5);
  });

  it("코일 스플릿 명시(확인 필요 없음) → 지원", () => {
    expect(parseGuitarModel(GUITAR_G250)!.coilSplitSupported).toBe(true);
  });

  it("코일 스플릿이 '확인 필요' → 미지원", () => {
    expect(parseGuitarModel(GUITAR_XT)!.coilSplitSupported).toBe(false);
  });

  it("model frontmatter 없으면 null", () => {
    expect(parseGuitarModel("# 제목만\n내용")).toBeNull();
  });
});

describe("buildGuitarRegistry", () => {
  it("rig → 기타 모델의 셀렉터 맵을 잇는다", () => {
    const reg = buildGuitarRegistry([RIG_G250], [GUITAR_G250]);
    const info = reg.get("g250-gp150")!;
    expect(info.guitar).toBe("cort-g250");
    expect(info.selectorMap.get(1)).toBe("브릿지 험버커");
    expect(info.coilSplitSupported).toBe(true);
  });

  it("rig 가 가리키는 기타 모델이 없으면 그 rig 는 빠진다", () => {
    const reg = buildGuitarRegistry([RIG_G250], []); // 기타 모델 없음
    expect(reg.has("g250-gp150")).toBe(false);
  });

  it("frontmatter 깨진 rig 는 건너뛴다", () => {
    const reg = buildGuitarRegistry(
      [RIG_G250, RIG_MISSING_GUITAR],
      [GUITAR_G250],
    );
    expect(reg.size).toBe(1);
    expect(reg.has("g250-gp150")).toBe(true);
  });
});
