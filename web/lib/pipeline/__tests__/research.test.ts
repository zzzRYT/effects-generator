import { describe, expect, test, vi } from "vitest";
import { researchSong } from "../research";
import type { LlmClient } from "../../llm/client";

const INPUT = { songId: "song-1", artist: "Oasis", title: "Wonderwall" };

function llmReturning(text: string): { llm: LlmClient; chat: ReturnType<typeof vi.fn> } {
  const chat = vi.fn(async () => text);
  return {
    llm: {
      capabilities: {
        audioInput: false,
        videoInput: false,
        structuredOutput: true,
      },
      chat,
    },
    chat,
  };
}

describe("researchSong", () => {
  test("cache hit → returns cached notes, no LLM call", async () => {
    const select = vi.fn(async () => [{ notes: { notes: "cached" }, model_used: "gemini-2.5-flash" }]);
    const { llm, chat } = llmReturning("{}");
    const insert = vi.fn(async () => []);

    const r = await researchSong(INPUT, { select: select as never, llm, insert: insert as never });

    expect(r.cached).toBe(true);
    expect(r.notes).toEqual({ notes: "cached" });
    expect(chat).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  test("cache miss → LLM research parsed and persisted", async () => {
    const select = vi.fn(async () => []);
    const { llm, chat } = llmReturning('{"gear":[],"notes":"n","confidence":0.3}');
    const insert = vi.fn(async () => []);

    const r = await researchSong(INPUT, { select: select as never, llm, insert: insert as never, model: "gemini-2.5-flash" });

    expect(r.cached).toBe(false);
    expect(r.notes).toMatchObject({ notes: "n", confidence: 0.3 });
    expect(chat).toHaveBeenCalledOnce();

    const [table, rows, opts] = insert.mock.calls[0];
    expect(table).toBe("song_research");
    expect(rows[0]).toMatchObject({ song_id: "song-1", model_used: "gemini-2.5-flash" });
    expect(opts).toMatchObject({ onConflict: "song_id" });
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
