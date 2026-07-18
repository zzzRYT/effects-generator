import type {
  Block,
  Footswitch,
  GuitarSetting,
  Knob,
  Song,
  SwitchingPlan,
  Variation,
} from "@/lib/types";
import type { ParseError, ParseWarning } from "./errors";
import { extractVariations, type RawVariation } from "./extractVariations";
import type { GuitarRegistry } from "./guitarRegistry";
import {
  missingFrontmatterKeys,
  validateBlockShape,
  validateKnobShape,
} from "./validate";
import {
  isKnownModel,
  resolveCatalog,
  type ModelCatalog,
  type ParseOptions,
} from "./catalog";
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
 * 패치 md 1개 → Song. docs/parser-contract.md 규칙을 검증하며, 위반은 errors 에 모은다.
 * 에러가 하나라도 있으면 song=null (빌드 실패 신호). 순수 함수 — 같은 입력 → 같은 출력.
 * registry 가 주어지면 guitar.selector → selectorLabel 을 rig→기타모델 맵에서 파생한다
 * (빌드 컨텍스트). 없으면 라벨 파생을 건너뛴다(단위 테스트 등).
 * options(카탈로그) 가 주어지면 block.model 을 그 rig 프로세서 카탈로그와 대조 검증한다(규칙 7).
 */
export function parsePatch(
  raw: string,
  file: string,
  registry?: GuitarRegistry,
  options?: ParseOptions,
): ParseResult {
  const errors: ParseError[] = [];
  const warnings: ParseWarning[] = [];
  const ext = extractVariations(raw);
  const rig = present(ext.frontmatter.rig)
    ? String(ext.frontmatter.rig)
    : undefined;
  // 모델 카탈로그: model 이 그 rig 프로세서에 실제 존재하는 모델명인지 검증(P7). 옵션 없으면 null=스킵.
  const allowedModels = resolveCatalog(rig ?? "", options);

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
    const parsed = parseVariation(
      rv,
      file,
      rig,
      registry,
      allowedModels,
      errors,
      warnings,
    );
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
  rig: string | undefined,
  registry: GuitarRegistry | undefined,
  allowedModels: ModelCatalog | null,
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
    // 규칙 7: model 이 그 프로세서 카탈로그에 실제 존재하는 모델명인가 (base-gear 이름 금지).
    if (allowedModels && !isKnownModel(String(b.model), allowedModels)) {
      errors.push({
        file,
        line: rv.signalChainLine,
        ruleId: "model-unknown",
        message: `변주 "${rv.label}" block#${bi}: model "${String(b.model)}" 가 프로세서 카탈로그에 없습니다 (models/processors/<proc> 의 매뉴얼 FX Title 사용; 실기 이름은 base_gear 로)`,
      });
      ok = false;
      return;
    }
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
      ...(present(b.category) ? { category: b.category as Block["category"] } : {}),
      model: String(b.model),
      ...(present(b.base_gear) ? { base_gear: String(b.base_gear) } : {}),
      enabled: b.enabled as boolean,
      ...(present(b.footswitch) ? { footswitch: b.footswitch as Footswitch } : {}),
      knobs,
    });
  });

  if (!ok) return null;

  const guitar = parseGuitar(rv, rig, registry, file, errors, warnings);
  if (guitar === false) return null;

  const switching = parseSwitching(rv, blocks, file, errors, warnings);
  if (switching === false) return null;

  return {
    label: rv.label,
    signalChain: blocks,
    ...(guitar !== undefined ? { guitar } : {}),
    ...(switching !== undefined ? { switching } : {}),
  };
}

/**
 * guitar: 라인 파싱 — 기타 본체 세팅(셀렉터/볼륨/톤/코일스플릿/메모).
 * JSON 깨짐·범위 위반은 false(=빌드 실패), 라인 없으면 undefined.
 * registry 가 있으면 selector → selectorLabel 을 rig→기타모델 맵에서 파생(없는 위치=실패).
 */
function parseGuitar(
  rv: RawVariation,
  rig: string | undefined,
  registry: GuitarRegistry | undefined,
  file: string,
  errors: ParseError[],
  warnings: ParseWarning[],
): GuitarSetting | undefined | false {
  if (!rv.guitarRaw) return undefined;

  let obj: unknown;
  try {
    obj = JSON.parse(rv.guitarRaw);
  } catch (e) {
    errors.push({
      file,
      line: rv.guitarLine,
      ruleId: "guitar-json",
      message: `변주 "${rv.label}": guitar JSON 파싱 실패 — ${errMsg(e)}`,
    });
    return false;
  }
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
    errors.push({
      file,
      line: rv.guitarLine,
      ruleId: "guitar-json",
      message: `변주 "${rv.label}": guitar 가 객체가 아닙니다`,
    });
    return false;
  }

  const g = obj as Record<string, unknown>;
  const fail = (message: string): false => {
    errors.push({ file, line: rv.guitarLine, ruleId: "guitar-field", message });
    return false;
  };
  const out: GuitarSetting = {};

  // 빌드 컨텍스트(registry 제공 + rig 정의)면 rig→기타모델 정보를 1회 해석한다.
  // rig 가 registry 에 없으면 selector 유무와 무관하게 빌드 실패(잘못된 rig 가 조용히 통과 방지).
  // registry 없거나(단위 테스트) rig 미정(frontmatter 규칙이 따로 잡음)이면 라벨 파생을 건너뛴다.
  const info = registry && rig ? registry.get(rig) : undefined;
  if (registry && rig && !info) {
    return fail(`변주 "${rv.label}": rig "${rig}" 의 기타 모델을 registry 에서 찾을 수 없습니다`);
  }

  // selector 1–5 (+ 라벨 파생)
  if (present(g.selector)) {
    const s = g.selector;
    if (typeof s !== "number" || !Number.isInteger(s) || s < 1 || s > 5) {
      return fail(`변주 "${rv.label}": guitar.selector 는 1–5 정수여야 합니다 (현재 ${String(s)})`);
    }
    out.selector = s;
    if (info) {
      const label = info.selectorMap.get(s);
      if (label === undefined) {
        return fail(`변주 "${rv.label}": selector ${s} 가 기타 모델 5-way 맵에 없습니다`);
      }
      out.selectorLabel = label;
    }
  }

  // volume / tone 0–10
  for (const key of ["volume", "tone"] as const) {
    if (!present(g[key])) continue;
    const v = g[key];
    if (typeof v !== "number" || Number.isNaN(v) || v < 0 || v > 10) {
      return fail(`변주 "${rv.label}": guitar.${key} 는 0–10 숫자여야 합니다 (현재 ${String(v)})`);
    }
    out[key] = v;
  }

  // coilSplit boolean (+ 미지원/미확인 기타면 경고)
  if (present(g.coilSplit)) {
    if (typeof g.coilSplit !== "boolean") {
      return fail(`변주 "${rv.label}": guitar.coilSplit 는 boolean 이어야 합니다`);
    }
    out.coilSplit = g.coilSplit;
    if (g.coilSplit && info && !info.coilSplitSupported) {
      warnings.push({
        file,
        line: rv.guitarLine,
        message: `변주 "${rv.label}": coilSplit:true 이지만 기타 모델(${info.guitar})에 코일 스플릿 지원이 명시되지 않았습니다`,
      });
    }
  }

  if (present(g.note)) out.note = String(g.note);

  return out;
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
