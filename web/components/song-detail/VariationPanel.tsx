import type { Variation } from "@/lib/types";
import { SignalChain } from "@/components/signal-chain/SignalChain";
import { SwitchingPlan } from "@/components/signal-chain/SwitchingPlan";
import styles from "./song-detail.module.css";

interface VariationPanelProps {
  variation: Variation;
  index: number;
}

// 변주 1개 = LCD 라벨 + 시그널 체인 + 스위칭 플랜. 자기 데이터만 렌더(혼합 0, fs-4.7).
export function VariationPanel({ variation, index }: VariationPanelProps) {
  return (
    <article className={styles.variation} aria-label={`변주 ${index + 1}`}>
      <header className={styles.variationHead}>
        <span className={styles.variationNo}>{index + 1}</span>
        <h2 className={styles.variationLabel}>{variation.label}</h2>
      </header>
      <SignalChain blocks={variation.signalChain} />
      <SwitchingPlan
        switching={variation.switching}
        pickup={variation.pickup}
      />
    </article>
  );
}
