import type {
  SwitchingPlan as SwitchingPlanData,
  SwitchingEntry,
} from "@/lib/types";
import styles from "./signal-chain.module.css";

interface SwitchingPlanProps {
  switching?: SwitchingPlanData;
}

const KEYS = ["A", "B"] as const;

// 스위칭 플랜 — signal_chain 과 분리된 섹션(fs-4.6). 픽업/기타 세팅은 GuitarSetting 박스로 분리.
// blockModels 는 "(N개: …)" 로 개수·모델 병기(fs-4.10).
export function SwitchingPlan({ switching }: SwitchingPlanProps) {
  const entries = KEYS.map((key) => ({ key, entry: switching?.[key] })).filter(
    (e): e is { key: (typeof KEYS)[number]; entry: SwitchingEntry } =>
      Boolean(e.entry),
  );

  if (entries.length === 0) return null;

  return (
    <section className={styles.switching} aria-label="스위칭 플랜">
      <h3 className={styles.switchingHeading}>스위칭 플랜</h3>
      {entries.length > 0 ? (
        <dl className={styles.switchingList}>
          {entries.map(({ key, entry }) => (
            <div className={styles.switchingRow} key={key}>
              <dt className={styles.switchingKey} data-fs={key}>
                CTRL {key}
              </dt>
              <dd className={styles.switchingDesc}>
                {entry.description}
                {entry.blockModels.length > 0 ? (
                  <span className={styles.switchingModels}>
                    ({entry.blockModels.length}개: {entry.blockModels.join(", ")})
                  </span>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}
