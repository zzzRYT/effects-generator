import type {
  Block,
  Footswitch,
  Knob,
  Song,
  SwitchingPlan,
  Variation,
} from "@/lib/types";
import type { ParseError, ParseWarning } from "./errors";
import { extractVariations, type RawVariation } from "./extractVariations";
import {
  missingFrontmatterKeys,
  validateBlockShape,
  validateKnobShape,
} from "./validate";
import { slugFromPath } from "./slug";

// optional 필드: undefined·null 둘 다 "없음"으로 본다 (null → String(null)="null" 방지).
const present = (v: unknown): boolean => v !== undefined && v !== null;
// 던져진 값이 Error 가 아닐 수도 있으니 안전하게 메시지 추출.
const errMsg = (e: unknown): string => (e instanceof Error ? e.message : String(e));

export interface ParseResult {
  song: Song | null;
  errors: ParseError[];
  warnings: ParseWarning[];
}

/**
 * 패치 md 1개 → Song. docs/parser-contract.md 5규칙을 검증하며, 위반은 errors 에 모은다.
 * 에러가 하나라도 있으면 song=null (빌드 실패 신호). 순수 함수 — 같은 입력 → 같은 출력.
 */
export function parsePatch(raw: string, file: string): ParseResult {
  const errors: ParseError[] = [];
  const warnings: ParseWarning[] = [];
  const ext = extractVariations(raw);

  // 규칙 1: frontmatter
  if (!ext.hasFrontmatter) {
    errors.push({
      file,
      line: 1,
      ruleId: "frontmatter-missing",
      message: "frontmatter(---) 가 없습니다",
    });
  } else {
    const missing = missingFrontmatterKeys(ext.frontmatter);
    if (missing.length) {
      errors.push({
        file,
        line: 1,
        ruleId: "frontmatter-missing",
        message: `frontmatter 필수 키 누락: ${missing.join(", ")}`,
      });
    }
  }

  // 규칙 2: 변주 ≥ 1
  if (ext.variations.length === 0) {
    errors.push({
      file,
      line: 1,
      ruleId: "signal-chain-count",
      message: "## Variation: 가 최소 1개 필요합니다",
    });
  }

  const variations: Variation[] = [];
  for (const rv of ext.variations) {
    const parsed = parseVariation(rv, file, errors, warnings);
    if (parsed) variations.push(parsed);
  }

  if (errors.length > 0) return { song: null, errors, warnings };

  const fm = ext.frontmatter;
  const song: Song = {
    artist: String(fm.artist),
    title: String(fm.title),
    rig: String(fm.rig),
    ...(present(fm.genre) ? { genre: String(fm.genre) } : {}),
    ...(present(fm.confidence) ? { confidence: String(fm.confidence) } : {}),
    slug: slugFromPath(file),
    variations,
  };
  return { song, errors, warnings };
}

function parseVariation(
  rv: RawVariation,
  file: string,
  errors: ParseError[],
  warnings: ParseWarning[],
): Variation | null {
  // 규칙 2: 펜스 정확히 1개 + 닫혀 있어야 함
  if (rv.fenceCount !== 1 || rv.signalChainRaw === null) {
    const reason =
      rv.fenceCount === 1 && rv.signalChainRaw === null
        ? "signal_chain 펜스가 닫히지 않았습니다 (``` 누락)"
        : `signal_chain 펜스가 정확히 1개여야 합니다 (현재 ${rv.fenceCount}개)`;
    errors.push({
      file,
      line: rv.signalChainLine,
      ruleId: "signal-chain-count",
      message: `변주 "${rv.label}": ${reason}`,
    });
    return null;
  }

  // 규칙 3: JSON 파싱 + 배열
  let arr: unknown;
  try {
    arr = JSON.parse(rv.signalChainRaw);
  } catch (e) {
    errors.push({
      file,
      line: rv.signalChainLine,
      ruleId: "signal-chain-json",
      message: `변주 "${rv.label}": signal_chain JSON 파싱 실패 — ${errMsg(e)}`,
    });
    return null;
  }
  if (!Array.isArray(arr)) {
    errors.push({
      file,
      line: rv.signalChainLine,
      ruleId: "signal-chain-json",
      message: `변주 "${rv.label}": signal_chain 이 배열이 아닙니다`,
    });
    return null;
  }

  // 규칙 4·5: block / knob
  const blocks: Block[] = [];
  let ok = true;
  arr.forEach((rawBlock, bi) => {
    const blockErr = validateBlockShape(rawBlock);
    if (blockErr) {
      errors.push({
        file,
        line: rv.signalChainLine,
        ruleId: "block-field",
        message: `변주 "${rv.label}" block#${bi}: ${blockErr}`,
      });
      ok = false;
      return;
    }
    const b = rawBlock as Record<string, unknown>;
    const knobs: Knob[] = [];
    for (const rawKnob of b.knobs as unknown[]) {
      const knobErr = validateKnobShape(rawKnob);
      if (knobErr) {
        errors.push({
          file,
          line: rv.signalChainLine,
          ruleId: "knob-field",
          message: `변주 "${rv.label}" block#${bi}: ${knobErr}`,
        });
        ok = false;
        continue;
      }
      const k = rawKnob as Record<string, unknown>;
      knobs.push({
        name: String(k.name),
        value: k.value as number,
        ...(present(k.unit) ? { unit: String(k.unit) } : {}),
        // scale 은 렌더 측 표기용 — 패치 md 엔 보통 없음. 있으면 보존만(검증 안 함).
        ...(present(k.scale) ? { scale: k.scale as Knob["scale"] } : {}),
      });
    }
    blocks.push({
      type: b.type as Block["type"],
      model: String(b.model),
      ...(present(b.base_gear) ? { base_gear: String(b.base_gear) } : {}),
      enabled: b.enabled as boolean,
      ...(present(b.footswitch) ? { footswitch: b.footswitch as Footswitch } : {}),
      knobs,
    });
  });

  if (!ok) return null;

  const switching = parseSwitching(rv, blocks, file, errors, warnings);
  if (switching === false) return null;

  return {
    label: rv.label,
    signalChain: blocks,
    ...(rv.pickup !== undefined ? { pickup: rv.pickup } : {}),
    ...(switching !== undefined ? { switching } : {}),
  };
}

/** switching: 라인 파싱 + blockModels 자동 추출. JSON 깨지면 false(=실패), 없으면 undefined. */
function parseSwitching(
  rv: RawVariation,
  blocks: Block[],
  file: string,
  errors: ParseError[],
  warnings: ParseWarning[],
): SwitchingPlan | undefined | false {
  if (!rv.switchingRaw) return undefined;
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(rv.switchingRaw) as Record<string, unknown>;
  } catch (e) {
    errors.push({
      file,
      line: rv.switchingLine,
      ruleId: "switching-json",
      message: `변주 "${rv.label}": switching JSON 파싱 실패 — ${errMsg(e)}`,
    });
    return false;
  }

  const plan: SwitchingPlan = {};
  for (const key of ["A", "B"] as const) {
    if (obj[key] === undefined) continue;
    const blockModels = blocks
      .filter((b) => b.footswitch === key)
      .map((b) => b.model);
    plan[key] = { description: String(obj[key]), blockModels };
    if (blockModels.length === 0) {
      warnings.push({
        file,
        line: rv.switchingLine,
        message: `변주 "${rv.label}": switching.${key} 에 매핑된 footswitch:${key} 블록이 없습니다 (설명만)`,
      });
    }
  }
  return plan;
}
