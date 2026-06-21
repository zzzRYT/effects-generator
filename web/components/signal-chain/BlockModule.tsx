import type { Block } from "@/lib/types";
import { blockTypeToken } from "@/lib/blockType";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { KnobGrid } from "./KnobGrid";
import styles from "./block.module.css";

interface BlockModuleProps {
  block: Block;
}

// 시그널 체인의 한 블록 = 하드웨어 모듈. block.type 만 보고 그린다(타입별 분기 없음).
// 상태(enabled)·풋스위치는 색만이 아니라 LED/라벨/aria 다중 신호로(data-contract §3·§4).
export function BlockModule({ block }: BlockModuleProps) {
  const { group, abbr, textColor } = blockTypeToken(block.type);
  const enabled = block.enabled;
  return (
    <article
      className={styles.module}
      data-group={group}
      data-enabled={enabled}
      data-footswitch={block.footswitch ?? undefined}
    >
      <header className={styles.head}>
        <TypeBadge type={block.type} />
        <span className={styles.model} title={block.model}>
          {block.model}
        </span>
        <span
          className={styles.led}
          data-on={enabled}
          aria-hidden="true"
        />
        {block.footswitch ? (
          <span
            className={styles.fsBadge}
            style={{ color: textColor }}
            aria-label={`CTRL ${block.footswitch} 풋스위치로 토글`}
          >
            {block.footswitch}
          </span>
        ) : null}
      </header>

      {block.base_gear ? (
        <p className={styles.baseGear} title={block.base_gear}>
          {block.base_gear}
        </p>
      ) : null}

      {/* 상태 라벨 — 색맹/grayscale 에서도 구분되도록 텍스트 신호(edge-3.11) */}
      {!enabled ? (
        <p className={styles.stateLabel}>
          {block.footswitch ? `기본 OFF · ${block.footswitch}로 켬` : "OFF"}
        </p>
      ) : null}

      <KnobGrid knobs={block.knobs} />
      <span className={styles.srType}>{abbr} 블록</span>
    </article>
  );
}
