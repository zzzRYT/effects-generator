import { describe, expect, test, vi } from "vitest";
import { matchGearRow, resolveCore, resolveRequest, slugVariants, type ResolverLookups } from "../resolver";
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
  test("queries songs/guitars/processors with normalized filters and approved gate", async () => {
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
    expect(guitarsQ).toContain("status=eq.approved");
    const [, procQ] = select.mock.calls.find((c) => c[0] === "processors")!;
    expect(procQ).toContain("status=eq.approved");
  });

  test("모델명 단독 입력('G250'/'GP-150')이 브랜드 포함 slug(cort-g250/valeton-gp150)로 해소된다", async () => {
    const select = vi.fn(async (table: string) => {
      if (table === "guitars") return [GUITAR];
      if (table === "processors") return [{ id: "p1", slug: "valeton-gp150" }];
      return []; // songs empty (new)
    });

    const r = await resolveRequest(
      { ...REQ, guitar: "G250", processor: "GP-150" },
      { select: select as never },
    );

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.resolved.guitar.slug).toBe("cort-g250");
    expect(r.resolved.processor.slug).toBe("valeton-gp150");
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

describe("matchGearRow — slug 변형 정확 일치 → 하이픈 경계 접미 매칭", () => {
  const ROWS = [
    { id: "g1", slug: "cort-g250" },
    { id: "g2", slug: "xt-450" },
  ];

  test("정확 일치가 최우선", () => {
    expect(matchGearRow(slugVariants("Cort G250"), ROWS)?.id).toBe("g1");
  });

  test("모델명 단독 → 브랜드 포함 slug 접미 매칭 ('G250' → cort-g250)", () => {
    expect(matchGearRow(slugVariants("G250"), ROWS)?.id).toBe("g1");
  });

  test("입력이 더 길 때 역방향 접미 매칭 ('Unknown XT-450' → xt-450)", () => {
    expect(matchGearRow(slugVariants("Unknown XT-450"), ROWS)?.id).toBe("g2");
  });

  test("경계 없는 부분 문자열은 매칭하지 않는다 ('250' ↛ cort-g250)", () => {
    expect(matchGearRow(slugVariants("250"), ROWS)).toBeNull();
  });

  test("무관한 입력 → null", () => {
    expect(matchGearRow(slugVariants("Boss GT-1"), ROWS)).toBeNull();
  });
});

describe("slugVariants — 문자↔숫자 경계 하이픈 변형(정적/동적 슬러그 규약 호환)", () => {
  test('"Valeton GP-150" → 변형 집합에 "valeton-gp150"(DB slug) 포함', () => {
    const v = slugVariants("Valeton GP-150");
    expect(v).toContain("valeton-gp-150");
    expect(v).toContain("valeton-gp150");
  });

  test('"Valeton GP150" → 변형 집합에 "valeton-gp-150" 포함', () => {
    const v = slugVariants("Valeton GP150");
    expect(v).toContain("valeton-gp150");
    expect(v).toContain("valeton-gp-150");
  });

  test('"Cort G250" 동작 불변 — 기존 slug 그대로 포함', () => {
    expect(slugVariants("Cort G250")).toContain("cort-g250");
  });

  test("변형은 중복 없는 집합", () => {
    const v = slugVariants("Boss DS-1");
    expect(new Set(v).size).toBe(v.length);
  });
});
