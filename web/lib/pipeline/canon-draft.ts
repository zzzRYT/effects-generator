import { getLlmClient, type LlmClient } from "../llm/client";
import { validateCanon, type GateIssue } from "./gate";
import { parseLlmJson } from "./json";
import { buildCanonPrompt } from "./prompts";
import type { AudioObservation } from "./audio-observations";
import type { CanonBlock } from "./types";

export const CANON_ROLES = ["lead", "backing", "solo"] as const;
export type CanonRole = (typeof CANON_ROLES)[number];

export interface CanonDraftInput {
  artist: string;
  title: string;
  research: unknown;
  grounding: string;
  audioObservations?: AudioObservation[];
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

  return { roles, sources, modelUsed };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
