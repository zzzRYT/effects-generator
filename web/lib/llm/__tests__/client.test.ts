import { describe, expect, test, vi } from "vitest";
import {
  createGeminiClient,
  createOpenAICompatClient,
  getLlmClient,
  type ChatMessage,
} from "../client";

function mockFetch(body: unknown, ok = true, status = 200): typeof fetch {
  return vi.fn(async () =>
    new Response(JSON.stringify(body), { status: ok ? status : status }),
  ) as unknown as typeof fetch;
}

const MSGS: ChatMessage[] = [
  { role: "system", content: "you are a tone researcher" },
  { role: "user", content: "oasis - wonderwall" },
];

describe("createOpenAICompatClient", () => {
  test("posts to /chat/completions with model·messages·auth and returns content", async () => {
    const fetchImpl = mockFetch({ choices: [{ message: { content: "hello" } }] });
    const client = createOpenAICompatClient({
      baseUrl: "https://api.example/v1",
      apiKey: "sk-test",
      defaultModel: "gemini-2.5-flash",
      fetchImpl,
    });

    const out = await client.chat(MSGS);

    expect(out).toBe("hello");
    expect(client.capabilities).toEqual({
      audioInput: false,
      videoInput: false,
      structuredOutput: true,
    });
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("https://api.example/v1/chat/completions");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer sk-test");
    const payload = JSON.parse(init.body);
    expect(payload.model).toBe("gemini-2.5-flash");
    expect(payload.messages).toEqual(MSGS);
    expect(payload.response_format).toBeUndefined();
  });

  test("json option adds response_format json_object", async () => {
    const fetchImpl = mockFetch({ choices: [{ message: { content: "{}" } }] });
    const client = createOpenAICompatClient({
      baseUrl: "https://api.example/v1",
      apiKey: "k",
      defaultModel: "m",
      fetchImpl,
    });

    await client.chat(MSGS, { json: true, model: "override", temperature: 0.2 });

    const init = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1];
    const payload = JSON.parse(init.body);
    expect(payload.response_format).toEqual({ type: "json_object" });
    expect(payload.model).toBe("override");
    expect(payload.temperature).toBe(0.2);
  });

  test("throws on non-ok response", async () => {
    const fetchImpl = mockFetch({ error: "boom" }, false, 429);
    const client = createOpenAICompatClient({
      baseUrl: "https://api.example/v1",
      apiKey: "k",
      defaultModel: "m",
      fetchImpl,
    });

    await expect(client.chat(MSGS)).rejects.toThrow(/LLM 429/);
  });

  test("throws when content missing", async () => {
    const fetchImpl = mockFetch({ choices: [{}] });
    const client = createOpenAICompatClient({
      baseUrl: "https://api.example/v1",
      apiKey: "k",
      defaultModel: "m",
      fetchImpl,
    });

    await expect(client.chat(MSGS)).rejects.toThrow(/content/);
  });

  test("rejects media before sending a request", async () => {
    const fetchImpl = mockFetch({ choices: [] });
    const client = createOpenAICompatClient({
      baseUrl: "https://api.example/v1",
      apiKey: "k",
      defaultModel: "m",
      fetchImpl,
    });

    await expect(
      client.chat([
        {
          role: "user",
          content: [
            {
              type: "media",
              mediaType: "video",
              source: { kind: "uri", uri: "https://youtu.be/abc" },
            },
          ],
        },
      ]),
    ).rejects.toThrow("provider:media_unsupported");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("createGeminiClient", () => {
  test("serializes YouTube media through generateContent", async () => {
    const fetchImpl = mockFetch({
      candidates: [{ content: { parts: [{ text: "{}" }] } }],
    });
    const client = createGeminiClient({
      apiKey: "k",
      defaultModel: "gemini-2.5-flash",
      fetchImpl,
    });

    expect(client.capabilities).toEqual({
      audioInput: true,
      videoInput: true,
      structuredOutput: true,
    });
    await client.chat(
      [
        { role: "system", content: "trusted system instruction" },
        {
          role: "user",
          content: [
            {
              type: "media",
              mediaType: "video",
              source: { kind: "uri", uri: "https://youtu.be/abc" },
            },
            { type: "text", text: "00:10-00:30만 분석" },
          ],
        },
      ],
      { json: true, temperature: 0 },
    );

    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>)
      .mock.calls[0];
    expect(url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    );
    expect(init.headers["x-goog-api-key"]).toBe("k");
    const payload = JSON.parse(init.body);
    expect(payload.system_instruction.parts).toEqual([
      { text: "trusted system instruction" },
    ]);
    expect(payload.contents[0].parts[0].file_data.file_uri).toBe(
      "https://youtu.be/abc",
    );
    expect(payload.contents[0].parts[1]).toEqual({
      text: "00:10-00:30만 분석",
    });
    expect(payload.generationConfig).toMatchObject({
      temperature: 0,
      responseMimeType: "application/json",
    });
  });
});

describe("getLlmClient", () => {
  test("selects Gemini and Ollama from environment", () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "key";
    expect(getLlmClient().capabilities.videoInput).toBe(true);

    process.env.LLM_PROVIDER = "ollama";
    expect(getLlmClient().capabilities.videoInput).toBe(false);
  });

  test("rejects missing Gemini credentials and unknown providers", () => {
    process.env.LLM_PROVIDER = "gemini";
    delete process.env.GEMINI_API_KEY;
    expect(() => getLlmClient()).toThrow("GEMINI_API_KEY 미설정");
    process.env.LLM_PROVIDER = "unknown";
    expect(() => getLlmClient()).toThrow("알 수 없는 LLM_PROVIDER");
    delete process.env.LLM_PROVIDER;
  });
});
