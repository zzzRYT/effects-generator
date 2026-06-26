import { beforeEach, describe, expect, test } from "vitest";
import { _resetRateLimit, rateLimit } from "../rateLimit";

describe("rateLimit", () => {
  beforeEach(() => _resetRateLimit());

  test("창 내 MAX(5)까지 허용, 초과 거부", () => {
    const ip = "1.2.3.4";
    for (let i = 0; i < 5; i++) expect(rateLimit(ip, 1000).ok).toBe(true);
    const blocked = rateLimit(ip, 1000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  test("창(60s) 경과 후 다시 허용", () => {
    const ip = "5.6.7.8";
    for (let i = 0; i < 5; i++) rateLimit(ip, 1000);
    expect(rateLimit(ip, 1000).ok).toBe(false);
    expect(rateLimit(ip, 1000 + 61_000).ok).toBe(true);
  });

  test("IP 별 독립 카운팅", () => {
    for (let i = 0; i < 5; i++) rateLimit("a", 1000);
    expect(rateLimit("a", 1000).ok).toBe(false);
    expect(rateLimit("b", 1000).ok).toBe(true);
  });
});
