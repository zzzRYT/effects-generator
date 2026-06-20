// 파일 경로 → slug. patches/<rig>/<file>.md → <file>.
export function slugFromPath(filePath: string): string {
  const base = filePath.split("/").pop() ?? filePath;
  return base.replace(/\.md$/i, "");
}
