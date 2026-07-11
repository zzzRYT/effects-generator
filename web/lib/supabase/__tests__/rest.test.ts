import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

describe("Supabase REST adapter", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service";
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  test("selects with anon or service credentials", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: "a" }])))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: "b" }])));
    const { sbSelect } = await import("../rest");

    await expect(sbSelect("songs", "select=id")).resolves.toEqual([{ id: "a" }]);
    await expect(sbSelect("songs", "select=id", true)).resolves.toEqual([{ id: "b" }]);
    expect(vi.mocked(fetch).mock.calls[0][1]?.headers).toMatchObject({ apikey: "anon" });
    expect(vi.mocked(fetch).mock.calls[1][1]?.headers).toMatchObject({ apikey: "service" });
  });

  test("inserts, upserts and calls RPC with representation", async () => {
    vi.mocked(fetch).mockImplementation(async () =>
      new Response(JSON.stringify([{ id: "row" }])),
    );
    const { sbInsert, sbRpc } = await import("../rest");

    await sbInsert("songs", [{ title: "Song" }]);
    await sbInsert("songs", [{ title: "Song" }], { onConflict: "artist,title" });
    await sbRpc("save_tone", { id: "row" });

    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(
      "https://project.supabase.co/rest/v1/songs",
    );
    expect(vi.mocked(fetch).mock.calls[1][0]).toContain(
      "on_conflict=artist%2Ctitle",
    );
    expect(vi.mocked(fetch).mock.calls[1][1]?.headers).toMatchObject({
      Prefer: "return=representation,resolution=merge-duplicates",
    });
    expect(vi.mocked(fetch).mock.calls[2][0]).toContain("rpc/save_tone");
  });

  test("includes response detail on HTTP failure", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("denied", { status: 403 }));
    const { sbSelect } = await import("../rest");
    await expect(sbSelect("private", "", true)).rejects.toThrow(
      "Supabase 403 private: denied",
    );
  });

  test("fails clearly when URL or the selected key is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    let restModule = await import("../rest");
    await expect(restModule.sbSelect("songs")).rejects.toThrow(
      "NEXT_PUBLIC_SUPABASE_URL 미설정",
    );

    vi.resetModules();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    restModule = await import("../rest");
    await expect(restModule.sbSelect("songs", "", true)).rejects.toThrow(
      "SUPABASE_SERVICE_ROLE_KEY 미설정",
    );
  });
});
