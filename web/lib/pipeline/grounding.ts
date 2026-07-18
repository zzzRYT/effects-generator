// ToneGrounding — 캐논 생성 프롬프트에 gear KB(approved) 대조 컨텍스트를 조립한다(설계 §1, §2 ③).
// 같은 gear 데이터로 (a) 프롬프트 컨텍스트 텍스트와 (b) 캐논 게이트용 KnownGear 집합을 함께 만든다 —
// AI 가 gear KB 어휘로 base_gear 를 지정하도록 유도하고, 그 산출을 같은 집합으로 검증(gate.validateCanon).

import { sbSelect } from "../supabase/rest";
import { slugify } from "../data/slugify";
import type { KnownGear } from "./gate";

export interface GearRow {
  name: string;
  category: string;
}

/** gear 목록 → 카테고리별 정리 텍스트(캐논 프롬프트 주입용). 빈 목록도 안전. */
export function buildGroundingContext(gear: readonly GearRow[]): string {
  if (gear.length === 0) {
    return "등록된 실기(gear KB)가 없음 — 일반 실기 지식으로 조사하되 근거를 sources 에 남길 것.";
  }
  const byCategory = new Map<string, string[]>();
  for (const g of gear) {
    const list = byCategory.get(g.category) ?? [];
    list.push(g.name);
    byCategory.set(g.category, list);
  }
  const lines = [...byCategory.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([category, names]) => `- ${category}: ${[...names].sort().join(", ")}`);
  return `알려진 실기(gear KB) — 가능하면 이 어휘로 base_gear 를 지정:\n${lines.join("\n")}`;
}

export interface GroundingDeps {
  select?: typeof sbSelect;
}

/** approved gear 조회 → 프롬프트 컨텍스트 + 게이트용 KnownGear. slugify 로 name_norm 일치(gate 와 동일 규칙). */
export async function loadGrounding(deps: GroundingDeps = {}): Promise<{ context: string; knownGear: KnownGear }> {
  const select = deps.select ?? sbSelect;
  const rows = await select<GearRow>("gear", "status=eq.approved&select=name,category");
  return {
    context: buildGroundingContext(rows),
    knownGear: { names: new Set(rows.map((r) => slugify(r.name))) },
  };
}
