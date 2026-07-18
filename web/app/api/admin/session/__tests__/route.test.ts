import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { DELETE, POST } from "../route";

const { remove, set } = vi.hoisted(() => ({
  remove: vi.fn(),
  set: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ delete: remove, set }),
}));

describe("admin session route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_SECRET = "secret";
  });

  afterEach(() => {
    delete process.env.ADMIN_SECRET;
  });

  test("rejects a wrong password", async () => {
    const response = await POST(
      new Request("http://x/api/admin/session", {
        method: "POST",
        body: JSON.stringify({ password: "wrong" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(set).not.toHaveBeenCalled();
  });

  test("sets and clears the HttpOnly session", async () => {
    const response = await POST(
      new Request("http://x/api/admin/session", {
        method: "POST",
        body: JSON.stringify({ password: "secret" }),
      }),
    );

    expect(response.status).toBe(204);
    expect(set).toHaveBeenCalledWith(
      "guitar_admin",
      expect.any(String),
      expect.objectContaining({ httpOnly: true }),
    );
    expect((await DELETE()).status).toBe(204);
    expect(remove).toHaveBeenCalledWith("guitar_admin");
  });
});
