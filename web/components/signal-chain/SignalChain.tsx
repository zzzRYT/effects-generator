import type { Block } from "@/lib/types";
import { BlockModule } from "./BlockModule";
import styles from "./signal-chain.module.css";

interface SignalChainProps {
  blocks: Block[];
}

// 범용 블록-체인 렌더러 — block[] 을 좌→우 신호 흐름으로. block.type 만 보고 그린다.
// 블록 사이에 케이블 커넥터(→). DOM 순서 = 배열 순서(ui-1.2).
export function SignalChain({ blocks }: SignalChainProps) {
  return (
    <ol className={styles.chain} aria-label="시그널 체인 (신호 흐름 순)">
      {blocks.map((block, i) => (
        <li className={styles.node} key={`${block.type}-${block.model}-${i}`}>
          <BlockModule block={block} />
          {i < blocks.length - 1 ? (
            <span className={styles.connector} aria-hidden="true">
              →
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
