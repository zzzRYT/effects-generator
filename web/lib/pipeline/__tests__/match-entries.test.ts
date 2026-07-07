import { describe, expect, test } from "vitest";
import { buildReverseIndex, matchEntries } from "../projector";
import type { CatalogEntry } from "../../parser/catalog";

describe("matchEntries — 2단 룩업: 정확 매칭 → 경계 포함 매칭", () => {
  // 테스트용 카탈로그 엔트리
  const entries: CatalogEntry[] = [
    { model: "Green OD", kind: "effect", base_gear: "Ibanez TS-808 Tube Screamer" },
    { model: "OD 9", kind: "effect", base_gear: "Ibanez TS9" },
    { model: "Tweedy", kind: "amp", base_gear: "Fender Tweed Deluxe" },
    { model: "J-120", kind: "amp", base_gear: "Roland Jazz Chorus" },
    { model: "Green OD Alt", kind: "effect", base_gear: "Ibanez TS-808 Tube Screamer" },
  ];

  const index = buildReverseIndex(entries);

  test("정확 매칭 — 쿼리 slug가 엔트리 키와 정확 일치", () => {
    // "ibanez-ts-808-tube-screamer" 정확 일치
    const result = matchEntries("ibanez-ts-808-tube-screamer", index, "effect", "Ibanez TS-808 Tube Screamer");
    expect(result.approximateMatch).toBe(false);
    expect(result.entries.length).toBe(2); // Green OD, Green OD Alt
    expect(result.entries[0]!.model).toBe("Green OD");
  });

  test("경계 접두 매칭 — 쿼리 slug가 엔트리 키의 접두사", () => {
    // "ibanez-ts" starts "ibanez-ts-808-tube-screamer"
    const result = matchEntries("ibanez-ts", index, "effect", "Ibanez TS");
    expect(result.approximateMatch).toBe(true);
    expect(result.entries.length).toBeGreaterThan(0);
  });

  test("경계 접미 매칭 — 쿼리 slug가 엔트리 키의 접미사", () => {
    // "screamer" ends "ibanez-ts-808-tube-screamer"
    const result = matchEntries("tube-screamer", index, "effect", "Tube Screamer");
    expect(result.approximateMatch).toBe(true);
    expect(result.entries.length).toBeGreaterThan(0);
  });

  test("중간 부분문자열 불일치 — 'ts-80'은 'ts-808'과 매칭 안 됨", () => {
    const result = matchEntries("ts-80", index, "effect", "ts-80");
    expect(result.entries).toEqual([]);
  });

  test("kind 필터링 — 정확 매칭에서도 kind 필터링 적용", () => {
    // "ibanez-ts-808-tube-screamer"는 effect만 반환, amp는 아님
    const result = matchEntries("ibanez-ts-808-tube-screamer", index, "amp", "Ibanez TS-808");
    expect(result.entries).toEqual([]);
  });

  test("경계 매칭에서도 kind 필터링 적용", () => {
    // "ibanez"로 접두 매칭하면 effect만 반환
    const result = matchEntries("ibanez", index, "effect", "Ibanez");
    expect(result.entries.length).toBeGreaterThan(0);
    expect(result.entries.every((e) => e.kind === "effect")).toBe(true);
  });

  test("문서 순서 보존 — 1:N일 때 엔트리 삽입 순서", () => {
    const result = matchEntries("ibanez-ts-808-tube-screamer", index, "effect", "Ibanez TS-808 Tube Screamer");
    expect(result.entries[0]!.model).toBe("Green OD"); // 먼저 나타난 항목
    expect(result.entries[1]!.model).toBe("Green OD Alt");
  });

  test("미매핑 블록 — 후보 0일 때 빈 배열", () => {
    const result = matchEntries("unknown-gear", index, "effect", "Unknown Gear");
    expect(result.entries).toEqual([]);
    expect(result.approximateMatch).toBe(false);
  });

  test("경계 조건 다중매칭 중복 제거", () => {
    // "jazz"는 "roland-jazz-chorus"의 여러 경계 조건 만족 가능
    // (startswith, endswith 등) — 중복 제거 확인
    const result = matchEntries("jazz-chorus", index, "amp", "Jazz Chorus");
    expect(result.entries.length).toBeGreaterThan(0);
    // 같은 entry가 여러 번 나타나지 않아야 함
    const models = result.entries.map((e) => e.model);
    expect(new Set(models).size).toBe(models.length);
  });

  test("정확 매칭 우선 — 정확 후보가 있으면 경계 매칭하지 않음", () => {
    // "ibanez-ts9"는 정확 매칭 가능 → 경계 매칭 스킵
    const result = matchEntries("ibanez-ts9", index, "effect", "Ibanez TS9");
    expect(result.approximateMatch).toBe(false);
    expect(result.entries[0]!.model).toBe("OD 9");
  });
});
