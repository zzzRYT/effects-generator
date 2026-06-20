import type { Song } from "@/lib/types";

// Song[] → web/lib/patches.generated.ts 소스. JSON.stringify 라 결정적(같은 입력 → 같은 바이트).
export function serialize(songs: readonly Song[]): string {
  const json = JSON.stringify(songs, null, 2);
  return [
    "// AUTO-GENERATED — 편집 금지. 출처: patches/**/*.md (docs/parser-contract.md).",
    "// 재생성: npm run gen:patches (빌드 시 next build 앞에서 자동 실행).",
    'import type { Song } from "./types";',
    "",
    `export const PATCHES: readonly Song[] = ${json};`,
    "",
  ].join("\n");
}
