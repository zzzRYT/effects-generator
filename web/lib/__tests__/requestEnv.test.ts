import { describe, it, expect } from "vitest";
import { resolveWeb3FormsKey } from "@/lib/requestEnv";

describe("resolveWeb3FormsKey (AC15)", () => {
  it("키가 있으면 그 값(trim)", () => {
    expect(resolveWeb3FormsKey("abc-123", "production")).toBe("abc-123");
    expect(resolveWeb3FormsKey("  abc-123  ", "development")).toBe("abc-123");
  });

  it("키 부재 + production → fail-fast throw", () => {
    expect(() => resolveWeb3FormsKey(undefined, "production")).toThrow();
    expect(() => resolveWeb3FormsKey("", "production")).toThrow();
    // NEXT_PUBLIC 미설정 시 Next 는 빈 문자열로 치환 → 그것도 부재로 취급
    expect(() => resolveWeb3FormsKey("   ", "production")).toThrow();
  });

  it("키 부재 + dev/test → placeholder(빌드/테스트가 키 없이 돈다)", () => {
    expect(resolveWeb3FormsKey(undefined, "development")).toBe("test-placeholder-key");
    expect(resolveWeb3FormsKey(undefined, "test")).toBe("test-placeholder-key");
    expect(resolveWeb3FormsKey("", undefined)).toBe("test-placeholder-key");
  });
});
