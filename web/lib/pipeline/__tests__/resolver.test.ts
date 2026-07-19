import { describe, expect, test, vi } from "vitest";
import {
  matchGear,
  resolveCore,
  resolveRequest,
  slugTokens,
  slugVariants,
  type ResolverLookups,
} from "../resolver";
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
  test("songs 는 정규화 필터로, 기어는 approved 전체를 받아 매칭한다", async () => {
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
    // 기어는 slug=in.() 대신 approved 전체를 받아 순수 매칭(토큰 부분수열 tier 지원).
    const [, guitarsQ] = select.mock.calls.find((c) => c[0] === "guitars")!;
    expect(guitarsQ).toContain("status=eq.approved");
    expect(guitarsQ).not.toContain("slug=in");
    const [, procQ] = select.mock.calls.find((c) => c[0] === "processors")!;
    expect(procQ).toContain("status=eq.approved");
    expect(procQ).not.toContain("slug=in");
  });

  test("bare 모델 입력이 브랜드 프리픽스 slug 에 해소된다(토큰 부분수열)", async () => {
    const select = vi.fn(async (table: string) => {
      if (table === "guitars") return [{ id: "g1", slug: "cort-g250", body_archetype: "superstrat" }];
      if (table === "processors") return [{ id: "p1", slug: "valeton-gp150" }];
      return []; // songs empty → 신곡
    });

    const r = await resolveRequest(
      { artist: "Oasis", title: "Wonderwall", guitar: "G250", processor: "GP-150" },
      { select: select as never },
    );

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.resolved.guitar.slug).toBe("cort-g250");
    expect(r.resolved.processor.slug).toBe("valeton-gp150");
    expect(r.resolved.song.id).toBeNull();
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

describe("matchGear — 3단 매칭(정확 → 경계 → 토큰 부분수열)", () => {
  const guitars = [
    { id: "g1", slug: "cort-g250", body_archetype: "superstrat" as const },
    { id: "g2", slug: "fender-strat", body_archetype: "strat" as const },
  ];
  const procs = [{ id: "p1", slug: "valeton-gp150" }];

  test("정확: 브랜드까지 입력하면 exact slug 매치", () => {
    expect(matchGear("Cort G250", guitars)?.slug).toBe("cort-g250");
  });

  test("토큰 부분수열: bare 모델 'G250' → 'cort-g250'", () => {
    expect(matchGear("G250", guitars)?.slug).toBe("cort-g250");
  });

  test("경계+토큰: 'GP-150' → 'valeton-gp150'", () => {
    expect(matchGear("GP-150", procs)?.slug).toBe("valeton-gp150");
    expect(matchGear("GP150", procs)?.slug).toBe("valeton-gp150");
  });

  test("미등록 입력은 null(문의 유도)", () => {
    expect(matchGear("Ibanez RG", guitars)).toBeNull();
    expect(matchGear("", guitars)).toBeNull();
  });

  test("공통 토큰이 없으면 오매칭하지 않음('150' ≠ 'gp150')", () => {
    expect(matchGear("150", procs)).toBeNull();
  });
});

describe("slugTokens — 문자↔숫자 경계 하이픈 정규화 후 토큰 분할", () => {
  test.each([
    ["g250", ["g250"]],
    ["gp-150", ["gp150"]],
    ["cort-g250", ["cort", "g250"]],
    ["valeton-gp-150", ["valeton", "gp150"]],
  ])("%s → %o", (slug, tokens) => {
    expect(slugTokens(slug)).toEqual(tokens);
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
