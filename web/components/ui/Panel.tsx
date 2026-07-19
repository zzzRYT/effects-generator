import type { ReactNode, ElementType, ComponentPropsWithoutRef } from "react";
import styles from "./panel.module.css";

interface PanelOwnProps {
  /** 렌더 태그(시맨틱 유지용) — 기본 div. section/article/header 등. */
  as?: ElementType;
  /** 코너 스크류 표시(하드웨어 단서). 기본 true. */
  screws?: boolean;
  /** 리세스 웰(inset) 표면. 기본 false = raised. */
  recessed?: boolean;
  className?: string;
  children?: ReactNode;
}

type PanelProps = PanelOwnProps &
  Omit<ComponentPropsWithoutRef<"div">, keyof PanelOwnProps>;

// Tone Forge 섀시 래퍼 — 근흑색 표면 + 베젤 + 코너 스크류.
// 순수 표피(presentational). 스크류는 장식이라 aria-hidden. 나머지 props/aria 는 패스스루.
export function Panel({
  as: Tag = "div",
  screws = true,
  recessed = false,
  className,
  children,
  ...rest
}: PanelProps) {
  const cls = [styles.panel, recessed ? styles.recessed : styles.raised, className]
    .filter(Boolean)
    .join(" ");
  return (
    <Tag className={cls} data-recessed={recessed || undefined} {...rest}>
      {screws ? <span className={styles.screws} aria-hidden="true" /> : null}
      {children}
    </Tag>
  );
}
