import { getLlmClient, type LlmClient } from "../llm/client";
import { createHash } from "node:crypto";
import { validateCanon, type GateIssue } from "./gate";
import { parseLlmJson } from "./json";
import { buildCanonPrompt, buildSingleToneCanonPrompt } from "./prompts";
import type { AudioObservation } from "./audio-observations";
import type { CanonBlock } from "./types";

export const CANON_ROLES = ["lead", "backing", "solo"] as const;
export type CanonRole = (typeof CANON_ROLES)[number];

export interface CanonDraftInput {
  artist: string;
  title: string;
  research: unknown;
  grounding: string;
}

export interface CanonDraftRole {
  role: CanonRole;
  status: "valid" | "null" | "skipped";
  chain: CanonBlock[] | null;
  nullReason: string | null;
  confidence: number | null;
  issues?: GateIssue[];
}

export interface CanonDraftResult {
  roles: CanonDraftRole[];
  sources: unknown[];
  modelUsed: string;
  rawResponseHash: string;
}

export interface CanonDraftDeps {
  llm?: LlmClient;
  model?: string;
}

interface RolePayload {
  chain: unknown;
  null_reason?: unknown;
  confidence?: unknown;
}

export async function generateCanonDraft(
  input: CanonDraftInput,
  deps: CanonDraftDeps = {},
): Promise<CanonDraftResult> {
  const llm = deps.llm ?? getLlmClient();
  const modelUsed = deps.model ?? process.env.LLM_MODEL ?? "gemini";
  const { system, user } = buildCanonPrompt(input);
  const raw = await llm.chat(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { json: true, temperature: 0 },
  );
  const parsed = parseLlmJson(raw);
  const rolesObj = isObject(parsed.roles) ? parsed.roles : {};
  const sources = Array.isArray(parsed.sources) ? parsed.sources : [];
  const roles: CanonDraftRole[] = [];

  for (const role of CANON_ROLES) {
    const payload = rolesObj[role] as RolePayload | undefined;
    const confidence =
      typeof payload?.confidence === "number" ? payload.confidence : null;

    if (Array.isArray(payload?.chain)) {
      const gate = validateCanon(payload.chain);
      if (!gate.ok) {
        roles.push({
          role,
          status: "skipped",
          chain: null,
          nullReason: null,
          confidence,
          issues: gate.issues,
        });
        continue;
      }
      roles.push({
        role,
        status: "valid",
        chain: payload.chain as CanonBlock[],
        nullReason: null,
        confidence,
      });
      continue;
    }

    const nullReason =
      typeof payload?.null_reason === "string" && payload.null_reason.trim()
        ? payload.null_reason
        : "리서치에서 해당 파트를 확정하지 못함";
    roles.push({
      role,
      status: "null",
      chain: null,
      nullReason,
      confidence,
    });
  }

  return {
    roles,
    sources,
    modelUsed,
    rawResponseHash: createHash("sha256").update(raw).digest("hex"),
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ── 오디오 랩 단일 톤 캐논 ─────────────────────────────
export interface SingleCanonDraftInput {
  artist: string;
  title: string;
  research: unknown;
  grounding: string;
  audioObservation?: AudioObservation;
}

export interface SingleCanonDraftResult {
  status: "valid" | "null" | "skipped";
  chain: CanonBlock[] | null;
  nullReason: string | null;
  confidence: number | null;
  issues?: GateIssue[];
  sources: unknown[];
  modelUsed: string;
  rawResponseHash: string;
}

export async function generateSingleCanonDraft(
  input: SingleCanonDraftInput,
  deps: CanonDraftDeps = {},
): Promise<SingleCanonDraftResult> {
  const llm = deps.llm ?? getLlmClient();
  const modelUsed = deps.model ?? process.env.LLM_MODEL ?? "gemini";
  const { system, user } = buildSingleToneCanonPrompt(input);
  const raw = await llm.chat(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { json: true, temperature: 0 },
  );
  const parsed = parseLlmJson(raw);
  const sources = Array.isArray(parsed.sources) ? parsed.sources : [];
  const confidence = typeof parsed.confidence === "number" ? parsed.confidence : null;
  const rawResponseHash = createHash("sha256").update(raw).digest("hex");

  if (Array.isArray(parsed.chain)) {
    const gate = validateCanon(parsed.chain);
    if (!gate.ok) {
      return {
        status: "skipped",
        chain: null,
        nullReason: null,
        confidence,
        issues: gate.issues,
        sources,
        modelUsed,
        rawResponseHash,
      };
    }
    return {
      status: "valid",
      chain: parsed.chain as CanonBlock[],
      nullReason: null,
      confidence,
      sources,
      modelUsed,
      rawResponseHash,
    };
  }

  const nullReason =
    typeof parsed.null_reason === "string" && parsed.null_reason.trim()
      ? parsed.null_reason
      : "리서치에서 해당 구간을 확정하지 못함";
  return {
    status: "null",
    chain: null,
    nullReason,
    confidence,
    sources,
    modelUsed,
    rawResponseHash,
  };
}
