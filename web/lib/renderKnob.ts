import type { Knob } from "./types";

// 노브 → 표시 텍스트 (순수). docs/data-contract-ui.md §2 의 권위 규칙.
// - unit 있음:  `name: value+unit`  (값과 단위 사이 공백 없음)  예) Time: 640ms
// - unit 없음:  `name: value (scale)` (값 뒤 공백 + en dash 괄호)  예) Gain: 5.5 (0–10)
// - value 는 md 원본 자릿수 보존(반올림/절삭 금지) — String(number).

const SCALE_LABEL: Record<NonNullable<Knob["scale"]>, string> = {
  "0-10": "(0–10)", // en dash U+2013
  "0-100": "(0–100)",
};

export function renderKnob(knob: Knob): string {
  const value = String(knob.value);
  if (knob.unit) {
    return `${knob.name}: ${value}${knob.unit}`;
  }
  const scale = SCALE_LABEL[knob.scale ?? "0-10"];
  return `${knob.name}: ${value} ${scale}`;
}
