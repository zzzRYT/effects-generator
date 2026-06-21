import type { Knob } from "@/lib/types";
import { renderKnob } from "@/lib/renderKnob";
import styles from "./block.module.css";

interface KnobGridProps {
  knobs: Knob[];
}

// 노브 → LCD 텍스트 셀 격자. data-contract §2 형식(renderKnob).
// enabled=false 블록의 노브도 전부 표시(읽기 전용, 데이터 손실 금지) — 흐림은 부모가.
export function KnobGrid({ knobs }: KnobGridProps) {
  if (knobs.length === 0) {
    return (
      <p className={styles.knobEmpty} data-knob-empty>
        노브 없음
      </p>
    );
  }
  return (
    <dl className={styles.knobGrid}>
      {knobs.map((knob, i) => {
        const text = renderKnob(knob);
        const [name, value] = splitKnob(text);
        return (
          <div className={styles.knobCell} key={`${knob.name}-${i}`}>
            <dt className={styles.knobName}>{name}</dt>
            <dd className={styles.knobValue}>{value}</dd>
          </div>
        );
      })}
    </dl>
  );
}

// renderKnob 출력("Name: value …")을 라벨/값으로 분리. 첫 ": " 만 기준.
function splitKnob(text: string): [string, string] {
  const idx = text.indexOf(": ");
  if (idx === -1) return [text, ""];
  return [text.slice(0, idx), text.slice(idx + 2)];
}
