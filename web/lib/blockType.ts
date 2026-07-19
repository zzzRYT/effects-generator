import type { BlockType, BlockCategory } from "./types";
import { pickTextColor } from "./contrast";

// 블록 타입(모듈)·category → 토큰 그룹·CSS 변수·약어 (단일 출처). docs/data-contract-ui.md §1.
// 컴포넌트는 색을 하드코딩하지 않고 cssVar(=data-type 토큰)만 참조한다.
// type 은 GP-150 실제 12 모듈, category 는 PRE/DST 안의 효과 종류(선택).

export type TokenGroup = "od" | "amp" | "cab" | "dly" | "rvb" | "mod" | "util";

// 악센트 hex — lib/tokens.css 와 동일해야 한다(드리프트 가드: tokens.test.ts).
// 배지 텍스트색 자동선택(pickTextColor)에만 쓰인다. 배경/보더 색은 cssVar 토큰으로 참조.
export const ACCENT_HEX: Record<TokenGroup, string> = {
  od: "#e8944a",
  amp: "#7ea6d4",
  cab: "#a99ac4",
  dly: "#6fc0c4",
  rvb: "#d792a8",
  mod: "#7fc49a",
  util: "#b6b6bd",
};

// category 우선 — PRE/DST 는 효과 종류에 따라 색이 갈린다(부스트/드라이브=od, 컴프=util, 필터/피치=mod).
const CATEGORY_TO_GROUP: Record<BlockCategory, TokenGroup> = {
  OD: "od",
  DST: "od",
  FUZZ: "od",
  BOOST: "od",
  FILTER: "mod",
  PITCH: "mod",
  COMP: "util",
};

// category 없는 단일 의미 모듈은 type 으로 결정.
const TYPE_TO_GROUP: Record<BlockType, TokenGroup> = {
  AMP: "amp",
  CAB: "cab",
  NS: "cab", // SnapTone = 앰프/캐비넷 캐릭터 보조
  DLY: "dly",
  RVB: "rvb",
  MOD: "mod",
  WAH: "mod",
  DST: "od", // category 없는 맨 디스토션 모듈
  NR: "util",
  PRE: "util", // category 없는 PRE 폴백
  EQ: "util",
  VOL: "util",
};

// category → 사람용 효과종류 라벨 (모델명 옆 병기 — 색맹/grayscale 에서도 의미 전달).
const CATEGORY_LABEL: Record<BlockCategory, string> = {
  OD: "오버드라이브",
  DST: "디스토션",
  FUZZ: "퍼즈",
  BOOST: "부스트",
  COMP: "컴프레서",
  FILTER: "필터",
  PITCH: "피치",
};

/** category 한글 라벨 (알 수 없으면 원문 유지 — crash 0). */
export function categoryLabel(category: BlockCategory): string {
  return CATEGORY_LABEL[category] ?? category;
}

export interface BlockTypeToken {
  group: TokenGroup;
  /** lib/tokens.css 의 악센트 변수명 (예: --color-od). 배경/보더는 이 토큰으로. */
  cssVar: `--color-${TokenGroup}`;
  /** 색만으로 의미 전달 금지 — 화면에 병기할 모듈 약어(type). */
  abbr: string;
  /** 악센트 배경 위 배지 텍스트색(흰/검 자동선택) — 대비 ≥4.5:1 보장. */
  textColor: string;
}

/**
 * 모듈(type) + 효과종류(category) → 토큰. 해석 순서: category 우선 → 없으면 type → util 폴백.
 * 알 수 없는 type/category 도 util 폴백 + 원본 약어 유지(crash 0, 방어적).
 */
export function blockTypeToken(
  type: BlockType,
  category?: BlockCategory,
): BlockTypeToken {
  const group =
    (category ? CATEGORY_TO_GROUP[category] : undefined) ??
    TYPE_TO_GROUP[type] ??
    "util";
  return {
    group,
    cssVar: `--color-${group}`,
    abbr: type,
    textColor: pickTextColor(ACCENT_HEX[group]),
  };
}
