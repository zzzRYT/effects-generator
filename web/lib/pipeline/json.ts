// LLM JSON 응답 파서 — response_format:json_object 를 요청해도 모델이 ```json 펜스로 감싸는 경우가 있어
// 관대하게 벗겨낸 뒤 파싱한다. 파싱 실패·비오브젝트는 명확히 throw(경계 검증, 절대 삼키지 않음).

/** ```json … ``` 펜스를 벗기고 JSON 오브젝트로 파싱. 실패 시 throw. */
export function parseLlmJson(raw: string): Record<string, unknown> {
  const stripped = stripFence(raw).trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch (e) {
    throw new Error(`LLM JSON 파싱 실패: ${e instanceof Error ? e.message : String(e)} — 원문 앞부분: ${stripped.slice(0, 120)}`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("LLM 응답이 JSON 오브젝트가 아님");
  }
  return parsed as Record<string, unknown>;
}

function stripFence(s: string): string {
  const trimmed = s.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  // 첫 줄(```json 또는 ```) 과 마지막 ``` 제거.
  const withoutFirst = trimmed.replace(/^```[a-zA-Z]*\n?/, "");
  const lastFence = withoutFirst.lastIndexOf("```");
  return lastFence === -1 ? withoutFirst : withoutFirst.slice(0, lastFence);
}
