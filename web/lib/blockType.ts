import type { BlockType } from "./types";
import { pickTextColor } from "./contrast";

// 블록 타입 → 토큰 그룹·CSS 변수·약어 (단일 출처). docs/data-contract-ui.md §1.
// 컴포넌트는 색을 하드코딩하지 않고 cssVar(=data-type 토큰)만 참조한다.

export type TokenGroup = "od" | "amp" | "cab" | "dly" | "rvb" | "mod" | "util";

// 악센트 hex — lib/tokens.css 와 동일해야 한다(드리프트 가드: tokens.test.ts).
// 배지 텍스트색 자동선택(pickTextColor)에만 쓰인다. 배경/보더 색은 cssVar 토큰으로 참조.
export const ACCENT_HEX: Record<TokenGroup, string> = {
  od: "#fb923c",
  amp: "#60a5fa",
  cab: "#a78bfa",
  dly: "#22d3ee",
  rvb: "#f472b6",
  mod: "#34d399",
  util: "#a8a29e",
};

const TYPE_TO_GROUP: Record<BlockType, TokenGroup> = {
  // 드라이브 계열
  OD: "od",
  BOOST: "od",
  DST: "od",
  FUZZ: "od",
  // 단일
  AMP: "amp",
  CAB: "cab",
  DLY: "dly",
  RVB: "rvb",
  // 모듈레이션 계열
  MOD: "mod",
  FILTER: "mod",
  WAH: "mod",
  PITCH: "mod",
  // 유틸 계열
  NR: "util",
  COMP: "util",
  EQ: "util",
  VOL: "util",
};

export interface BlockTypeToken {
  group: TokenGroup;
  /** lib/tokens.css 의 악센트 변수명 (예: --color-od). 배경/보더는 이 토큰으로. */
  cssVar: `--color-${TokenGroup}`;
  /** 색만으로 의미 전달 금지 — 화면에 병기할 타입 약어. */
  abbr: string;
  /** 악센트 배경 위 배지 텍스트색(흰/검 자동선택) — 대비 ≥4.5:1 보장. */
  textColor: string;
}

/** 알 수 없는 타입은 util 폴백 + 원본 약어 유지(crash 0, 방어적). */
export function blockTypeToken(type: BlockType): BlockTypeToken {
  const group = TYPE_TO_GROUP[type] ?? "util";
  return {
    group,
    cssVar: `--color-${group}`,
    abbr: type,
    textColor: pickTextColor(ACCENT_HEX[group]),
  };
}
