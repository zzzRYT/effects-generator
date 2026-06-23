// 패치 데이터 단일 타입 정의. 빌드 파서(scripts/gen-patches.ts)와 렌더러(#1+)가 공유한다.
// docs/parser-contract.md 와 1:1. 이 파일이 signal_chain block/knob 모양의 권위 타입.

// GP-150 실제 12 모듈 슬롯. block.type = 모듈(효과명 아님).
// 근거·매핑: docs/parser-contract.md "모듈 ↔ 효과", models/processors/valeton-gp150/hardware.md.
export type BlockType =
  | "NR" // Noise Gate
  | "PRE" // Pre-Effects (컴프/부스트/필터/피치)
  | "WAH" // Wah
  | "DST" // Distortion/Overdrive (드라이브/디스토션/퍼즈)
  | "NS" // SnapTone (N→S)
  | "AMP"
  | "CAB"
  | "EQ"
  | "MOD"
  | "DLY"
  | "RVB"
  | "VOL";

// PRE/DST 모듈 안의 효과 종류(선택). 단일 의미 모듈은 category 없음.
// PRE: COMP·BOOST·FILTER·PITCH / DST: OD·DST·FUZZ.
export type BlockCategory =
  | "COMP"
  | "BOOST"
  | "FILTER"
  | "PITCH"
  | "OD"
  | "DST"
  | "FUZZ";

export type Footswitch = "A" | "B";

export interface Knob {
  name: string;
  value: number;
  unit?: string;
  /** unit 없을 때만 의미 — 렌더 측 스케일 표기용(0–10/0–100). 파서는 보존만. */
  scale?: "0-10" | "0-100";
}

export interface Block {
  type: BlockType;
  /** PRE/DST 모듈 안의 효과 종류(선택). 없으면 단일 의미 모듈. */
  category?: BlockCategory;
  model: string;
  base_gear?: string;
  enabled: boolean;
  footswitch?: Footswitch;
  knobs: Knob[];
}

export interface SwitchingEntry {
  /** md switching: 의 사람용 설명. */
  description: string;
  /** 파서 자동 추출 — 이 변주에서 footswitch===key 인 블록들의 model. */
  blockModels: string[];
}

export interface SwitchingPlan {
  A?: SwitchingEntry;
  B?: SwitchingEntry;
}

export interface Variation {
  label: string;
  signalChain: Block[];
  pickup?: string;
  switching?: SwitchingPlan;
}

export interface Song {
  artist: string;
  title: string;
  rig: string;
  genre?: string;
  confidence?: string;
  /** 파일명 기반 slug (예: oasis-dont-look-back-in-anger). */
  slug: string;
  variations: Variation[];
}
