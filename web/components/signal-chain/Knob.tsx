import type { Knob as KnobData } from "@/lib/types";
import { renderKnob } from "@/lib/renderKnob";
import styles from "./knob.module.css";

interface KnobProps {
  knob: KnobData;
}

// 노브 회전 범위 — 실제 기어와 동일하게 7시(-135°) ~ 5시(+135°), 총 270°.
const SWEEP_START = -135;
const SWEEP_DEG = 270;

/**
 * 노브 값 → 0~1 위치. scale 이 있는 값만 각도로 표현할 수 있다.
 * unit 값(640ms, 12kHz…)은 상한이 데이터에 없으므로 각도를 지어내지 않고 null 을 돌려
 * 호출부가 LCD 리드아웃으로 폴백하게 한다 — 없는 정보를 그림으로 꾸며내지 않는다.
 */
export function knobFraction(knob: KnobData): number | null {
  if (knob.unit) return null;
  const max = knob.scale === "0-100" ? 100 : 10;
  const value = Number(knob.value);
  if (!Number.isFinite(value)) return null;
  return Math.min(1, Math.max(0, value / max));
}

/**
 * 시그널 체인 노브 한 개 — Tone Forge DS `components/chain/SignalChainBlock.jsx` 의
 * ChainKnob 을 읽기 전용 CSS 로 이식했다(카탈로그는 조작 UI 가 아니라 판독 화면이라
 * 드래그 핸들러가 없고, 21개 눈금 span 대신 conic-gradient 링 하나로 같은 그림을 만든다).
 *
 * 표시 계약: 다이얼은 시각 보조일 뿐이고 값의 권위는 항상 모노 텍스트다.
 * 렌더 문자열은 `renderKnob` (docs/data-contract-ui.md §2) 출력을 그대로 쓰므로
 * 화면에 읽히는 이름/값은 이 변경 전후로 동일하다.
 */
export function Knob({ knob }: KnobProps) {
  const fraction = knobFraction(knob);
  const [name, value] = splitKnob(renderKnob(knob));

  // scale 없는 unit 값 = 각도 미상 → 다이얼 없이 LCD 리드아웃.
  // (실제 기어도 딜레이 타임·주파수는 노브 위치가 아니라 창에 숫자로 띄운다.)
  if (fraction === null) {
    return (
      <div className={styles.cell}>
        <dt className={styles.name}>{name}</dt>
        <dd className={styles.lcdValue}>
          <span className={styles.lcd}>{value}</span>
        </dd>
      </div>
    );
  }

  const angle = SWEEP_START + fraction * SWEEP_DEG;

  return (
    <div className={styles.cell}>
      <dt className={styles.name}>{name}</dt>
      <dd className={styles.dialValue}>
        <span
          className={styles.dial}
          // 인라인은 '값'만 — 스타일 규칙이 아니라 데이터라서 CSS 로 옮길 수 없다.
          style={
            {
              "--knob-angle": `${angle}deg`,
              "--knob-lit": `${fraction * SWEEP_DEG}deg`,
            } as React.CSSProperties
          }
          aria-hidden="true"
        >
          <span className={styles.ticks} />
          <span className={styles.cap}>
            <span className={styles.knurl} />
            <span className={styles.capTop} />
            <span className={styles.pointer} />
          </span>
        </span>
        <span className={styles.value}>{value}</span>
      </dd>
    </div>
  );
}

// renderKnob 출력("Name: value …")을 라벨/값으로 분리. 첫 ": " 만 기준.
function splitKnob(text: string): [string, string] {
  const idx = text.indexOf(": ");
  if (idx === -1) return [text, ""];
  return [text.slice(0, idx), text.slice(idx + 2)];
}
