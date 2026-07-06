import { describe, expect, test, vi } from "vitest";
import { createOpenAICompatClient, type ChatMessage } from "../client";

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
});
