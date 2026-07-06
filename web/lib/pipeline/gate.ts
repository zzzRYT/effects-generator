// 검증 게이트 — 캐논/투영 산출물이 적재되기 전 통과해야 하는 순수 술어(설계 §2 ⑤, 헌법 "생성 품질 게이트").
// 캐논 게이트: 스키마 + gear KB 대조. 투영 게이트: 스키마 + FX 실존(processor 카탈로그) + 노브 범위.
// 조회 결과(knownGear/catalog)를 주입받는 순수 함수 — DB 없이 테스트 가능. 투영은 자동 수리 없음(§5).

import { isKnownModel, type ModelCatalog } from "../parser/catalog";
import { ALLOWED_TYPES, TYPE_CATEGORIES, validateKnobShape } from "../parser/validate";
import { slugify } from "../data/slugify";

export interface GateIssue {
  path: string; // 예: "chain[2].base_gear.name"
  message: string;
}
export interface GateResult {
  ok: boolean;
  issues: GateIssue[];
}

// 노브 scale 별 상한(unit 없는 노브의 sanity range). unit 있는 노브(ms·dB…)는 R1 범위 밖 — 카탈로그 노브 정의(R1+) 전까지 스킵.
const SCALE_MAX: Record<string, number> = { "0-10": 10, "0-100": 100 };

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// type/category 공통 규칙(캐논·투영 공유). validate.ts 상수를 재사용.
function typeCategoryIssue(b: Record<string, unknown>, path: string): GateIssue | null {
  if (typeof b.type !== "string" || !ALLOWED_TYPES.has(b.type)) {
    return { path: `${path}.type`, message: `type "${String(b.type)}" 가 허용목록 밖` };
  }
  if (b.category !== undefined && b.category !== null) {
    const allowed = TYPE_CATEGORIES[b.type];
    if (typeof b.category !== "string" || !allowed || !allowed.has(b.category)) {
      return { path: `${path}.category`, message: `category "${String(b.category)}" 가 type "${b.type}" 에 허용되지 않음` };
    }
  }
  return null;
}

function knobIssues(knobs: unknown, path: string): GateIssue[] {
  if (!Array.isArray(knobs)) return [{ path: `${path}.knobs`, message: "knobs 가 배열 아님" }];
  const issues: GateIssue[] = [];
  knobs.forEach((k, i) => {
    const kp = `${path}.knobs[${i}]`;
    const shape = validateKnobShape(k);
    if (shape) {
      issues.push({ path: kp, message: shape });
      return;
    }
    const knob = k as { name: string; value: number; unit?: string; scale?: string };
    if (knob.value < 0) {
      issues.push({ path: kp, message: `knob "${knob.name}" value 가 음수` });
    }
    if (knob.unit === undefined && knob.scale && SCALE_MAX[knob.scale] !== undefined && knob.value > SCALE_MAX[knob.scale]) {
      issues.push({ path: kp, message: `knob "${knob.name}" value ${knob.value} 가 ${knob.scale} 범위 초과` });
    }
  });
  return issues;
}

// ── 캐논 게이트 ────────────────────────────────────────
// knownGear: gear KB(approved)의 name_norm 집합(slugify 규칙). base_gear 실존 대조.
export interface KnownGear {
  names: ReadonlySet<string>;
}

/** 캐논 chain(null 이면 게이트 대상 아님) — 스키마 + gear KB 대조. */
export function validateCanon(chain: unknown, knownGear: KnownGear): GateResult {
  const issues: GateIssue[] = [];
  if (!Array.isArray(chain)) {
    return { ok: false, issues: [{ path: "chain", message: "chain 이 배열 아님" }] };
  }
  chain.forEach((block, i) => {
    const path = `chain[${i}]`;
    if (!isObject(block)) {
      issues.push({ path, message: "block 이 객체 아님" });
      return;
    }
    const tc = typeCategoryIssue(block, path);
    if (tc) issues.push(tc);
    if (typeof block.enabled !== "boolean") {
      issues.push({ path: `${path}.enabled`, message: "enabled 가 boolean 아님" });
    }
    // 캐논은 model 없음, base_gear required.
    const bg = block.base_gear;
    if (!isObject(bg) || typeof bg.name !== "string" || typeof bg.category !== "string") {
      issues.push({ path: `${path}.base_gear`, message: "base_gear 는 {name, category} 객체여야 함" });
    } else if (!knownGear.names.has(slugify(bg.name))) {
      issues.push({ path: `${path}.base_gear.name`, message: `실기 "${bg.name}" 가 gear KB 에 없음(어드민 등록 필요)` });
    }
    issues.push(...knobIssues(block.knobs, path));
  });
  return { ok: issues.length === 0, issues };
}

// ── 투영 게이트 ────────────────────────────────────────
/** 투영 signal_chain — 스키마 + FX 실존(카탈로그) + 노브 범위. 실패 시 데이터를 사람이 교정(자동 수리 없음). */
export function validateProjection(signalChain: unknown, catalog: ModelCatalog): GateResult {
  const issues: GateIssue[] = [];
  if (!Array.isArray(signalChain)) {
    return { ok: false, issues: [{ path: "signal_chain", message: "signal_chain 이 배열 아님" }] };
  }
  signalChain.forEach((block, i) => {
    const path = `signal_chain[${i}]`;
    if (!isObject(block)) {
      issues.push({ path, message: "block 이 객체 아님" });
      return;
    }
    const tc = typeCategoryIssue(block, path);
    if (tc) issues.push(tc);
    if (typeof block.enabled !== "boolean") {
      issues.push({ path: `${path}.enabled`, message: "enabled 가 boolean 아님" });
    }
    // 투영은 기기 model required + 카탈로그 실존.
    if (typeof block.model !== "string") {
      issues.push({ path: `${path}.model`, message: "model 누락 또는 문자열 아님" });
    } else if (!isKnownModel(block.model, catalog)) {
      issues.push({ path: `${path}.model`, message: `FX "${block.model}" 가 프로세서 카탈로그에 없음` });
    }
    issues.push(...knobIssues(block.knobs, path));
  });
  return { ok: issues.length === 0, issues };
}
