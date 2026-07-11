// LLM seam — 캐논 생성과 멀티모달 관측의 유일한 LLM 진입점.
// Gemini 네이티브 멀티모달 ↔ Ollama OpenAI 호환 차이를 이 파일에서 흡수한다.

export type LlmPart =
  | { type: "text"; text: string }
  | {
      type: "media";
      mediaType: "audio" | "video";
      source:
        | { kind: "uri"; uri: string; mimeType?: string }
        | { kind: "inline"; data: string; mimeType: string };
    };

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | LlmPart[];
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  /** true 면 공급자별 구조화 JSON 응답을 요청한다. */
  json?: boolean;
  signal?: AbortSignal;
}

export interface LlmCapabilities {
  audioInput: boolean;
  videoInput: boolean;
  structuredOutput: boolean;
}

export interface LlmClient {
  capabilities: LlmCapabilities;
  /** messages → 어시스턴트 응답 텍스트. 실패 시 throw. */
  chat(messages: ChatMessage[], opts?: ChatOptions): Promise<string>;
}

export interface OpenAICompatConfig {
  baseUrl: string;
  apiKey: string;
  defaultModel: string;
  /** 테스트·런타임 주입(기본 globalThis.fetch). */
  fetchImpl?: typeof fetch;
}

export interface GeminiConfig {
  apiKey: string;
  defaultModel: string;
  baseUrl?: string;
  /** 테스트·런타임 주입(기본 globalThis.fetch). */
  fetchImpl?: typeof fetch;
}

interface OpenAIChatResponse {
  choices?: { message?: { content?: string } }[];
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

const TEXT_ONLY_CAPABILITIES: LlmCapabilities = {
  audioInput: false,
  videoInput: false,
  structuredOutput: true,
};

const GEMINI_CAPABILITIES: LlmCapabilities = {
  audioInput: true,
  videoInput: true,
  structuredOutput: true,
};

function textOnlyMessages(messages: ChatMessage[]) {
  return messages.map((message) => {
    if (typeof message.content === "string") return message;
    return {
      ...message,
      content: message.content
        .map((part) => {
          if (part.type === "media") {
            throw new Error("provider:media_unsupported");
          }
          return part.text;
        })
        .join("\n"),
    };
  });
}

/** 텍스트 전용 OpenAI 호환 /chat/completions 클라이언트(Ollama). */
export function createOpenAICompatClient(cfg: OpenAICompatConfig): LlmClient {
  const fetchImpl = cfg.fetchImpl ?? globalThis.fetch;
  return {
    capabilities: TEXT_ONLY_CAPABILITIES,
    async chat(messages, opts = {}) {
      const normalizedMessages = textOnlyMessages(messages);
      const res = await fetchImpl(`${cfg.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify({
          model: opts.model ?? cfg.defaultModel,
          messages: normalizedMessages,
          ...(opts.temperature !== undefined
            ? { temperature: opts.temperature }
            : {}),
          ...(opts.json
            ? { response_format: { type: "json_object" } }
            : {}),
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

function geminiTextParts(content: string | LlmPart[]): Array<{ text: string }> {
  if (typeof content === "string") return [{ text: content }];
  return content.map((part) => {
    if (part.type !== "text") {
      throw new Error("provider:system_media_unsupported");
    }
    return { text: part.text };
  });
}

function geminiContentParts(content: string | LlmPart[]) {
  if (typeof content === "string") return [{ text: content }];
  return content.map((part) => {
    if (part.type === "text") return { text: part.text };
    if (part.source.kind === "uri") {
      return {
        file_data: {
          file_uri: part.source.uri,
          ...(part.source.mimeType
            ? { mime_type: part.source.mimeType }
            : {}),
        },
      };
    }
    return {
      inline_data: {
        data: part.source.data,
        mime_type: part.source.mimeType,
      },
    };
  });
}

/** Gemini 네이티브 generateContent 클라이언트. URI·인라인 미디어를 지원한다. */
export function createGeminiClient(cfg: GeminiConfig): LlmClient {
  const fetchImpl = cfg.fetchImpl ?? globalThis.fetch;
  const baseUrl = (
    cfg.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta"
  ).replace(/\/(?:openai\/?)?$/, "");

  return {
    capabilities: GEMINI_CAPABILITIES,
    async chat(messages, opts = {}) {
      const systemParts = messages
        .filter((message) => message.role === "system")
        .flatMap((message) => geminiTextParts(message.content));
      const contents = messages
        .filter((message) => message.role !== "system")
        .map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: geminiContentParts(message.content),
        }));
      const model = (opts.model ?? cfg.defaultModel).replace(/^models\//, "");
      const res = await fetchImpl(
        `${baseUrl}/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": cfg.apiKey,
          },
          body: JSON.stringify({
            ...(systemParts.length > 0
              ? { system_instruction: { parts: systemParts } }
              : {}),
            contents,
            ...(opts.temperature !== undefined || opts.json
              ? {
                  generationConfig: {
                    ...(opts.temperature !== undefined
                      ? { temperature: opts.temperature }
                      : {}),
                    ...(opts.json
                      ? { responseMimeType: "application/json" }
                      : {}),
                  },
                }
              : {}),
          }),
          signal: opts.signal,
        },
      );
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`LLM ${res.status}: ${text}`);
      }
      const data = (await res.json()) as GeminiResponse;
      const text = data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text)
        .filter((part): part is string => typeof part === "string")
        .join("");
      if (!text) {
        throw new Error("LLM 응답에 candidates[0].content.parts[].text 가 없음");
      }
      return text;
    },
  };
}

const GEMINI_NATIVE_BASE =
  "https://generativelanguage.googleapis.com/v1beta";

/** 환경변수 기반 기본 클라이언트. env 미설정이면 명확히 throw. */
export function getLlmClient(): LlmClient {
  const provider = process.env.LLM_PROVIDER ?? "gemini";
  if (provider === "gemini") {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY 미설정");
    return createGeminiClient({
      baseUrl: process.env.LLM_BASE_URL ?? GEMINI_NATIVE_BASE,
      apiKey,
      defaultModel: process.env.LLM_MODEL ?? "gemini-2.5-flash",
    });
  }
  if (provider === "ollama") {
    return createOpenAICompatClient({
      baseUrl: process.env.LLM_BASE_URL ?? "http://localhost:11434/v1",
      apiKey: process.env.LLM_API_KEY ?? "ollama",
      defaultModel: process.env.LLM_MODEL ?? "llama3.1",
    });
  }
  throw new Error(`알 수 없는 LLM_PROVIDER: ${provider}`);
}
