// docs/parser-contract.md 검증 규칙의 순수 술어. parsePatch 가 파일·라인을 붙여 ParseError 로 만든다.

// GP-150 실제 12 모듈 슬롯 (docs/parser-contract.md "모듈 ↔ 효과").
export const ALLOWED_TYPES: ReadonlySet<string> = new Set([
  "NR",
  "PRE",
  "WAH",
  "DST",
  "NS",
  "AMP",
  "CAB",
  "EQ",
  "MOD",
  "DLY",
  "RVB",
  "VOL",
]);

// PRE/DST 모듈만 category(효과 종류)를 가진다. 모듈별 허용 종류 (docs/parser-contract.md "모듈 ↔ 효과").
// 단일 의미 모듈(AMP/CAB/…)엔 category 금지 — {type:"AMP",category:"OD"} 같은 의미상 잘못된 조합을 빌드에서 거른다.
export const TYPE_CATEGORIES: Readonly<Record<string, ReadonlySet<string>>> = {
  PRE: new Set(["COMP", "BOOST", "FILTER", "PITCH"]),
  DST: new Set(["OD", "DST", "FUZZ"]),
};

// 평면 허용목록 — TYPE_CATEGORIES 값들의 합집합(단일 출처 파생, 드리프트 가드 대상).
export const ALLOWED_CATEGORIES: ReadonlySet<string> = new Set(
  Object.values(TYPE_CATEGORIES).flatMap((s) => [...s]),
);

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
  if (b.category !== undefined && b.category !== null) {
    // type 은 위에서 허용목록 통과 확인됨. PRE/DST 만 category 를 가지며, 그 모듈에 허용된 종류여야 한다.
    const allowed = TYPE_CATEGORIES[b.type];
    if (typeof b.category !== "string" || !allowed || !allowed.has(b.category)) {
      return `category "${String(b.category)}" 가 type "${b.type}" 에 허용되지 않음 (PRE/DST 만 category 사용)`;
    }
  }
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
