import type { Song } from "@/lib/types";
import type { ParseError, ParseWarning } from "./errors";
import { parsePatch } from "./parsePatch";

export interface PatchFile {
  path: string;
  raw: string;
}

export interface ParseAllResult {
  songs: Song[];
  errors: ParseError[];
  warnings: ParseWarning[];
}

/** 여러 패치 파일 → 집계. 에러는 모아서 반환(래퍼가 빌드 실패 판정). slug 정렬로 결정적. */
export function parseAll(files: readonly PatchFile[]): ParseAllResult {
  const songs: Song[] = [];
  const errors: ParseError[] = [];
  const warnings: ParseWarning[] = [];

  for (const f of files) {
    const r = parsePatch(f.raw, f.path);
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
