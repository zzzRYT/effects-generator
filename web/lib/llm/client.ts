// LLM seam — 캐논 생성(설계 §2 ③)의 유일한 LLM 진입점. OpenAI 호환 인터페이스 한 곳.
// Gemini(기본, 검색 그라운딩 내장) ↔ Ollama(로컬) 교체를 이 파일에서 흡수한다.
// 투영(ToneProjector)은 AI를 쓰지 않으므로 이 클라이언트를 호출하지 않는다.

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  /** true 면 JSON 오브젝트 응답 강제(OpenAI response_format). */
  json?: boolean;
  signal?: AbortSignal;
}

export interface LlmClient {
  /** messages → 어시스턴트 응답 텍스트. 실패 시 throw. */
  chat(messages: ChatMessage[], opts?: ChatOptions): Promise<string>;
}

export interface OpenAICompatConfig {
  baseUrl: string; // 예: https://generativelanguage.googleapis.com/v1beta/openai
  apiKey: string;
  defaultModel: string;
  /** 테스트·런타임 주입(기본 globalThis.fetch). */
  fetchImpl?: typeof fetch;
}

interface OpenAIChatResponse {
  choices?: { message?: { content?: string } }[];
}

/** OpenAI 호환 /chat/completions 클라이언트. Gemini·Ollama 모두 이 규약을 만족. */
export function createOpenAICompatClient(cfg: OpenAICompatConfig): LlmClient {
  const fetchImpl = cfg.fetchImpl ?? globalThis.fetch;
  return {
    async chat(messages, opts = {}) {
      const res = await fetchImpl(`${cfg.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify({
          model: opts.model ?? cfg.defaultModel,
          messages,
          ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
          ...(opts.json ? { response_format: { type: "json_object" } } : {}),
        }),
        signal: opts.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`LLM ${res.status}: ${text}`);
      }
      const data = (await res.json()) as OpenAIChatResponse;
      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== "string") {
        throw new Error("LLM 응답에 choices[0].message.content 가 없음");
      }
      return content;
    },
  };
}

const GEMINI_OPENAI_BASE = "https://generativelanguage.googleapis.com/v1beta/openai";

/** 환경변수 기반 기본 클라이언트. 캐논 생성 경로에서 사용. env 미설정이면 명확히 throw. */
export function getLlmClient(): LlmClient {
  const provider = process.env.LLM_PROVIDER ?? "gemini";
  if (provider === "gemini") {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY 미설정");
    return createOpenAICompatClient({
      baseUrl: process.env.LLM_BASE_URL ?? GEMINI_OPENAI_BASE,
      apiKey,
      defaultModel: process.env.LLM_MODEL ?? "gemini-2.5-flash",
    });
  }
  if (provider === "ollama") {
    return createOpenAICompatClient({
      baseUrl: process.env.LLM_BASE_URL ?? "http://localhost:11434/v1",
      apiKey: process.env.LLM_API_KEY ?? "ollama", // Ollama 는 키 검사 안 함
      defaultModel: process.env.LLM_MODEL ?? "llama3.1",
    });
  }
  throw new Error(`알 수 없는 LLM_PROVIDER: ${provider}`);
}
