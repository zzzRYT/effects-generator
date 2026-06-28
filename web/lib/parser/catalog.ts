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
