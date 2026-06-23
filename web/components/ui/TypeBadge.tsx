import type { BlockType, BlockCategory } from "@/lib/types";
import { blockTypeToken } from "@/lib/blockType";
import styles from "./type-badge.module.css";

interface TypeBadgeProps {
  type: BlockType;
  category?: BlockCategory;
}

// 모듈 약어 배지. 배경 = 악센트 토큰(cssVar, category-aware), 텍스트색 = 대비 자동선택.
// 색만으로 의미 전달 금지 — 모듈 약어 텍스트를 항상 병기(edge-3.11).
export function TypeBadge({ type, category }: TypeBadgeProps) {
  const { cssVar, abbr, textColor } = blockTypeToken(type, category);
  return (
    <span
      className={styles.badge}
      style={{ backgroundColor: `var(${cssVar})`, color: textColor }}
    >
      {abbr}
    </span>
  );
}
