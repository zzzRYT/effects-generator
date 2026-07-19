import styles from "./strum-loader.module.css";

// 생성 대기용 "기타 줄 튕김" 로더 — 6현이 위→아래로 스트럼되며 진동한다.
// 현 색 = 시그널체인 블록 악센트 팔레트(생성=연주를 카탈로그 정체성에 연결).
// 모션은 compositor 친화(transform: scaleY 정상파 반전 + opacity). 장식이므로 aria-hidden.

type Wave = "single" | "double";

interface StringDef {
  cy: number;
  color: string;
  width: number;
  wave: Wave;
}

// 위 = 가는 고음현(2-노드 고차 진동), 아래 = 굵은 저음현(단일 배).
// 색은 정직한 실제 기어색 — 얇은 플레인현은 밝은 강선, 굵은 와운드현은 어두운 니켈/브론즈로
// 내려간다. 무지개(블록 타입색) 금지: 그건 시그널 체인 길찾기 전용이고 여기선 의미가 없다.
const STRINGS: readonly StringDef[] = [
  { cy: 16, color: "var(--chassis-100)", width: 1.0, wave: "double" },
  { cy: 28, color: "var(--chassis-200)", width: 1.2, wave: "double" },
  { cy: 40, color: "var(--chassis-200)", width: 1.5, wave: "single" },
  { cy: 52, color: "var(--chassis-300)", width: 1.8, wave: "single" },
  { cy: 64, color: "var(--amber-300)", width: 2.1, wave: "single" },
  { cy: 76, color: "var(--amber-500)", width: 2.4, wave: "single" },
];

const STRUM_STAGGER_S = 0.07; // 현 간 시차 → 다운스트럼 쓸어내림
const FRET_X = [70, 128, 186] as const;

// cy 중심으로 위·아래 대칭(antisymmetric)인 파형 — scaleY 반전이 양 끝(너트·브리지)을 고정한 채
// 배만 뒤집혀 진동하는 정상파처럼 읽힌다.
function stringPath(cy: number, wave: Wave): string {
  if (wave === "double") {
    const a = 11;
    return `M12 ${cy} C 48 ${cy - a} 84 ${cy + a} 122 ${cy} S 196 ${cy - a} 232 ${cy}`;
  }
  const a = 14;
  return `M12 ${cy} C 84 ${cy - a} 160 ${cy + a} 232 ${cy}`;
}

export function StrumLoader() {
  return (
    <div className={styles.wrap}>
      <svg
        className={styles.svg}
        viewBox="0 0 244 92"
        aria-hidden="true"
        focusable="false"
      >
        {/* 프렛보드 */}
        <rect
          className={styles.board}
          x="2"
          y="6"
          width="240"
          height="80"
          rx="7"
        />
        {FRET_X.map((x) => (
          <line key={x} className={styles.fret} x1={x} y1="10" x2={x} y2="82" />
        ))}
        {/* 너트 */}
        <line className={styles.nut} x1="12" y1="10" x2="12" y2="82" />

        {/* 현 */}
        {STRINGS.map((s, i) => (
          <path
            key={s.cy}
            className={styles.string}
            d={stringPath(s.cy, s.wave)}
            strokeWidth={s.width}
            style={{
              color: s.color,
              animationDelay: `${i * STRUM_STAGGER_S}s`,
            }}
          />
        ))}

        {/* 스트럼 글린트 — 픽이 현을 쓸어내리는 하이라이트 */}
        <rect
          className={styles.sweep}
          x="8"
          y="8"
          width="228"
          height="2.5"
          rx="1.25"
        />
      </svg>
    </div>
  );
}
