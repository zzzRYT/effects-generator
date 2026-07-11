import { describe, expect, test } from "vitest";
import { createAdminSession, verifyAdminSession } from "../session";

describe("admin session", () => {
  test("accepts a signed unexpired session", async () => {
    const value = await createAdminSession("secret", 1_000, 3_600);
    await expect(verifyAdminSession(value, "secret", 2_000)).resolves.toBe(true);
  });

  test("rejects tampering, expiry, and the wrong secret", async () => {
    const value = await createAdminSession("secret", 1_000, 10);
    await expect(verifyAdminSession(`${value}x`, "secret", 1_001)).resolves.toBe(false);
    await expect(verifyAdminSession(value, "other", 1_001)).resolves.toBe(false);
    await expect(verifyAdminSession(value, "secret", 1_011)).resolves.toBe(false);
  });
});
