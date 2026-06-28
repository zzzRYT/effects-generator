import type { Song } from "@/lib/types";
import type { ParseError, ParseWarning } from "./errors";
import { parsePatch } from "./parsePatch";
import type { ParseOptions } from "./catalog";

export interface PatchFile {
  path: string;
  raw: string;
}

export interface ParseAllResult {
  songs: Song[];
  errors: ParseError[];
  warnings: ParseWarning[];
}

/**
 * 여러 패치 파일 → 집계. 에러는 모아서 반환(래퍼가 빌드 실패 판정). slug 정렬로 결정적.
 * options(카탈로그) 를 주면 각 패치의 block.model 을 프로세서 카탈로그와 대조 검증한다.
 */
export function parseAll(
  files: readonly PatchFile[],
  options?: ParseOptions,
): ParseAllResult {
  const songs: Song[] = [];
  const errors: ParseError[] = [];
  const warnings: ParseWarning[] = [];

  for (const f of files) {
    const r = parsePatch(f.raw, f.path, options);
    if (r.song) songs.push(r.song);
    errors.push(...r.errors);
    warnings.push(...r.warnings);
  }

  songs.sort((a, b) => a.slug.localeCompare(b.slug));
  return { songs, errors, warnings };
}

export { parsePatch } from "./parsePatch";
export { formatError, formatWarning } from "./errors";
export type { ParseError, ParseWarning } from "./errors";
export {
  extractCatalog,
  isKnownModel,
  resolveCatalog,
  type ModelCatalog,
  type CatalogByProcessor,
  type ProcessorByRig,
  type ParseOptions,
} from "./catalog";
