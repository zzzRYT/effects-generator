import { describe, expect, test, vi } from "vitest";
import { researchSong } from "../research";
import type { LlmClient } from "../../llm/client";

const INPUT = { songId: "song-1", artist: "Oasis", title: "Wonderwall" };

function llmReturning(
  text: string,
  grounded?: { text: string; sources: Array<{ uri: string; title?: string }> },
): {
  llm: LlmClient;
  chat: ReturnType<typeof vi.fn>;
  groundedSearch: ReturnType<typeof vi.fn>;
} {
  const chat = vi.fn(async () => text);
  const groundedSearch = vi.fn(async () =>
    grounded ?? { text: "", sources: [] },
  );
  return {
    llm: {
      capabilities: {
        audioInput: false,
        videoInput: false,
        structuredOutput: true,
        searchGrounding: grounded !== undefined,
      },
      chat,
      groundedSearch,
    },
    chat,
    groundedSearch,
  };
}

describe("researchSong", () => {
  test("cache hit → returns cached notes, no LLM call", async () => {
    const select = vi.fn(async () => [{ notes: { notes: "cached" }, model_used: "gemini-2.5-flash" }]);
    const { llm, chat, groundedSearch } = llmReturning("{}");
    const insert = vi.fn(async () => []);

    const r = await researchSong(INPUT, { select: select as never, llm, insert: insert as never });

    expect(r.cached).toBe(true);
    expect(r.notes).toEqual({ notes: "cached" });
    expect(chat).not.toHaveBeenCalled();
    expect(groundedSearch).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  test("grounding cache miss → grounded report is normalized in a second call and persisted", async () => {
    const select = vi.fn(async () => []);
    const sources = [
      { uri: "https://example.com/rig", title: "Rig source" },
      { uri: "https://example.com/interview", title: "Interview" },
    ];
    const { llm, chat, groundedSearch } = llmReturning(
      '{"gear":[],"sources":["https://invented.invalid"],"notes":"n","confidence":0.3}',
      { text: "evidence report", sources },
    );
    const insert = vi.fn(async () => []);

    const r = await researchSong(INPUT, { select: select as never, llm, insert: insert as never, model: "gemini-2.5-flash" });

    expect(r.cached).toBe(false);
    expect(r.notes).toMatchObject({
      notes: "n",
      confidence: 0.3,
      sources,
    });
    expect(groundedSearch).toHaveBeenCalledOnce();
    expect(chat).toHaveBeenCalledOnce();
    const [groundedMessages, groundedOpts] = groundedSearch.mock.calls[0];
    expect(groundedMessages[1].content).toContain("Wonderwall");
    expect(groundedOpts).toEqual({ temperature: 0 });
    const [normalizationMessages, normalizationOpts] = chat.mock.calls[0];
    expect(normalizationMessages[1].content).toContain("evidence report");
    expect(normalizationMessages[1].content).toContain(
      "https://example.com/rig",
    );
    expect(normalizationOpts).toEqual({ json: true, temperature: 0 });

    const [table, rows, opts] = insert.mock.calls[0];
    expect(table).toBe("song_research");
    expect(rows[0]).toMatchObject({ song_id: "song-1", model_used: "gemini-2.5-flash" });
    expect(opts).toMatchObject({ onConflict: "song_id" });
    expect(rows[0].notes.sources).toEqual(sources);
  });

  test("search-unsupported client keeps the one-call structured text fallback", async () => {
    const select = vi.fn(async () => []);
    const { llm, chat, groundedSearch } = llmReturning(
      '{"gear":[],"notes":"fallback","confidence":0.2}',
    );

    const result = await researchSong(INPUT, {
      select: select as never,
      llm,
      insert: (async () => []) as never,
    });

    expect(result.notes).toMatchObject({ notes: "fallback" });
    expect(groundedSearch).not.toHaveBeenCalled();
    expect(chat).toHaveBeenCalledOnce();
    expect(chat.mock.calls[0][1]).toEqual({ json: true });
  });

  test("cache-miss query targets song_research by song_id (admin read)", async () => {
    const select = vi.fn(async () => []);
    const { llm } = llmReturning("{}");
    await researchSong(INPUT, { select: select as never, llm, insert: (async () => []) as never });

    const [table, query, admin] = select.mock.calls[0];
    expect(table).toBe("song_research");
    expect(query).toContain("song_id=eq.song-1");
    expect(admin).toBe(true);
  });

  test("non-JSON LLM output throws (경계 검증)", async () => {
    const select = vi.fn(async () => []);
    const { llm } = llmReturning("죄송하지만 정보를 찾을 수 없습니다");
    await expect(
      researchSong(INPUT, { select: select as never, llm, insert: (async () => []) as never }),
    ).rejects.toThrow(/JSON 파싱 실패/);
  });
});
