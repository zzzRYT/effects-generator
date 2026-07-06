import { describe, expect, test, vi } from "vitest";
import { resolveCore, resolveRequest, type ResolverLookups } from "../resolver";
import type { ToneRequest } from "../types";

const REQ: ToneRequest = {
  artist: " Oasis ",
  title: "Wonderwall",
  guitar: "Cort G250",
  processor: "Valeton GP-150",
};

const GUITAR = { id: "g1", slug: "cort-g250", body_archetype: "superstrat" as const };
const PROC = { id: "p1", slug: "valeton-gp-150" };

describe("resolveCore", () => {
  test("resolves normalized tuple when both gear registered (existing song)", () => {
    const lu: ResolverLookups = { songId: "s1", guitar: GUITAR, processor: PROC };
    const r = resolveCore(REQ, lu);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.resolved.song).toEqual({ id: "s1", artist_norm: "oasis", title_norm: "wonderwall" });
    expect(r.resolved.guitar).toEqual(GUITAR);
    expect(r.resolved.processor).toEqual(PROC);
  });

  test("new song → song.id null but still resolved", () => {
    const lu: ResolverLookups = { songId: null, guitar: GUITAR, processor: PROC };
    const r = resolveCore(REQ, lu);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.resolved.song.id).toBeNull();
  });

  test("unregistered guitar → unresolved guitar with trimmed query", () => {
    const lu: ResolverLookups = { songId: "s1", guitar: null, processor: PROC };
    const r = resolveCore({ ...REQ, guitar: "  Fancy Custom  " }, lu);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.unresolved).toEqual([{ kind: "guitar", query: "Fancy Custom" }]);
  });

  test("both gear unregistered → both reported", () => {
    const lu: ResolverLookups = { songId: null, guitar: null, processor: null };
    const r = resolveCore(REQ, lu);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.unresolved.map((u) => u.kind)).toEqual(["guitar", "processor"]);
  });
});

describe("resolveRequest", () => {
  test("queries songs/guitars/processors with normalized+slugified filters and approved gate", async () => {
    const select = vi.fn(async (table: string) => {
      if (table === "songs") return [{ id: "s1" }];
      if (table === "guitars") return [GUITAR];
      if (table === "processors") return [PROC];
      return [];
    });

    const r = await resolveRequest(REQ, { select: select as never });

    expect(r.ok).toBe(true);
    const tables = select.mock.calls.map((c) => c[0]);
    expect(tables).toEqual(["songs", "guitars", "processors"]);
    const [, songsQ] = select.mock.calls.find((c) => c[0] === "songs")!;
    expect(songsQ).toContain("artist_norm=eq.oasis");
    expect(songsQ).toContain("title_norm=eq.wonderwall");
    const [, guitarsQ] = select.mock.calls.find((c) => c[0] === "guitars")!;
    expect(guitarsQ).toContain("slug=eq.cort-g250");
    expect(guitarsQ).toContain("status=eq.approved");
    const [, procQ] = select.mock.calls.find((c) => c[0] === "processors")!;
    expect(procQ).toContain("slug=eq.valeton-gp-150");
  });

  test("missing processor row → unresolved processor", async () => {
    const select = vi.fn(async (table: string) => {
      if (table === "guitars") return [GUITAR];
      return []; // songs empty (new), processors empty (unregistered)
    });

    const r = await resolveRequest(REQ, { select: select as never });

    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.unresolved).toEqual([{ kind: "processor", query: "Valeton GP-150" }]);
  });
});
