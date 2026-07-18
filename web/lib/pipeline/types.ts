// 파이프라인 공용 타입 계약. 설계 docs/plans/2026-07-06-canon-projection-revival-design.md §1 엔티티와 1:1.
// DB enum(supabase/migrations/20260706114215_r0_canon_projection_schema.sql)과 문자열 리터럴이 일치해야 한다.
// signal_chain block 모양은 lib/types.ts(Block/Knob)가 권위 — 여기선 캐논(base_gear 어휘) 계약만 정의.

import type { Block } from "../types";

// ── DB enum 미러 ──────────────────────────────────────
export const BODY_ARCHETYPES = ["strat", "tele", "lespaul", "sg", "superstrat", "hollow"] as const;
export type BodyArchetype = (typeof BODY_ARCHETYPES)[number];

export const TONE_ROLES = ["lead", "backing", "solo", "real_amp", "phone"] as const;
export type ToneRole = (typeof TONE_ROLES)[number];

export const GEAR_STATUSES = ["draft", "approved", "rejected"] as const;
export type GearStatus = (typeof GEAR_STATUSES)[number];

// ── Resolver ──────────────────────────────────────────
// 사용자 원본 입력. artist/song 은 validateGenerate 로 이미 검증된 값.
export interface ToneRequest {
  artist: string;
  title: string;
  /** 사용자가 입력한 실제 기타명(예: "Cort G250"). 내부에서 body_archetype 으로 정규화. */
  guitar: string;
  /** 사용자가 입력한 멀티이펙터명(예: "Valeton GP-150"). */
  processor: string;
}

// 미등록 기어 — "지원 준비중" + 문의 폼(기타·이펙터 추가 요청) 유도 신호(설계 §2 ①, §4).
export interface UnresolvedGear {
  kind: "guitar" | "processor";
  /** 사용자가 입력한 원본 문자열. 문의 폼 프리필용. */
  query: string;
}

// Resolver 성공 산출 — 정규화된 튜플. 이후 캐시 조회·캐논 생성·투영의 입력.
export interface ResolvedRequest {
  song: { id: string | null; artist_norm: string; title_norm: string };
  guitar: { id: string; slug: string; body_archetype: BodyArchetype };
  processor: { id: string; slug: string };
}

// Resolver 결과 — 전부 해소되면 resolved, 미등록 기어가 있으면 문의 유도.
export type ResolveResult =
  | { ok: true; resolved: ResolvedRequest }
  | { ok: false; unresolved: UnresolvedGear[] };

// ── 캐논 계약(§1 canonical_tones, §9 06-28) ─────────────
// 실기 어휘. 기기(model) 없음 — base_gear 로 서술. 투영이 이걸 기기 signal_chain 으로 변환.
export interface BaseGearRef {
  name: string; // 실기명, 예: "Ibanez TS-808"
  category: string; // 효과 종류(OD/FUZZ/AMP/DLY…). gear.category 와 대조.
  attributes?: Record<string, unknown>; // 매칭 근거(클리핑·게인성격·EQ 캐릭터)
  source?: string;
  confidence?: number;
}

// 캐논 체인 블록 — lib/types.ts Block 에서 기기 종속 필드(model)를 빼고 base_gear 를 required 로.
export interface CanonBlock {
  type: Block["type"];
  category?: Block["category"];
  base_gear: BaseGearRef;
  knobs: Block["knobs"]; // 실기 기준 값
  enabled: boolean;
  footswitch?: Block["footswitch"];
}

// canonical_tones 행(chain 또는 null_reason 중 하나).
export interface CanonicalTone {
  song_id: string;
  role: ToneRole;
  chain: CanonBlock[] | null;
  null_reason: string | null;
  confidence: number | null;
  sources: unknown[];
  model_used: string;
}
