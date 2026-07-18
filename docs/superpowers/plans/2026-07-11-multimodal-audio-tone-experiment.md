# Multimodal Audio Tone Experiment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an admin-only `/lab/audio-tone` experiment that compares text-only and YouTube-audio-enriched GP-150 tone settings through a controlled blind A/B evaluation.

**Architecture:** Extend the shared `LlmClient` with typed media parts and provider capabilities, use Gemini's native `generateContent` REST format for YouTube input, and keep Ollama on the text-only OpenAI-compatible adapter. Extract non-persisting canonical and projection cores so the experiment can reuse production logic without writing `canonical_tones` or `tones`; persist only experiment runs and evaluations in a private Supabase table.

**Tech Stack:** Next.js 16 App Router/Route Handlers/`proxy.ts`, React 19, TypeScript, Supabase PostgREST/Postgres, Gemini REST API, YouTube IFrame Player API, Vitest/Testing Library, Playwright.

**Design authority:** `docs/superpowers/specs/2026-07-11-multimodal-audio-tone-experiment-design.md`

---

## File map

### Authentication boundary

- Create `web/lib/admin/session.ts` — signed `ADMIN_SECRET` cookie creation and verification.
- Create `web/lib/admin/require-admin.ts` — request-time cookie verification for Route Handlers and Server Components.
- Create `web/lib/admin/__tests__/session.test.ts` — expiry, tamper, and wrong-secret tests.
- Create `web/app/api/admin/session/route.ts` — login/logout cookie endpoint.
- Create `web/app/api/admin/session/__tests__/route.test.ts` — route contract tests.
- Create `web/app/admin/login/page.tsx` — login shell with safe `next` destination.
- Create `web/components/admin/AdminLoginForm.tsx` — client login form.
- Create `web/components/admin/admin-login.module.css` — login styles.
- Create `web/proxy.ts` — protect `/admin`, `/lab`, and `/api/lab` using Next.js 16 proxy convention.

### LLM and pipeline cores

- Modify `web/lib/llm/client.ts` — media content union, capabilities, native Gemini adapter, text-only OpenAI adapter.
- Modify `web/lib/llm/__tests__/client.test.ts` — compatibility, media serialization, and capability tests.
- Create `web/lib/pipeline/audio-observations.ts` — observation types, prompt, parser, and validation.
- Create `web/lib/pipeline/__tests__/audio-observations.test.ts` — strict media output tests.
- Create `web/lib/pipeline/canon-draft.ts` — non-persisting canonical generation core.
- Create `web/lib/pipeline/__tests__/canon-draft.test.ts` — baseline/enriched prompt and gate tests.
- Modify `web/lib/pipeline/generate.ts` — delegate generation to `generateCanonDraft`, then persist only in production path.
- Modify `web/lib/pipeline/__tests__/generate.test.ts` — persistence regression tests.
- Create `web/lib/pipeline/project-draft.ts` — non-persisting five-role projection core.
- Create `web/lib/pipeline/__tests__/project-draft.test.ts` — atomic projection and derived-role tests.
- Modify `web/lib/pipeline/projector.ts` — delegate shared work to the new projection core.

### Experiment backend

- Create `supabase/migrations/20260711090000_multimodal_tone_experiments.sql` — private experiment table and constraints.
- Create `web/lib/audio-experiment/contracts.ts` — input, DB row, public response, and evaluation types.
- Create `web/lib/audio-experiment/validate.ts` — YouTube/time/role/evaluation validation.
- Create `web/lib/audio-experiment/__tests__/validate.test.ts` — validation matrix.
- Create `web/lib/audio-experiment/blind.ts` — injectable A/B assignment and safe response projection.
- Create `web/lib/audio-experiment/__tests__/blind.test.ts` — pre-evaluation secrecy and reveal tests.
- Create `web/lib/audio-experiment/runner.ts` — atomic analysis, paired generation, projection, and status updates.
- Create `web/lib/audio-experiment/__tests__/runner.test.ts` — paired-variable and failure tests.
- Create `web/app/api/lab/audio-tone/experiments/route.ts` — create experiment and start `after()` work.
- Create `web/app/api/lab/audio-tone/experiments/[id]/route.ts` — poll anonymized state.
- Create `web/app/api/lab/audio-tone/experiments/[id]/evaluation/route.ts` — submit once and reveal.
- Create route tests beside each handler.

### Lab UI

- Create `web/lib/audio-experiment/time.ts` and tests — display/parse time values.
- Create `web/lib/audio-experiment/timeline.ts` and tests — pure role-lane state transitions.
- Create `web/components/audio-lab/useYouTubePlayer.ts` — IFrame API lifecycle adapter.
- Create `web/components/audio-lab/RoleRangeLane.tsx` — accessible dual-range role lane.
- Create `web/components/audio-lab/AudioToneLab.tsx` — input, progress polling, blind scoring, and reveal state machine.
- Create `web/components/audio-lab/audio-tone-lab.module.css` — responsive three-lane timeline and A/B layout.
- Create `web/components/__tests__/RoleRangeLane.test.tsx` and `AudioToneLab.test.tsx`.
- Create `web/app/lab/audio-tone/page.tsx` — admin-only page and approved gear loaders.
- Create `web/e2e/audio-tone-lab.spec.ts` — mocked YouTube/API browser flow.

---

### Task 1: Add the signed admin session primitive

**Files:**
- Create: `web/lib/admin/session.ts`
- Create: `web/lib/admin/__tests__/session.test.ts`

- [ ] **Step 1: Write the failing session tests**

```ts
import { describe, expect, test } from "vitest";
import { createAdminSession, verifyAdminSession } from "../session";

describe("admin session", () => {
  test("accepts a signed unexpired session", async () => {
    const value = await createAdminSession("secret", 1_000, 3_600);
    await expect(verifyAdminSession(value, "secret", 2_000)).resolves.toBe(true);
  });

  test("rejects tampering, expiry, and the wrong secret", async () => {
    const value = await createAdminSession("secret", 1_000, 10);
    await expect(verifyAdminSession(`${value}x`, "secret", 1_001)).resolves.toBe(false);
    await expect(verifyAdminSession(value, "other", 1_001)).resolves.toBe(false);
    await expect(verifyAdminSession(value, "secret", 1_011)).resolves.toBe(false);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `cd web && npx vitest run lib/admin/__tests__/session.test.ts`

Expected: FAIL because `../session` does not exist.

- [ ] **Step 3: Implement the signed cookie value**

```ts
export const ADMIN_COOKIE = "guitar_admin";
export const ADMIN_SESSION_SECONDS = 8 * 60 * 60;

const encoder = new TextEncoder();

async function signature(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createAdminSession(
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  ttlSeconds = ADMIN_SESSION_SECONDS,
): Promise<string> {
  const expires = nowSeconds + ttlSeconds;
  const payload = `v1.${expires}`;
  return `${payload}.${await signature(payload, secret)}`;
}

export async function verifyAdminSession(
  value: string | undefined,
  secret: string | undefined,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  if (!value || !secret) return false;
  const [version, expiresRaw, supplied] = value.split(".");
  const expires = Number(expiresRaw);
  if (version !== "v1" || !Number.isInteger(expires) || expires <= nowSeconds || !supplied) return false;
  return supplied === await signature(`${version}.${expires}`, secret);
}
```

- [ ] **Step 4: Run the test and verify GREEN**

Run: `cd web && npx vitest run lib/admin/__tests__/session.test.ts`

Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/admin/session.ts web/lib/admin/__tests__/session.test.ts
git commit -m "feat: 어드민 서명 세션 계약 추가"
```

### Task 2: Protect admin/lab routes and add login/logout

**Files:**
- Create: `web/app/api/admin/session/route.ts`
- Create: `web/app/api/admin/session/__tests__/route.test.ts`
- Create: `web/app/admin/login/page.tsx`
- Create: `web/components/admin/AdminLoginForm.tsx`
- Create: `web/components/admin/admin-login.module.css`
- Create: `web/proxy.ts`
- Modify: `web/.env.example`

- [ ] **Step 1: Write failing route tests**

```ts
import { beforeEach, describe, expect, test, vi } from "vitest";
import { POST, DELETE } from "../route";

const set = vi.fn();
const remove = vi.fn();
vi.mock("next/headers", () => ({ cookies: async () => ({ set, delete: remove }) }));

describe("admin session route", () => {
  beforeEach(() => { vi.clearAllMocks(); process.env.ADMIN_SECRET = "secret"; });

  test("rejects a wrong password", async () => {
    const response = await POST(new Request("http://x/api/admin/session", {
      method: "POST", body: JSON.stringify({ password: "wrong" }),
    }));
    expect(response.status).toBe(401);
    expect(set).not.toHaveBeenCalled();
  });

  test("sets and clears the HttpOnly session", async () => {
    const response = await POST(new Request("http://x/api/admin/session", {
      method: "POST", body: JSON.stringify({ password: "secret" }),
    }));
    expect(response.status).toBe(204);
    expect(set).toHaveBeenCalledWith("guitar_admin", expect.any(String), expect.objectContaining({ httpOnly: true }));
    expect((await DELETE()).status).toBe(204);
    expect(remove).toHaveBeenCalledWith("guitar_admin");
  });
});
```

- [ ] **Step 2: Run the route test and verify RED**

Run: `cd web && npx vitest run app/api/admin/session/__tests__/route.test.ts`

Expected: FAIL because the route does not exist.

- [ ] **Step 3: Implement the session endpoint and proxy boundary**

```ts
// app/api/admin/session/route.ts
import { cookies } from "next/headers";
import { ADMIN_COOKIE, ADMIN_SESSION_SECONDS, createAdminSession } from "@/lib/admin/session";

export async function POST(request: Request): Promise<Response> {
  const { password } = await request.json().catch(() => ({ password: "" }));
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return Response.json({ error: "ADMIN_SECRET 미설정" }, { status: 500 });
  if (password !== secret) return Response.json({ error: "비밀번호가 올바르지 않아요" }, { status: 401 });
  (await cookies()).set(ADMIN_COOKIE, await createAdminSession(secret), {
    httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: ADMIN_SESSION_SECONDS,
  });
  return new Response(null, { status: 204 });
}

export async function DELETE(): Promise<Response> {
  (await cookies()).delete(ADMIN_COOKIE);
  return new Response(null, { status: 204 });
}
```

Add a defense-in-depth helper used by every lab Route Handler, even though `proxy.ts` already guards the URL:

```ts
// lib/admin/require-admin.ts
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifyAdminSession } from "./session";

export async function hasAdminSession(): Promise<boolean> {
  return verifyAdminSession((await cookies()).get(ADMIN_COOKIE)?.value, process.env.ADMIN_SECRET);
}
```

```ts
// proxy.ts (Next.js 16: middleware.ts is deprecated)
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, verifyAdminSession } from "@/lib/admin/session";

export async function proxy(request: NextRequest) {
  const valid = await verifyAdminSession(request.cookies.get(ADMIN_COOKIE)?.value, process.env.ADMIN_SECRET);
  if (valid) return NextResponse.next();
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return Response.json({ error: "인증 필요" }, { status: 401 });
  }
  const login = new URL("/admin/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/admin/((?!login).*)", "/lab/:path*", "/api/lab/:path*"] };
```

- [ ] **Step 4: Implement the login page and client form**

The form must POST `{password}` to `/api/admin/session`, accept only a same-origin path beginning with `/admin` or `/lab` for `next`, and use `router.replace(nextPath)` after a `204`. Add `ADMIN_SECRET=` to `.env.example`; never add a real value.

```tsx
// app/admin/login/page.tsx
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export default async function AdminLoginPage({ searchParams }: {
  searchParams: Promise<{ next?: string }>;
}) {
  const raw = (await searchParams).next ?? "/lab/audio-tone";
  const nextPath = raw.startsWith("/admin") || raw.startsWith("/lab") ? raw : "/lab/audio-tone";
  return <main><h1>관리자 로그인</h1><AdminLoginForm nextPath={nextPath} /></main>;
}
```

- [ ] **Step 5: Run focused tests and checks**

Run: `cd web && npx vitest run lib/admin/__tests__/session.test.ts app/api/admin/session/__tests__/route.test.ts && npm run typecheck`

Expected: tests PASS and typecheck exits 0.

- [ ] **Step 6: Commit**

```bash
git add web/app/api/admin web/app/admin/login web/components/admin web/lib/admin/require-admin.ts web/proxy.ts web/.env.example
git commit -m "feat: 어드민·랩 경로 시크릿 인증 추가"
```

### Task 3: Extend `LlmClient` with media and capabilities

**Files:**
- Modify: `web/lib/llm/client.ts`
- Modify: `web/lib/llm/__tests__/client.test.ts`

- [ ] **Step 1: Add failing contract and serialization tests**

```ts
test("Gemini serializes YouTube media through generateContent", async () => {
  const fetchImpl = mockFetch({ candidates: [{ content: { parts: [{ text: "{}" }] } }] });
  const client = createGeminiClient({ apiKey: "k", defaultModel: "gemini-2.5-flash", fetchImpl });
  expect(client.capabilities).toEqual({ audioInput: true, videoInput: true, structuredOutput: true });
  await client.chat([{ role: "user", content: [
    { type: "media", mediaType: "video", source: { kind: "uri", uri: "https://youtu.be/abc" } },
    { type: "text", text: "00:10-00:30만 분석" },
  ] }], { json: true, temperature: 0 });
  const payload = JSON.parse((fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
  expect(payload.contents[0].parts[0].file_data.file_uri).toBe("https://youtu.be/abc");
  expect(payload.generationConfig).toMatchObject({ temperature: 0, responseMimeType: "application/json" });
});
```

Also update every `LlmClient` fixture in pipeline tests to include explicit capabilities.

- [ ] **Step 2: Run tests and verify RED**

Run: `cd web && npx vitest run lib/llm/__tests__/client.test.ts lib/pipeline/__tests__/generate.test.ts`

Expected: FAIL because `createGeminiClient`, media content, and capabilities do not exist.

- [ ] **Step 3: Implement the common contract and adapters**

```ts
export type LlmPart =
  | { type: "text"; text: string }
  | { type: "media"; mediaType: "audio" | "video"; source:
      | { kind: "uri"; uri: string; mimeType?: string }
      | { kind: "inline"; data: string; mimeType: string } };

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | LlmPart[];
}

export interface LlmCapabilities {
  audioInput: boolean;
  videoInput: boolean;
  structuredOutput: boolean;
}

export interface LlmClient {
  capabilities: LlmCapabilities;
  chat(messages: ChatMessage[], opts?: ChatOptions): Promise<string>;
}
```

`createOpenAICompatClient` keeps its current payload and declares media capabilities false; throw `provider:media_unsupported` if it receives a media part. `createGeminiClient` sends text and `file_data`/`inline_data` parts to `v1beta/models/{model}:generateContent`, combines system messages into `system_instruction`, maps assistant to Gemini role `model`, and extracts `candidates[0].content.parts[].text`. `getLlmClient()` returns `createGeminiClient` for `gemini` and OpenAI compatibility for `ollama`.

- [ ] **Step 4: Run focused and full LLM/pipeline tests**

Run: `cd web && npx vitest run lib/llm lib/pipeline/__tests__/generate.test.ts lib/pipeline/__tests__/research.test.ts`

Expected: all selected tests PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/llm web/lib/pipeline/__tests__
git commit -m "feat: LLM 공용 미디어 입력 계약 추가"
```

### Task 4: Add strict audio observations

**Files:**
- Create: `web/lib/pipeline/audio-observations.ts`
- Create: `web/lib/pipeline/__tests__/audio-observations.test.ts`

- [ ] **Step 1: Write failing parser and capability tests**

Test a valid three-role JSON response, invalid confidence/ranges, a role not requested, duplicate roles, and a client with `videoInput:false`. Assert the prompt contains each requested `MM:SS-MM:SS` range and says media instructions are untrusted content.

```ts
await expect(analyzeSongMedia(input, textOnlyClient)).rejects.toThrow("provider:video_unsupported");
expect(parseAudioObservations(raw, segments)).toEqual([
  expect.objectContaining({ role: "lead", startMs: 10_000, endMs: 30_000, gain: "crunch" }),
]);
```

- [ ] **Step 2: Run and verify RED**

Run: `cd web && npx vitest run lib/pipeline/__tests__/audio-observations.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement `AudioObservation`, prompt construction, and strict parsing**

Use literal allowlists for role/gain/brightness/compression/effect kind; require confidence in `[0,1]`; require returned role and timestamps to exactly match a requested segment. `analyzeSongMedia()` sends one YouTube media part plus one text part and calls `chat(..., { json:true, temperature:0 })`.

```ts
export async function analyzeSongMedia(input: AnalyzeSongMediaInput, llm: LlmClient) {
  if (!llm.capabilities.videoInput) throw new Error("provider:video_unsupported");
  const raw = await llm.chat([{ role: "user", content: [
    { type: "media", mediaType: "video", source: { kind: "uri", uri: input.youtubeUrl } },
    { type: "text", text: buildAudioObservationPrompt(input.segments) },
  ] }], { json: true, temperature: 0 });
  return parseAudioObservations(parseLlmJson(raw), input.segments);
}
```

- [ ] **Step 4: Run and verify GREEN**

Run: `cd web && npx vitest run lib/pipeline/__tests__/audio-observations.test.ts`

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/pipeline/audio-observations.ts web/lib/pipeline/__tests__/audio-observations.test.ts
git commit -m "feat: YouTube 구간 오디오 관측 계약 추가"
```

### Task 5: Extract non-persisting canonical and projection cores

**Files:**
- Create: `web/lib/pipeline/canon-draft.ts`
- Create: `web/lib/pipeline/project-draft.ts`
- Create: `web/lib/pipeline/__tests__/canon-draft.test.ts`
- Create: `web/lib/pipeline/__tests__/project-draft.test.ts`
- Modify: `web/lib/pipeline/generate.ts`
- Modify: `web/lib/pipeline/projector.ts`
- Modify: existing generate/projector tests

- [ ] **Step 1: Write failing draft-core tests**

```ts
test("audio observations are the only enriched prompt delta", async () => {
  const baseline = await generateCanonDraft({ ...input, audioObservations: undefined }, deps);
  const enriched = await generateCanonDraft({ ...input, audioObservations: observations }, deps);
  expect(deps.chat.mock.calls[0][1]).toEqual({ json: true, temperature: 0 });
  const baselinePrompt = deps.chat.mock.calls[0][0][1].content as string;
  const enrichedPrompt = deps.chat.mock.calls[1][0][1].content as string;
  expect(enrichedPrompt).toBe(`${baselinePrompt}\n\n[오디오 관측]\n${JSON.stringify(observations)}`);
  expect(baseline.roles).toHaveLength(3);
  expect(enriched.roles).toHaveLength(3);
});

test("projectCanonDraft returns five roles without DB writes", () => {
  const result = projectCanonDraft(canonRoles, catalog);
  expect(result.roles.map((role) => role.role)).toEqual(["lead", "backing", "solo", "real_amp", "phone"]);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `cd web && npx vitest run lib/pipeline/__tests__/canon-draft.test.ts lib/pipeline/__tests__/project-draft.test.ts`

Expected: FAIL because the draft cores do not exist.

- [ ] **Step 3: Extract the canonical draft core**

Move LLM parsing, three-role iteration, and `validateCanon` handling from `generateCanon()` into `generateCanonDraft()`. Export the existing `ensureSong()` helper so the experiment can create only the required `songs` row before reusing `researchSong`; the production wrapper continues to call `researchSong`, `loadGrounding`, then inserts returned rows. Add an optional `[오디오 관측]` section to `buildCanonPrompt`; omit the entire section when observations are absent.

- [ ] **Step 4: Extract the projection draft core**

Move catalog index construction, role projection, representative role selection, output derivation, and `validateProjection` into `projectCanonDraft(canonicalRoles, effectsCatalog)`. `projectSong()` remains the DB wrapper: select inputs, call core, convert successful draft roles to tone rows, insert.

- [ ] **Step 5: Run regression and new tests**

Run: `cd web && npx vitest run lib/pipeline/__tests__/canon-draft.test.ts lib/pipeline/__tests__/project-draft.test.ts lib/pipeline/__tests__/generate.test.ts lib/pipeline/__tests__/projector.test.ts lib/pipeline/__tests__/projector-golden.test.ts`

Expected: all tests PASS and the golden mapping counts remain unchanged.

- [ ] **Step 6: Commit**

```bash
git add web/lib/pipeline/canon-draft.ts web/lib/pipeline/project-draft.ts web/lib/pipeline/generate.ts web/lib/pipeline/projector.ts web/lib/pipeline/prompts.ts web/lib/pipeline/__tests__
git commit -m "refactor: 캐논·투영 순수 초안 코어 분리"
```

### Task 6: Add experiment persistence, validation, and blinding

**Files:**
- Create: `supabase/migrations/20260711090000_multimodal_tone_experiments.sql`
- Create: `web/lib/audio-experiment/contracts.ts`
- Create: `web/lib/audio-experiment/validate.ts`
- Create: `web/lib/audio-experiment/blind.ts`
- Create: `web/lib/audio-experiment/__tests__/validate.test.ts`
- Create: `web/lib/audio-experiment/__tests__/blind.test.ts`

- [ ] **Step 1: Write failing validation and blinding tests**

Cover standard/watch/short YouTube URLs, duplicate roles, 4.999/5/60/60.001-second boundaries, end beyond duration, invalid evaluation scores, deterministic injected A/B assignment, no mapping before evaluation, and reveal after evaluation.

- [ ] **Step 2: Run and verify RED**

Run: `cd web && npx vitest run lib/audio-experiment/__tests__/validate.test.ts lib/audio-experiment/__tests__/blind.test.ts`

Expected: FAIL because modules do not exist.

- [ ] **Step 3: Add the private table migration**

```sql
create table tone_experiments (
  id uuid primary key default gen_random_uuid(),
  request jsonb not null,
  video_id text not null,
  segments jsonb not null,
  model_used text not null,
  prompt_version text not null,
  projector_version text not null,
  status text not null default 'queued'
    check (status in ('queued','analyzing','generating','projecting','ready','failed','evaluated')),
  progress jsonb not null default '{}',
  audio_observations jsonb,
  baseline_result jsonb,
  enriched_result jsonb,
  blind_assignment jsonb,
  evaluation jsonb,
  preferred_variant text check (preferred_variant is null or preferred_variant in ('baseline','enriched')),
  failure_code text,
  failure_detail text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index tone_experiments_status_created on tone_experiments(status, created_at);
create trigger tone_experiments_updated before update on tone_experiments
for each row execute function set_updated_at();
alter table tone_experiments enable row level security;
-- No public policy: every read/write uses service_role after admin-session validation.
```

- [ ] **Step 4: Implement contracts, validators, and blind projection**

`validateExperimentInput()` returns normalized `{youtubeUrl, videoId, segments, artist, title, guitar, processor}`. `assignBlind(random)` returns `{A:'baseline',B:'enriched'}` or the inverse. `toPublicExperiment(row, reveal)` emits only anonymous A/B until `status==='evaluated'`; never emit `failure_detail` or `blind_assignment`.

- [ ] **Step 5: Run tests and migration checks**

Run: `cd web && npx vitest run lib/audio-experiment && cd .. && rg -n "alter table tone_experiments enable row level security|No public policy" supabase/migrations/20260711090000_multimodal_tone_experiments.sql`

Expected: tests PASS and both migration safety lines are found.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260711090000_multimodal_tone_experiments.sql web/lib/audio-experiment
git commit -m "feat: 멀티모달 톤 실험 저장·블라인드 계약 추가"
```

### Task 7: Build the atomic paired experiment runner

**Files:**
- Create: `web/lib/audio-experiment/runner.ts`
- Create: `web/lib/audio-experiment/__tests__/runner.test.ts`

- [ ] **Step 1: Write failing orchestration tests**

Inject every dependency. Assert status order `analyzing → generating → projecting → ready`; one `analyzeSongMedia` call; baseline/enriched `Promise.all` inputs differ only by observations; no insert to `canonical_tones`/`tones`; exact same model/temperature; either generation or projection failure yields `failed` with the stable code and no public partial result.

- [ ] **Step 2: Run and verify RED**

Run: `cd web && npx vitest run lib/audio-experiment/__tests__/runner.test.ts`

Expected: FAIL because `runner.ts` does not exist.

- [ ] **Step 3: Implement the runner**

```ts
export async function runToneExperiment(
  id: string,
  request: ExperimentRequest,
  resolved: ResolvedRequest,
  deps: RunnerDeps = createDefaultRunnerDeps(),
) {
  try {
    await deps.update(id, "analyzing");
    const songId = resolved.song.id ?? await deps.ensureSong(request, resolved);
    const [research, grounding, catalog] = await Promise.all([
      deps.research({ songId, artist: request.artist, title: request.title }),
      deps.grounding(),
      deps.catalog(resolved.processor.id),
    ]);
    const observations = await deps.analyze({ youtubeUrl: request.youtubeUrl, segments: request.segments });
    await deps.update(id, "generating", { audio_observations: observations });
    const [baseline, enriched] = await Promise.all([
      deps.generate({ ...request, research, grounding, audioObservations: undefined }),
      deps.generate({ ...request, research, grounding, audioObservations: observations }),
    ]);
    await deps.update(id, "projecting");
    const baselineProjection = deps.project(baseline.roles, catalog);
    const enrichedProjection = deps.project(enriched.roles, catalog);
    assertComparable(baselineProjection, "baseline:projection_failed");
    assertComparable(enrichedProjection, "enriched:projection_failed");
    await deps.ready(id, baseline, enriched, baselineProjection, enrichedProjection);
  } catch (error) {
    await deps.fail(id, classifyExperimentError(error), error instanceof Error ? error.message : String(error));
  }
}
```

`createDefaultRunnerDeps()` must compose the existing `ensureSong`, `researchSong`, `loadGrounding`, processor catalog `sbSelect`, `generateCanonDraft`, `projectCanonDraft`, and service-role status PATCH functions. The only production tables the experiment may write are `songs` and `song_research` through those existing cache helpers; it must never insert into `canonical_tones` or `tones`.

- [ ] **Step 4: Run and verify GREEN**

Run: `cd web && npx vitest run lib/audio-experiment/__tests__/runner.test.ts`

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/audio-experiment/runner.ts web/lib/audio-experiment/__tests__/runner.test.ts
git commit -m "feat: 원자적 텍스트·멀티모달 A/B 실행기 추가"
```

### Task 8: Add create, polling, and evaluation APIs

**Files:**
- Create: `web/app/api/lab/audio-tone/experiments/route.ts`
- Create: `web/app/api/lab/audio-tone/experiments/__tests__/route.test.ts`
- Create: `web/app/api/lab/audio-tone/experiments/[id]/route.ts`
- Create: `web/app/api/lab/audio-tone/experiments/[id]/__tests__/route.test.ts`
- Create: `web/app/api/lab/audio-tone/experiments/[id]/evaluation/route.ts`
- Create: `web/app/api/lab/audio-tone/experiments/[id]/evaluation/__tests__/route.test.ts`

- [ ] **Step 1: Write failing route tests**

Test unauthenticated `401` on every handler, malformed JSON/URL/segments, unresolved guitar/processor, capability failure before insert, `202 {experimentId}`, anonymized ready response, failed response without `failure_detail`, valid evaluation reveal, and a second evaluation returning `409`.

- [ ] **Step 2: Run and verify RED**

Run: `cd web && npx vitest run app/api/lab/audio-tone/experiments`

Expected: FAIL because routes do not exist.

- [ ] **Step 3: Implement POST create + `after()`**

Follow `app/api/generate/route.ts`: first call `hasAdminSession()` and return `401` if false; parse/validate; call `resolveRequest` for artist/title/guitar/processor and reject unresolved gear with `422`; check `getLlmClient().capabilities.videoInput`; insert `tone_experiments`; capture the normalized request and resolved tuple before `after()`; then run `runToneExperiment`. Set `maxDuration=60` and run paired generation concurrently.

```ts
after(async () => {
  await runToneExperiment(inserted.id, normalized, resolveResult.resolved);
});
return Response.json({ experimentId: inserted.id }, { status: 202 });
```

- [ ] **Step 4: Implement GET poll and atomic evaluation PATCH**

GET and evaluation each call `hasAdminSession()` before any Supabase operation. GET selects only the experiment ID under admin service-role access and uses `toPublicExperiment`. Evaluation validates scores, then PATCHes with `status=eq.ready` in the PostgREST filter; if no representation returns, respond `409`. Convert A/B preference to the stored actual variant server-side before persistence.

- [ ] **Step 5: Run route and backend tests**

Run: `cd web && npx vitest run app/api/lab/audio-tone/experiments lib/audio-experiment`

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add web/app/api/lab/audio-tone/experiments
git commit -m "feat: 멀티모달 실험 생성·조회·평가 API 추가"
```

### Task 9: Build pure time/timeline state and accessible role lanes

**Files:**
- Create: `web/lib/audio-experiment/time.ts`
- Create: `web/lib/audio-experiment/timeline.ts`
- Create: `web/lib/audio-experiment/__tests__/time.test.ts`
- Create: `web/lib/audio-experiment/__tests__/timeline.test.ts`
- Create: `web/components/audio-lab/RoleRangeLane.tsx`
- Create: `web/components/__tests__/RoleRangeLane.test.tsx`

- [ ] **Step 1: Write failing pure and component tests**

Test `MM:SS`/`HH:MM:SS`, invalid seconds, min/max duration clamping, start/end crossing prevention, 1-second arrow and 5-second Shift+Arrow increments, synchronized text input, and an accessible name for each thumb.

- [ ] **Step 2: Run and verify RED**

Run: `cd web && npx vitest run lib/audio-experiment/__tests__/time.test.ts lib/audio-experiment/__tests__/timeline.test.ts components/__tests__/RoleRangeLane.test.tsx`

Expected: FAIL because modules/components do not exist.

- [ ] **Step 3: Implement pure state first**

```ts
export function clampSegment(segment: Segment, durationMs: number): Segment {
  const startMs = Math.max(0, Math.min(segment.startMs, durationMs - 5_000));
  const endMs = Math.max(startMs + 5_000, Math.min(segment.endMs, startMs + 60_000, durationMs));
  return { ...segment, startMs, endMs };
}
```

`parseTimestamp()` accepts only `MM:SS` or `HH:MM:SS` with seconds/minutes below 60; `formatTimestamp()` uses `HH:MM:SS` only when needed.

- [ ] **Step 4: Implement `RoleRangeLane`**

Use two native `input[type=range]` elements over one track plus two text inputs. Keep the role label in a `<fieldset><legend>`, provide distinct `aria-label`s, and call `onPreview(startMs,endMs)` for loop playback. Do not implement business validation in the component; use the pure functions.

- [ ] **Step 5: Run and verify GREEN**

Run: `cd web && npx vitest run lib/audio-experiment/__tests__/time.test.ts lib/audio-experiment/__tests__/timeline.test.ts components/__tests__/RoleRangeLane.test.tsx`

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add web/lib/audio-experiment/time.ts web/lib/audio-experiment/timeline.ts web/lib/audio-experiment/__tests__ web/components/audio-lab/RoleRangeLane.tsx web/components/__tests__/RoleRangeLane.test.tsx
git commit -m "feat: 접근 가능한 역할별 영상 구간 편집기 추가"
```

### Task 10: Build the YouTube player and lab state machine

**Files:**
- Create: `web/components/audio-lab/useYouTubePlayer.ts`
- Create: `web/components/audio-lab/AudioToneLab.tsx`
- Create: `web/components/audio-lab/audio-tone-lab.module.css`
- Create: `web/components/__tests__/AudioToneLab.test.tsx`
- Create: `web/app/lab/audio-tone/page.tsx`

- [ ] **Step 1: Write failing UI state tests**

Mock the player adapter and fetch. Cover URL load, duration propagation, one-to-three active roles, input lock during polling, progress labels, retry after failed, ready A/B without identity text, required six scores plus preference, reveal only after evaluation, and no claim of acoustic similarity.

- [ ] **Step 2: Run and verify RED**

Run: `cd web && npx vitest run components/__tests__/AudioToneLab.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the player hook**

Load `https://www.youtube.com/iframe_api` once, chain any existing `window.onYouTubeIframeAPIReady`, create/destroy a player per video ID, expose `{durationMs, seekTo, playRange, stop}`, and clear the loop timer on unmount or range change. Add local TypeScript declarations instead of an unmaintained dependency.

- [ ] **Step 4: Implement the lab state machine**

Use explicit states `editing | submitting | polling | evaluating | revealed | failed`. The form includes artist, title, approved guitar, approved processor, YouTube URL, and active role lanes. Poll every 2.5 seconds with a three-minute client timeout, mirroring `GenProgress`; transient GET errors continue polling.

```ts
type LabState =
  | { type: "editing" }
  | { type: "polling"; experimentId: string; status: ExperimentStatus }
  | { type: "evaluating"; experimentId: string; variants: AnonymousVariants }
  | { type: "revealed"; result: RevealedExperiment }
  | { type: "failed"; message: string };
```

- [ ] **Step 5: Implement the page and styles**

The server page loads `getApprovedGuitars()` and `getApprovedProcessors()` and passes them to `AudioToneLab`. CSS uses existing tokens, three vertically separated lanes, 44px minimum touch targets, no horizontal page overflow at 320px, and `prefers-reduced-motion` for progress animation.

- [ ] **Step 6: Run component tests, typecheck, and lint**

Run: `cd web && npx vitest run components/__tests__/AudioToneLab.test.tsx components/__tests__/RoleRangeLane.test.tsx && npm run typecheck && npm run lint:check`

Expected: tests PASS; typecheck and lint exit 0.

- [ ] **Step 7: Commit**

```bash
git add web/components/audio-lab web/components/__tests__/AudioToneLab.test.tsx web/app/lab/audio-tone
git commit -m "feat: YouTube 멀티모달 블라인드 A/B 랩 UI 추가"
```

### Task 11: Add browser coverage, apply migration, and run the live acceptance gate

**Files:**
- Create: `web/e2e/audio-tone-lab.spec.ts`
- Modify: `docs/backlog.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Write the browser test before changing production code further**

Mock YouTube IFrame callbacks and `/api/lab/audio-tone/experiments*`. Verify login redirect, URL/player load, three role lanes at 320/768/1024/1440, keyboard range updates, progress, no pre-vote identity leak, score validation, reveal, failed retry, and axe zero serious/critical violations.

- [ ] **Step 2: Run Playwright and verify the test detects any remaining gap**

Run: `cd web && npx playwright test e2e/audio-tone-lab.spec.ts --project=mobile-320`

Expected: FAIL only for concrete missing UI behavior; fix each observed gap with the smallest source/test change, then rerun until PASS.

- [ ] **Step 3: Apply the Supabase migration and verify privacy**

Use the repository's configured Supabase migration workflow. After applying, run:

```sql
select relrowsecurity from pg_class where relname = 'tone_experiments';
select policyname from pg_policies where tablename = 'tone_experiments';
```

Expected: `relrowsecurity = true`; zero public policies. Insert/select one row with service-role credentials, then remove that verification row.

- [ ] **Step 4: Run the full automated gate**

Run:

```bash
cd web
npm run test
npm run test:cov
npm run lint:check
npm run typecheck
npm run typecheck:full
npm run build
npm run test:visual -- e2e/audio-tone-lab.spec.ts
```

Expected: all commands exit 0, coverage remains at least 80% for statements/branches/functions/lines, and every configured Playwright breakpoint passes.

- [ ] **Step 5: Run the real Gemini smoke before claiming the experiment usable**

With `ADMIN_SECRET`, Gemini, and Supabase env configured, run one public YouTube video with one 20-second lead segment. Verify the DB progression reaches `ready`, the GET response contains anonymous A/B only, both results have valid GP-150 models, evaluation changes status to `evaluated`, and reveal identifies variants. Record model/prompt/projector versions in the row; do not count this smoke toward the 10-song/30-segment adoption sample.

- [ ] **Step 6: Update project status without overstating results**

Add the lab as implemented but mark main-flow adoption pending the fixed threshold: 10 songs/30 segments, enriched win rate at least 70%, mean score improvement at least 0.5/5, and no projection-failure increase. State explicitly that settings-only evaluation does not establish acoustic similarity.

- [ ] **Step 7: Commit**

```bash
git add web/e2e/audio-tone-lab.spec.ts docs/backlog.md CLAUDE.md
git commit -m "test: 멀티모달 오디오 톤 실험 수용 게이트 추가"
```

---

## Execution notes

- Preserve the user's untracked `docs/research/` files; never stage them implicitly.
- Use `git add <explicit paths>` for every task commit.
- Do not add YouTube download, `ffmpeg`, server-side media storage, or a web DSP preview.
- Do not write experiment results to `canonical_tones` or `tones`.
- Do not reveal `blind_assignment` or `failure_detail` in any client response.
- Do not claim improved sound from settings-only scores.
- Keep the YouTube URL path behind `videoInput`; an MP3 upload can later use the same contract through `audioInput`.
