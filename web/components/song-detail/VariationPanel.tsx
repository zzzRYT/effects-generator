import type { Variation } from "@/lib/types";
import { panelId, tabId } from "@/lib/variationTab";
import { SignalChain } from "@/components/signal-chain/SignalChain";
import { SwitchingPlan } from "@/components/signal-chain/SwitchingPlan";
import { Panel } from "@/components/ui/Panel";
import { GuitarSetting } from "./GuitarSetting";
import styles from "./song-detail.module.css";

interface VariationPanelProps {
  variation: Variation;
  index: number;
  /** 탭 모드: tabpanel ARIA 배선(id·role·aria-labelledby·data-active·tabIndex). */
  tabbed?: boolean;
}

// 변주 1개 = LCD 라벨 + 시그널 체인 + 스위칭 플랜. 자기 데이터만 렌더(혼합 0, fs-4.7).
// tabbed 면 tabpanel 로 배선되되, 정적 폴백(no-JS=전부 표시) 위해 기본은 visible.
export function VariationPanel({ variation, index, tabbed }: VariationPanelProps) {
  // tabbed 면 접근명은 aria-labelledby(탭 라벨)가 제공 → aria-label 중복 제거(aria-labelledby 우선,
  // 둘 다 두면 죽은 속성). 단독(비탭) 패널만 aria-label 로 이름 부여.
  const tabProps = tabbed
    ? {
        id: panelId(index),
        role: "tabpanel" as const,
        "aria-labelledby": tabId(index),
        "data-active": index === 0 ? "true" : "false",
        tabIndex: 0,
      }
    : { "aria-label": `변주 ${index + 1}` };
  return (
    <article className={`tf-panel ${styles.variation}`} {...tabProps}>
      <header className={styles.variationHead}>
        <span className={styles.variationNo}>{index + 1}</span>
        <h2 className={styles.variationLabel}>{variation.label}</h2>
      </header>
      <GuitarSetting guitar={variation.guitar} />
      <SignalChain blocks={variation.signalChain} />
      <SwitchingPlan switching={variation.switching} />
    </Panel>
  );
}
