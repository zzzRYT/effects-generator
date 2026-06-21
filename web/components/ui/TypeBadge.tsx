import type { BlockType } from "@/lib/types";
import { blockTypeToken } from "@/lib/blockType";
import styles from "./type-badge.module.css";

interface TypeBadgeProps {
  type: BlockType;
}

// 블록 타입 약어 배지. 배경 = 악센트 토큰(cssVar), 텍스트색 = 대비 자동선택.
// 색만으로 의미 전달 금지 — 약어 텍스트를 항상 병기(edge-3.11).
export function TypeBadge({ type }: TypeBadgeProps) {
  const { cssVar, abbr, textColor } = blockTypeToken(type);
  return (
    <span
      className={styles.badge}
      style={{ backgroundColor: `var(${cssVar})`, color: textColor }}
    >
      {abbr}
    </span>
  );
}
