// docs/parser-contract.md 검증 규칙의 순수 술어. parsePatch 가 파일·라인을 붙여 ParseError 로 만든다.

export const ALLOWED_TYPES: ReadonlySet<string> = new Set([
  "NR",
  "COMP",
  "BOOST",
  "OD",
  "FUZZ",
  "DST",
  "FILTER",
  "PITCH",
  "WAH",
  "AMP",
  "CAB",
  "EQ",
  "MOD",
  "DLY",
  "RVB",
  "VOL",
]);

export const REQUIRED_FRONTMATTER = ["artist", "title", "rig"] as const;

export function missingFrontmatterKeys(fm: Record<string, unknown>): string[] {
  return REQUIRED_FRONTMATTER.filter((k) => {
    const v = fm[k];
    return v === undefined || v === null || v === "";
  });
}

/** 규칙 4: block 모양. 통과면 null, 아니면 에러 메시지. */
export function validateBlockShape(block: unknown): string | null {
  if (typeof block !== "object" || block === null || Array.isArray(block)) {
    return "block 이 객체가 아님";
  }
  const b = block as Record<string, unknown>;
  if (typeof b.type !== "string") return "type 누락 또는 문자열 아님";
  if (!ALLOWED_TYPES.has(b.type)) return `type "${b.type}" 가 허용목록 밖`;
  if (typeof b.model !== "string") return "model 누락 또는 문자열 아님";
  if (typeof b.enabled !== "boolean") return "enabled 누락 또는 boolean 아님";
  if (!Array.isArray(b.knobs)) return "knobs 누락 또는 배열 아님";
  if (
    b.footswitch !== undefined &&
    b.footswitch !== "A" &&
    b.footswitch !== "B"
  ) {
    return `footswitch "${String(b.footswitch)}" 는 A|B 만 허용`;
  }
  return null;
}

/** 규칙 5: knob 모양. 통과면 null, 아니면 에러 메시지. */
export function validateKnobShape(knob: unknown): string | null {
  if (typeof knob !== "object" || knob === null || Array.isArray(knob)) {
    return "knob 이 객체가 아님";
  }
  const k = knob as Record<string, unknown>;
  if (typeof k.name !== "string") return "knob.name 누락 또는 문자열 아님";
  if (typeof k.value !== "number" || Number.isNaN(k.value)) {
    return `knob "${String(k.name)}" 의 value 가 number 아님`;
  }
  return null;
}
