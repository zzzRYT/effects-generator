import { describe, expect, test, vi } from "vitest";
import { generateCanon } from "../generate";
import type { LlmClient } from "../../llm/client";
import type { ResolvedRequest, ToneRequest } from "../types";

const REQ: ToneRequest = { artist: "Oasis", title: "Wonderwall", guitar: "Cort G250", processor: "Valeton GP-150" };

function resolved(songId: string | null): ResolvedRequest {
  return {
    song: { id: songId, artist_norm: "oasis", title_norm: "wonderwall" },
    guitar: { id: "g1", slug: "cort-g250", body_archetype: "superstrat" },
    processor: { id: "p1", slug: "valeton-gp-150" },
  };
}

const RESEARCH_JSON = '{"gear":[],"notes":"연구","confidence":0.4}';

const CANON_JSON = JSON.stringify({
  roles: {
    lead: { chain: [{ type: "AMP", base_gear: { name: "Marshall JCM800", category: "amp" }, enabled: true, knobs: [{ name: "Gain", value: 7 }] }], confidence: 0.7 },
    backing: { chain: [{ type: "DST", category: "OD", base_gear: { name: "Ibanez TS-808", category: "OD" }, enabled: true, knobs: [{ name: "Drive", value: 5 }] }], confidence: 0.6 },
    solo: { chain: null, null_reason: "뚜렷한 솔로 없음", confidence: 0.9 },
  },
  sources: ["https://example.com/rig"],
});

/** research 호출(1회차) → canon 호출(2회차) 순서로 응답을 흘려준다. */
function twoCallLlm(canonJson: string): { llm: LlmClient; chat: ReturnType<typeof vi.fn> } {
  const chat = vi.fn().mockResolvedValueOnce(RESEARCH_JSON).mockResolvedValueOnce(canonJson);
  return {
    llm: {
      capabilities: {
        audioInput: false,
        videoInput: false,
        structuredOutput: true,
      },
      chat: chat as never,
    },
    chat,
  };
}

function insertSpy() {
  return vi.fn(async (table: string) => (table === "songs" ? [{ id: "song-new" }] : []));
}

describe("generateCanon", () => {
  test("3-role 캐논 생성·게이트·적재 (lead/backing 적재, solo=null)", async () => {
    const select = vi.fn(async () => []); // song_research miss + gear 빈 KB
    const insert = insertSpy();
    const { llm, chat } = twoCallLlm(CANON_JSON);

    const r = await generateCanon(REQ, resolved("song-1"), { select: select as never, insert: insert as never, llm });

    expect(chat).toHaveBeenCalledTimes(2); // research + canon
    expect(r.songId).toBe("song-1");
    expect(r.roles).toEqual([
      { role: "lead", status: "persisted" },
      { role: "backing", status: "persisted" },
      { role: "solo", status: "null" },
    ]);

    const canonCall = insert.mock.calls.find((c) => c[0] === "canonical_tones");
    expect(canonCall).toBeDefined();
    const [, rows, opts] = canonCall!;
    expect(opts).toMatchObject({ onConflict: "song_id,role" });
    expect(rows).toHaveLength(3);
    const solo = rows.find((x: Record<string, unknown>) => x.role === "solo");
    expect(solo).toMatchObject({ chain: null, null_reason: "뚜렷한 솔로 없음" });
    const lead = rows.find((x: Record<string, unknown>) => x.role === "lead");
    expect(Array.isArray((lead as { chain: unknown }).chain)).toBe(true);
    expect((lead as { confidence: unknown }).confidence).toBe(0.7);
  });

  test("게이트 실패 role 은 적재 보류 + issues 리포트(자동 수리 없음)", async () => {
    const badCanon = JSON.stringify({
      roles: {
        lead: { chain: [{ type: "NOPE", enabled: true, knobs: [] }] },
        backing: { chain: null, null_reason: "없음" },
        solo: { chain: null, null_reason: "없음" },
      },
    });
    const select = vi.fn(async () => []);
    const insert = insertSpy();
    const { llm } = twoCallLlm(badCanon);

    const r = await generateCanon(REQ, resolved("song-1"), { select: select as never, insert: insert as never, llm });

    const lead = r.roles.find((x) => x.role === "lead")!;
    expect(lead.status).toBe("skipped");
    expect(lead.issues!.length).toBeGreaterThan(0);

    const canonCall = insert.mock.calls.find((c) => c[0] === "canonical_tones")!;
    const rows = canonCall[1] as Record<string, unknown>[];
    expect(rows.map((x) => x.role).sort()).toEqual(["backing", "solo"]); // lead 제외
  });

  test("신곡(song.id=null) → songs upsert 로 id 확보", async () => {
    const select = vi.fn(async () => []);
    const insert = insertSpy();
    const { llm } = twoCallLlm(CANON_JSON);

    const r = await generateCanon(REQ, resolved(null), { select: select as never, insert: insert as never, llm });

    expect(r.songId).toBe("song-new");
    const songCall = insert.mock.calls.find((c) => c[0] === "songs")!;
    const [, rows, opts] = songCall;
    expect(rows[0]).toMatchObject({ artist: "Oasis", title: "Wonderwall", artist_norm: "oasis", title_norm: "wonderwall" });
    expect(opts).toMatchObject({ onConflict: "artist_norm,title_norm" });
  });

  test("리서치 캐시 히트면 researchCached=true, LLM 은 캐논만 호출", async () => {
    // song_research 조회는 캐시 히트, gear 조회는 빈 배열 — 테이블로 분기.
    const select = vi.fn(async (table: string) =>
      table === "song_research" ? [{ notes: { notes: "cached" }, model_used: "gemini" }] : [],
    );
    const insert = insertSpy();
    const chat = vi.fn().mockResolvedValueOnce(CANON_JSON); // 캐논 1회만
    const llm: LlmClient = {
      capabilities: {
        audioInput: false,
        videoInput: false,
        structuredOutput: true,
      },
      chat: chat as never,
    };

    const r = await generateCanon(REQ, resolved("song-1"), { select: select as never, insert: insert as never, llm });

    expect(r.researchCached).toBe(true);
    expect(chat).toHaveBeenCalledOnce();
  });
});
