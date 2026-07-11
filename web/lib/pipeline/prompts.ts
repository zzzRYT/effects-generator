// 캐논 생성 프롬프트 빌더 — `.claude/skills/tone-builder/` 계약의 코드 구현(설계 §2 ③).
// 캐논은 기기무관: block.model 없이 base_gear(실기 어휘)로만 서술한다. 투영(R3)이 이걸 기기 signal_chain 으로 변환.
// LLM seam(lib/llm/client.ts)이 이 메시지를 그대로 전달 — 프롬프트 텍스트가 곧 생성 권위.

import { ALLOWED_TYPES, TYPE_CATEGORIES } from "../parser/validate";
import type { AudioObservation } from "./audio-observations";

// 프롬프트에 박아넣을 허용 블록 타입/카테고리 목록(parser 상수 단일 출처 파생 — 드리프트 없음).
function allowedTypesText(): string {
  return [...ALLOWED_TYPES].join(", ");
}
function categoriesText(): string {
  return Object.entries(TYPE_CATEGORIES)
    .map(([type, cats]) => `${type} → ${[...cats].join("/")}`)
    .join(", ");
}

// ── 곡 리서치 ──────────────────────────────────────────
// Gemini 검색 그라운딩으로 원곡의 실제 기타 톤을 조사한다. 산출 = 구조화 노트(캐논 생성 입력).
export const RESEARCH_SYSTEM = [
  "너는 일렉기타 톤 리서처다. 주어진 곡의 원곡(스튜디오/대표 라이브) 기타 톤을 조사한다.",
  "가능한 한 실제 근거(인터뷰·리그 사이트·장비 리스트)에 기반하고, 확신이 낮은 부분은 낮다고 표기한다.",
  "추측으로 단정하지 말 것 — 모르면 unknown 으로 남긴다.",
  "출력은 JSON 오브젝트 하나. 산문·마크다운·코드펜스 금지.",
].join("\n");

/** 리서치 요청 메시지. 산출 스키마를 함께 지정. */
export function buildResearchPrompt(artist: string, title: string): { system: string; user: string } {
  const user = [
    `곡: "${title}" — ${artist}`,
    "",
    "다음 JSON 스키마로만 응답:",
    "{",
    '  "gear": [{"name": "실기명(예: Fender Twin Reverb)", "category": "amp|cab|OD|DST|FUZZ|DLY|RVB|MOD|COMP|BOOST|WAH|EQ", "role": "어느 파트/용도", "confidence": 0~1}],',
    '  "gain": "clean|crunch|mid-gain|high-gain 중 곡의 지배적 성격 + 근거",',
    '  "signature_fx": ["곡을 특징짓는 이펙트(코러스/딜레이/와우 등) 서술"],',
    '  "sections": [{"name": "verse|chorus|solo 등", "character": "그 구간 톤 한 줄"}],',
    '  "sources": ["참고한 근거 URL 또는 출처명"],',
    '  "notes": "종합 요약 한두 문장",',
    '  "confidence": 0~1',
    "}",
    "정보를 못 찾으면 gear 는 빈 배열, confidence 는 낮게, notes 에 사유를 남긴다.",
  ].join("\n");
  return { system: RESEARCH_SYSTEM, user };
}

// ── 캐논 생성 ──────────────────────────────────────────
// 리서치 노트 + gear KB 컨텍스트(소프트 어휘 힌트) → 곡 파트 3-role(lead/backing/solo) 캐논.
// real-amp/phone 은 캐논에 없다 — 투영(R3)이 출력 프로파일로 파생(2026-07-06, 설계 §5).
export const CANON_SYSTEM = [
  "너는 기타 톤을 '캐논(canonical tone)'으로 정규화하는 엔진이다.",
  "캐논은 특정 멀티이펙터·기기와 무관하다 — 곡이 실제로 쓴 실기(앰프·페달)를 base_gear 로만 서술한다.",
  "절대 특정 기기의 모델명(예: GP-150 FX 이름)을 쓰지 마라. base_gear 는 실제 장비명이다.",
  "노브 값은 항상 숫자로. 시간=ms/s, 주파수=Hz/kHz, 비율=%, 게인/EQ=0-10. 모호한 표현('살짝','깊게') 금지.",
  "확신이 낮은 파트는 추측으로 채우지 말고 chain=null + null_reason 으로 비운다. null_reason 등 서술 텍스트는 한국어로 쓴다(고유명사 제외).",
  "출력은 JSON 오브젝트 하나. 산문·마크다운·코드펜스 금지.",
].join("\n");

export interface CanonPromptInput {
  artist: string;
  title: string;
  /** 리서치 노트(JSON 직렬화해 주입). */
  research: unknown;
  /** gear KB 그라운딩 컨텍스트(buildGroundingContext 산출 — 소프트 어휘 힌트). */
  grounding: string;
  /** 멀티모달 실험에서만 추가되는 지각 관측. baseline 에서는 필드 자체를 생략한다. */
  audioObservations?: AudioObservation[];
}

/** 3-role 캐논 생성 메시지. */
export function buildCanonPrompt(input: CanonPromptInput): { system: string; user: string } {
  const baseline = [
    `곡: "${input.title}" — ${input.artist}`,
    "",
    "[리서치 노트]",
    JSON.stringify(input.research),
    "",
    "[알려진 실기 어휘 — 맞으면 이 이름을 그대로 쓰고, 아니면 실제 장비명을 자유롭게 써도 된다]",
    input.grounding,
    "",
    "위 근거로 곡 파트 3-role 캐논을 생성한다:",
    "- lead: 곡의 리드/훅/메인 리프 기타 대표 톤",
    "- backing: 백킹/리듬 기타 톤",
    "- solo: 솔로 파트 톤(솔로가 없으면 chain=null + null_reason)",
    "",
    `block.type 허용: ${allowedTypesText()}`,
    `category 는 다음 타입에만: ${categoriesText()} (그 외 타입엔 category 금지)`,
    "",
    "JSON 스키마로만 응답:",
    "{",
    '  "roles": {',
    '    "lead":    {"chain": [BLOCK] 또는 null, "null_reason": string 또는 null, "confidence": 0~1},',
    '    "backing": {"chain": [BLOCK] 또는 null, "null_reason": string 또는 null, "confidence": 0~1},',
    '    "solo":    {"chain": [BLOCK] 또는 null, "null_reason": string 또는 null, "confidence": 0~1}',
    "  },",
    '  "sources": ["근거 URL/출처"]',
    "}",
    "BLOCK = {",
    '  "type": 허용 타입, "category": (해당 타입만) 카테고리,',
    '  "base_gear": {"name": "실기명", "category": "장비 종류", "attributes": {"근거 키": "값"}(선택), "confidence": 0~1(선택)},',
    '  "knobs": [{"name": "Gain", "value": 5.5, "unit": "ms|s|Hz|kHz|%"(선택), "scale": "0-10|0-100"(선택)}],',
    '  "enabled": true/false, "footswitch": "A"|"B"(선택)',
    "}",
    "체인은 시그널 순서(앞→뒤)대로. chain 이 null 이면 null_reason 을 반드시 채운다.",
  ].join("\n");
  const user = input.audioObservations
    ? `${baseline}\n\n[오디오 관측]\n${JSON.stringify(input.audioObservations)}`
    : baseline;
  return { system: CANON_SYSTEM, user };
}
