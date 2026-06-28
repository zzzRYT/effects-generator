// 합성 패치 픽스처. 줄 배열을 join 해서 ```signal_chain 펜스의 백틱 이스케이프를 피한다.
// JSON 줄은 작은따옴표 JS 문자열로 써서 내부 큰따옴표를 그대로 둔다.

const lines = (...xs: string[]): string => xs.join("\n");

const FM = (...extra: string[]): string[] => [
  "---",
  "artist: Test Artist",
  "title: Test Song",
  "rig: g250-gp150",
  ...extra,
  "---",
  "",
];

/** 정상 5블록 패치 — DST(category OD, A)/AMP/CAB(빈)/DLY(A)/RVB, switching A. 경고 없음. */
export const VALID = lines(
  ...FM("genre: test", "confidence: 높음"),
  "# Test Artist – Test Song",
  "",
  "## Variation: Base",
  "기본 변주 줄글 (파서 무시).",
  "",
  "```signal_chain",
  "[",
  '  {"type":"DST","category":"OD","model":"Green OD","base_gear":"Ibanez TS-808","enabled":false,"footswitch":"A","knobs":[{"name":"Gain","value":2},{"name":"Tone","value":6}]},',
  '  {"type":"AMP","model":"UK 800","base_gear":"Marshall JCM800","enabled":true,"knobs":[{"name":"Gain","value":5.5},{"name":"Mid","value":7}]},',
  '  {"type":"CAB","model":"UK 30","enabled":true,"knobs":[]},',
  '  {"type":"DLY","model":"Slapback","enabled":false,"footswitch":"A","knobs":[{"name":"Time","value":120,"unit":"ms"},{"name":"Mix","value":20,"unit":"%"}]},',
  '  {"type":"RVB","model":"Room","enabled":true,"knobs":[{"name":"Decay","value":0.8,"unit":"s"}]}',
  "]",
  "```",
  "pickup: 브릿지 험버커",
  'switching: {"A":"솔로 — Green OD + Slapback ON"}',
);

/** frontmatter 없음 → 규칙1 위반. */
export const MISSING_FRONTMATTER = lines(
  "# No frontmatter",
  "",
  "## Variation: Base",
  "",
  "```signal_chain",
  '[{"type":"AMP","model":"UK 800","enabled":true,"knobs":[]}]',
  "```",
);

/** frontmatter 에 rig 누락 → 규칙1 위반. */
export const FRONTMATTER_MISSING_KEY = lines(
  "---",
  "artist: A",
  "title: T",
  "---",
  "",
  "## Variation: Base",
  "",
  "```signal_chain",
  '[{"type":"AMP","model":"UK 800","enabled":true,"knobs":[]}]',
  "```",
);

/** 변주에 signal_chain 펜스 없음 → 규칙2 위반. */
export const NO_SIGNAL_CHAIN = lines(
  ...FM(),
  "## Variation: Base",
  "펜스가 없다.",
);

/** 변주에 펜스 2개 → 규칙2 위반. */
export const TWO_SIGNAL_CHAIN = lines(
  ...FM(),
  "## Variation: Base",
  "",
  "```signal_chain",
  '[{"type":"AMP","model":"UK 800","enabled":true,"knobs":[]}]',
  "```",
  "",
  "```signal_chain",
  '[{"type":"CAB","model":"UK 30","enabled":true,"knobs":[]}]',
  "```",
);

/** 펜스 JSON 깨짐(닫는 괄호 누락) → 규칙3 위반. */
export const MALFORMED_JSON = lines(
  ...FM(),
  "## Variation: Base",
  "",
  "```signal_chain",
  '[{"type":"AMP","model":"UK 800","enabled":true,"knobs":[]}',
  "```",
);

/** block.type 허용목록 밖 → 규칙4 위반. */
export const BAD_BLOCK_TYPE = lines(
  ...FM(),
  "## Variation: Base",
  "",
  "```signal_chain",
  '[{"type":"XYZ","model":"???","enabled":true,"knobs":[]}]',
  "```",
);

/** block.category 가 그 type 에 허용되지 않는 값 → 규칙4 위반(DST 에 NOPE 없음). */
export const BAD_CATEGORY = lines(
  ...FM(),
  "## Variation: Base",
  "",
  "```signal_chain",
  '[{"type":"DST","category":"NOPE","model":"Green OD","enabled":true,"knobs":[]}]',
  "```",
);

/** category 가 단일 의미 모듈에 붙음(AMP 는 category 없음) → 규칙4 위반(의미상 잘못된 조합). */
export const ORPHAN_CATEGORY = lines(
  ...FM(),
  "## Variation: Base",
  "",
  "```signal_chain",
  '[{"type":"AMP","category":"OD","model":"UK 800","enabled":true,"knobs":[]}]',
  "```",
);

/** block 필수 필드(enabled) 누락 → 규칙4 위반. */
export const BLOCK_MISSING_FIELD = lines(
  ...FM(),
  "## Variation: Base",
  "",
  "```signal_chain",
  '[{"type":"AMP","model":"UK 800","knobs":[]}]',
  "```",
);

/** knob.value 가 숫자 아님 → 규칙5 위반. */
export const KNOB_VALUE_NOT_NUMBER = lines(
  ...FM(),
  "## Variation: Base",
  "",
  "```signal_chain",
  '[{"type":"AMP","model":"UK 800","enabled":true,"knobs":[{"name":"Gain","value":"five"}]}]',
  "```",
);

/** 부동소수 자릿수 보존 검증용. */
export const FLOAT_PRECISION = lines(
  ...FM(),
  "## Variation: Base",
  "",
  "```signal_chain",
  '[{"type":"AMP","model":"UK 800","enabled":true,"knobs":[{"name":"A","value":5.5},{"name":"B","value":0.8},{"name":"C","value":1.5},{"name":"D","value":6.234}]}]',
  "```",
);

/** 변주 3개 — 독립성/카운트 검증용. AMP Gain 5/6/7. */
export const MULTI_VARIATION = lines(
  ...FM(),
  "## Variation: One",
  "",
  "```signal_chain",
  '[{"type":"AMP","model":"UK 800","enabled":true,"knobs":[{"name":"Gain","value":5}]}]',
  "```",
  "",
  "## Variation: Two",
  "",
  "```signal_chain",
  '[{"type":"AMP","model":"UK SLP","enabled":true,"knobs":[{"name":"Gain","value":6}]}]',
  "```",
  "",
  "## Variation: Three",
  "",
  "```signal_chain",
  '[{"type":"AMP","model":"UK 900","enabled":true,"knobs":[{"name":"Gain","value":7}]}]',
  "```",
);

/** switching.A 가 있으나 footswitch:A 블록 없음 → 경고(비실패). */
export const SWITCHING_MISMATCH = lines(
  ...FM(),
  "## Variation: Base",
  "",
  "```signal_chain",
  '[{"type":"AMP","model":"UK 800","enabled":true,"knobs":[]}]',
  "```",
  'switching: {"A":"존재하지 않는 블록 토글"}',
);

/** switching JSON 깨짐 → 빌드 실패(switching-json). */
export const SWITCHING_MALFORMED = lines(
  ...FM(),
  "## Variation: Base",
  "",
  "```signal_chain",
  '[{"type":"AMP","model":"UK 800","enabled":true,"knobs":[]}]',
  "```",
  'switching: {"A": broken}',
);

/** 펜스가 닫히지 않음(EOF 까지 ``` 없음) → 규칙2 위반. */
export const UNCLOSED_FENCE = lines(
  ...FM(),
  "## Variation: Base",
  "",
  "```signal_chain",
  '[{"type":"AMP","model":"UK 800","enabled":true,"knobs":[]}]',
);

/** signal_chain JSON 이 유효하나 배열 아님(객체) → 규칙3 위반. */
export const JSON_NOT_ARRAY = lines(
  ...FM(),
  "## Variation: Base",
  "",
  "```signal_chain",
  '{"type":"AMP","model":"UK 800","enabled":true,"knobs":[]}',
  "```",
);

/** block.footswitch 가 A|B 가 아님 → 규칙4 위반. */
export const BLOCK_BAD_FOOTSWITCH = lines(
  ...FM(),
  "## Variation: Base",
  "",
  "```signal_chain",
  '[{"type":"AMP","model":"UK 800","enabled":true,"footswitch":"C","knobs":[]}]',
  "```",
);

/** block 요소가 객체 아님(배열) → 규칙4 위반. */
export const BLOCK_IS_ARRAY = lines(
  ...FM(),
  "## Variation: Base",
  "",
  "```signal_chain",
  '[[{"type":"AMP","model":"UK 800","enabled":true,"knobs":[]}]]',
  "```",
);

/** knob 요소가 객체 아님(배열) → 규칙5 위반. */
export const KNOB_IS_ARRAY = lines(
  ...FM(),
  "## Variation: Base",
  "",
  "```signal_chain",
  '[{"type":"AMP","model":"UK 800","enabled":true,"knobs":[[]]}]',
  "```",
);

/** optional 필드가 null → "null" 문자열로 새지 않고 생략돼야 함. */
export const NULL_BASE_GEAR = lines(
  ...FM(),
  "## Variation: Base",
  "",
  "```signal_chain",
  '[{"type":"AMP","model":"UK 800","base_gear":null,"enabled":true,"knobs":[{"name":"Gain","value":5}]}]',
  "```",
);
