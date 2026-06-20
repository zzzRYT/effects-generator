import matter from "gray-matter";

// 줄글은 건드리지 않고, 기계가 읽는 부분(frontmatter + ## Variation 블록의 signal_chain 펜스·pickup·switching)만
// 라인 번호와 함께 추출한다. JSON 파싱·검증은 parsePatch 가 한다.

export interface RawVariation {
  label: string;
  /** ## Variation: 줄 (1-based). */
  startLine: number;
  fenceCount: number;
  /** 첫 signal_chain 펜스의 내용(JSON 문자열). 없으면 null. */
  signalChainRaw: string | null;
  /** 펜스 시작 줄 (1-based). */
  signalChainLine: number;
  pickup?: string;
  switchingRaw?: string;
  switchingLine: number;
}

export interface ExtractResult {
  hasFrontmatter: boolean;
  frontmatter: Record<string, unknown>;
  variations: RawVariation[];
}

const FENCE_OPEN = "```signal_chain";
const FENCE_CLOSE = "```";

export function extractVariations(raw: string): ExtractResult {
  const lines = raw.split("\n");
  const hasFrontmatter = lines[0]?.trim() === "---";

  let bodyStart = 0;
  if (hasFrontmatter) {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === "---") {
        bodyStart = i + 1;
        break;
      }
    }
  }

  let frontmatter: Record<string, unknown> = {};
  if (hasFrontmatter) {
    try {
      frontmatter = matter(raw).data as Record<string, unknown>;
    } catch {
      frontmatter = {};
    }
  }

  const heads: Array<{ label: string; line: number }> = [];
  for (let i = bodyStart; i < lines.length; i++) {
    const m = lines[i].match(/^##\s+Variation:\s*(.*)$/);
    if (m) heads.push({ label: m[1].trim(), line: i + 1 });
  }

  const variations = heads.map((head, idx) => {
    const startIdx = head.line - 1;
    const endIdx = idx + 1 < heads.length ? heads[idx + 1].line - 1 : lines.length;
    return parseRegion(lines, startIdx, endIdx, head.label, head.line);
  });

  return { hasFrontmatter, frontmatter, variations };
}

function parseRegion(
  lines: string[],
  startIdx: number,
  endIdx: number,
  label: string,
  startLine: number,
): RawVariation {
  let fenceCount = 0;
  let signalChainRaw: string | null = null;
  let signalChainLine = startLine;
  let pickup: string | undefined;
  let switchingRaw: string | undefined;
  let switchingLine = startLine;

  let i = startIdx;
  while (i < endIdx) {
    const line = lines[i];

    if (line.trim() === FENCE_OPEN) {
      fenceCount++;
      const fenceStart = i + 1;
      const buf: string[] = [];
      i++;
      let closed = false;
      while (i < endIdx) {
        if (lines[i].trim() === FENCE_CLOSE) {
          closed = true;
          break;
        }
        buf.push(lines[i]);
        i++;
      }
      if (fenceCount === 1) {
        // 안 닫힌 펜스(EOF/다음 변주까지 ``` 없음)는 null → parsePatch 규칙2에서 잡힘.
        signalChainRaw = closed ? buf.join("\n") : null;
        signalChainLine = fenceStart;
      }
      if (closed) i++; // 닫는 ``` 넘김
      continue;
    }

    const pm = line.match(/^pickup:\s*(.*)$/);
    if (pm) {
      pickup = pm[1].trim();
      i++;
      continue;
    }

    const sm = line.match(/^switching:\s*(.*)$/);
    if (sm) {
      switchingRaw = sm[1].trim();
      switchingLine = i + 1;
      i++;
      continue;
    }

    i++;
  }

  return {
    label,
    startLine,
    fenceCount,
    signalChainRaw,
    signalChainLine,
    pickup,
    switchingRaw,
    switchingLine,
  };
}
