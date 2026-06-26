// DB 행(songs + patches) → 렌더러 Song 어댑터. 렌더러·types.ts 무변경 재사용을 위한 다리.
// DB variations JSONB = n8n 출력 shape(signal_chain snake, switching 문자열, guitar 에 selectorLabel 없음).
// 이 어댑터가 렌더러 타입(signalChain camel, switching {description,blockModels}, selectorLabel)으로 enrich.
// 권위: docs/plans/2026-06-26-web-dynamic-catalog-design.md §2~3.

import type {
  Block,
  GuitarSetting,
  Song,
  SwitchingPlan,
  Variation,
} from "@/lib/types";
import { G250_SELECTOR_MAP, PROCESSOR_RIG } from "@/lib/guitars/g250";
import { songSlug } from "./slugify";

export interface DbSong {
  id: string;
  artist: string;
  title: string;
  artist_norm: string;
  title_norm: string;
  created_at: string;
}

/** DB variations JSONB 안의 변주 1개(원시 n8n shape). */
export interface RawVariation {
  label: string;
  signal_chain: Block[];
  guitar?: {
    selector?: number;
    volume?: number;
    tone?: number;
    coilSplit?: boolean;
    note?: string;
  };
  /** {A: "설명", B: "설명"} — 단순 문자열 맵. */
  switching?: Record<string, string>;
}

export interface DbPatch {
  id: string;
  song_id: string;
  processor_slug: string;
  version: number;
  variations: RawVariation[];
  confidence: string | null;
  genre: string | null;
  model_used: string | null;
  status: string;
  created_at: string;
}

function adaptGuitar(g: RawVariation["guitar"]): GuitarSetting | undefined {
  if (!g) return undefined;
  const out: GuitarSetting = {
    selector: g.selector,
    volume: g.volume,
    tone: g.tone,
    coilSplit: g.coilSplit,
    note: g.note,
  };
  if (typeof g.selector === "number") {
    const label = G250_SELECTOR_MAP.get(g.selector);
    if (label) out.selectorLabel = label;
  }
  return out;
}

// switching {A:"설명"} → {A:{description, blockModels}}. blockModels = 그 변주에서 footswitch===key 인 block.model.
function adaptSwitching(
  switching: RawVariation["switching"],
  chain: Block[],
): SwitchingPlan | undefined {
  if (!switching) return undefined;
  const plan: SwitchingPlan = {};
  for (const key of ["A", "B"] as const) {
    const desc = switching[key];
    if (typeof desc === "string" && desc.trim()) {
      plan[key] = {
        description: desc,
        blockModels: chain.filter((b) => b.footswitch === key).map((b) => b.model),
      };
    }
  }
  return plan.A || plan.B ? plan : undefined;
}

function adaptVariation(v: RawVariation): Variation {
  const chain = v.signal_chain ?? [];
  return {
    label: v.label,
    signalChain: chain,
    guitar: adaptGuitar(v.guitar),
    switching: adaptSwitching(v.switching, chain),
  };
}

/** songs 행 + 그 곡의 patch 행 → 렌더러 Song. */
export function adaptPatch(song: DbSong, patch: DbPatch): Song {
  return {
    artist: song.artist,
    title: song.title,
    rig: PROCESSOR_RIG[patch.processor_slug] ?? patch.processor_slug,
    genre: patch.genre ?? undefined,
    confidence: patch.confidence ?? undefined,
    slug: songSlug(song.artist, song.title),
    variations: (patch.variations ?? []).map(adaptVariation),
  };
}
