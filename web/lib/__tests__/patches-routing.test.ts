import { describe, it, expect } from "vitest";
import { PATCHES } from "../patches.generated";

// 라우트 /songs/[rig]/[song] 는 (rig, slug) 복합키로 곡을 찾는다.
// 이 키가 유일해야 모든 패치가 도달 가능하다(slug 단독은 rig 간 충돌 가능 — yb-white-whale).
describe("PATCHES — 라우트 키 (rig, slug) 유일성", () => {
  it("모든 (rig, slug) 복합키가 유일하다", () => {
    const keys = PATCHES.map((s) => `${s.rig}/${s.slug}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("slug 가 겹치는 곡이 있어도 rig 로 분리되어 각각 도달 가능", () => {
    const bySlug = new Map<string, Set<string>>();
    for (const s of PATCHES) {
      const rigs = bySlug.get(s.slug) ?? new Set<string>();
      rigs.add(s.rig);
      bySlug.set(s.slug, rigs);
    }
    // slug 가 중복되면 그 slug 의 rig 들은 서로 달라야 한다(같으면 도달 불가).
    for (const [slug, rigs] of bySlug) {
      const count = PATCHES.filter((s) => s.slug === slug).length;
      expect(rigs.size, `slug "${slug}" 의 rig 수`).toBe(count);
    }
  });
});
