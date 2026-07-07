// 모델 카탈로그 — 프로세서별 "이 기기에 실제 존재하는 모델명" 허용목록.
// 패치 block.model 이 그 프로세서의 모델(매뉴얼 Effect List 의 FX Title)인지 빌드에서 검증한다.
// 실기/페달 이름(base-gear, 예: "TS-808")을 model 에 넣는 실수를 빌드에서 거른다 → base-gear 는 base_gear 필드 전용.
//
// 권위: docs/parser-contract.md ("model = 매뉴얼 FX Title"), models/processors/<proc>/{amps,cabs,effects}.md.
// 프로세서 비종속: 어떤 멀티이펙터든 models/processors/<그-기기>/ 카탈로그만 있으면 동일하게 동작한다.

export interface ModelCatalog {
  /** 정확히 일치해야 하는 모델명. */
  readonly exact: ReadonlySet<string>;
  /** 범위/슬롯형 모델(예: "User IR 1–20")의 접두사 — model.startsWith(prefix) 로 허용. */
  readonly prefixes: readonly string[];
}

export interface CatalogEntry {
  model: string;        // FX Title (예: "Green OD", "Mess2C+ 1")
  kind: "amp" | "cab" | "effect";
  base_gear?: string;   // "(기반: …)" 괄호 내용(기반: 뒤의 텍스트). 없으면 undefined.
  knobs?: string[];     // "노브: A, B, C" 나열(정보용). 없으면 undefined.
}

export type CatalogByProcessor = Readonly<Record<string, ModelCatalog>>;
export type ProcessorByRig = Readonly<Record<string, string>>;

export interface ParseOptions {
  /** 프로세서명 → 모델 카탈로그. 없으면 model 검증을 건너뛴다(유닛 테스트 호환). */
  catalogByProcessor?: CatalogByProcessor;
  /** rig slug → 프로세서명 (rigs/<rig>.md frontmatter 의 processor). */
  processorByRig?: ProcessorByRig;
}

// 모델 목록 항목만 매칭: "- **Name** (기반...)" / "- **Name** — 설명" / 바로 "- **Name**".
// 노트 불릿("- **클린 베이스**: ...", "- **Low Cut / High Cut**으로 ...")은 닫는 ** 뒤가 "(" · 대시 · 줄끝이 아니므로 제외.
const MODEL_ITEM = /^- \*\*([^*]+?)\*\*(?=\s*(?:\(|[—–-]|$))/gm;
// "User IR 1–20" / "Empty 1-50" 같은 범위형 → 접두사로 변환.
const RANGE = /^(.*?)\s*\d+\s*[–-]\s*\d+\s*$/;

/** 카탈로그 md 본문(amps/cabs/effects 여러 파일)에서 모델 허용목록 추출. 순수 함수. */
export function extractCatalog(mdTexts: readonly string[]): ModelCatalog {
  const exact = new Set<string>();
  const prefixes: string[] = [];

  for (const text of mdTexts) {
    for (const match of text.matchAll(MODEL_ITEM)) {
      const raw = match[1].trim();

      const range = RANGE.exec(raw);
      if (range) {
        prefixes.push(`${range[1].trim()} `);
        continue;
      }

      // "Mess2C+ 1 / 2 / 3" → "Mess2C+ 1" · "Mess2C+ 2" · "Mess2C+ 3"
      if (raw.includes(" / ")) {
        const parts = raw.split("/").map((s) => s.trim());
        const base = parts[0].replace(/\s+\S+$/, "").trim();
        for (const p of parts) exact.add(/^\d/.test(p) ? `${base} ${p}` : p);
        continue;
      }

      exact.add(raw);
    }
  }

  return { exact, prefixes };
}

/** 카탈로그 md 본문에서 base_gear 역인덱스 엔트리 추출 — model/base_gear/knobs 매핑.
 * kind 는 호출자가 전달: amps.md="amp", cabs.md="cab", effects.md="effect".
 * 규칙(extractCatalog와 동일 견고성):
 * - "- **Model Name** (기반: Real Gear)" → base_gear 추출, "(기반:…)" 괄호 내용
 * - "- **Model / 1 / 2 / 3**" 슬래시 병렬 → 각각 별도 entry, base_gear 공유
 * - "- **Range 1–20**" 범위형은 entries에서 완전히 제외(역인덱스 대상 아님).
 *   실제 md에서는 범위형(예: "User IR 1–20")이 기반 기어가 아니라 사용자 입력 슬롯이므로, ToneProjector의 역인덱스 룩업이 불필요.
 * - "노브: A, B, C" 뒤 쉼표 구분 목록 추출
 */
export function extractCatalogEntries(text: string, kind: "amp" | "cab" | "effect"): CatalogEntry[] {
  const entries: CatalogEntry[] = [];

  // 줄 단위 처리 — 각 모델명 라인과 그 뒤 설명(기반/노브)을 함께 읽어야 함.
  const lines = text.split("\n");
  for (const line of lines) {
    // MODEL_ITEM 은 전역 플래그 있음 — 각 line마다 lastIndex 리셋 필요.
    MODEL_ITEM.lastIndex = 0;
    const match = MODEL_ITEM.exec(line);
    if (!match) continue;

    // 범위형("User IR 1–20")은 진입점이지만 entry로는 단일(역인덱스 불가).
    const raw = match[1].trim();
    const range = RANGE.exec(raw);
    if (range) {
      // 범위형은 base_gear 없음 — 진입하지 않음.
      continue;
    }

    // 같은 줄에서 base_gear 추출: "(기반: …)"
    const baseGearMatch = line.match(/\(기반:\s*([^)]+)\)/);
    const base_gear = baseGearMatch ? baseGearMatch[1].trim() : undefined;

    // 같은 줄에서 knobs 추출: "노브: A, B, C"
    const knotsMatch = line.match(/노브:\s*([^—.\n]+)/);
    let knobs: string[] | undefined;
    if (knotsMatch) {
      // "Bass/Middle/Treble" 같은 슬래시 묶음은 그대로 두고, 쉼표로 구분.
      const rawKnobs = knotsMatch[1].trim();
      knobs = rawKnobs.split(",").map((k) => k.trim()).filter((k) => k.length > 0);
    }

    // 슬래시 병렬: "Mess2C+ 1 / 2 / 3"
    if (raw.includes(" / ")) {
      const parts = raw.split("/").map((s) => s.trim());
      const base = parts[0].replace(/\s+\S+$/, "").trim();
      for (const p of parts) {
        const model = /^\d/.test(p) ? `${base} ${p}` : p;
        entries.push({ model, kind, base_gear, knobs });
      }
      continue;
    }

    // 단일 모델.
    entries.push({ model: raw, kind, base_gear, knobs });
  }

  // MODEL_ITEM의 전역 상태 초기화(각 호출이 독립적이어야 함).
  MODEL_ITEM.lastIndex = 0;

  return entries;
}

/** model 이 카탈로그에 존재하는 모델명인가. */
export function isKnownModel(model: string, cat: ModelCatalog): boolean {
  return cat.exact.has(model) || cat.prefixes.some((p) => model.startsWith(p));
}

/** rig → 프로세서 → 카탈로그. 옵션/매핑이 없으면 null(검증 스킵). */
export function resolveCatalog(
  rig: string,
  options?: ParseOptions,
): ModelCatalog | null {
  if (!options?.catalogByProcessor || !options.processorByRig) return null;
  const processor = options.processorByRig[rig];
  if (!processor) return null;
  return options.catalogByProcessor[processor] ?? null;
}
