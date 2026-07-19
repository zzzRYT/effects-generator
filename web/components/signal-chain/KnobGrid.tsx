import type { Knob as KnobData } from "@/lib/types";
import { Knob } from "./Knob";
import styles from "./block.module.css";

interface KnobGridProps {
  knobs: KnobData[];
}

// 노브 → 실제 로터리 컨트롤 열. Tone Forge DS `SignalChainBlock.jsx` 의 노브 배열.
// 시각(다이얼)은 Knob 이 그리고, 값의 권위는 여전히 data-contract §2(renderKnob) 텍스트다.
// <dl>/<dt>/<dd> 이름-값 시맨틱은 그대로 유지 — 다이얼은 값의 그래픽 표현이라 <dd> 안에 든다.
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
      {knobs.map((knob, i) => (
        <Knob knob={knob} key={`${knob.name}-${i}`} />
      ))}
    </dl>
  );
}
