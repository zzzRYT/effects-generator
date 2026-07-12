import type { CatalogEntry } from "../parser/catalog";
import type { Block } from "../types";
import { validateProjection, type GateIssue } from "./gate";
import { CANON_ROLES, type CanonRole } from "./canon-draft";
import type { CanonBlock } from "./types";
import {
  buildReverseIndex,
  deriveOutputTarget,
  projectChain,
} from "./projector";

export type ProjectedRole = CanonRole | "real_amp" | "phone";

export interface CanonProjectionInput {
  id?: string;
  role: CanonRole;
  chain: CanonBlock[] | null;
  nullReason?: string | null;
  status?: "valid" | "null" | "skipped";
  issues?: GateIssue[];
}

export interface EffectsCatalog {
  entries: CatalogEntry[];
  defaults?: Record<string, string>;
}

export interface ProjectDraftRole {
  role: ProjectedRole;
  status: "projected" | "null" | "skipped";
  chain: Block[] | null;
  nullReason: string | null;
  canonicalId?: string;
  sourceRole?: CanonRole;
  issues?: GateIssue[];
}

export interface ProjectDraftResult {
  roles: ProjectDraftRole[];
}

export function projectCanonDraft(
  canonicalRoles: CanonProjectionInput[],
  catalog: EffectsCatalog,
): ProjectDraftResult {
  const index = buildReverseIndex(catalog.entries);
  const modelCatalog = {
    exact: new Set(catalog.entries.map((entry) => entry.model)),
    prefixes: [] as string[],
  };
  const roles: ProjectDraftRole[] = [];

  for (const role of CANON_ROLES) {
    const source = canonicalRoles.find((candidate) => candidate.role === role);
    if (!source || source.status === "skipped") {
      roles.push({
        role,
        status: "skipped",
        chain: null,
        nullReason: null,
        ...(source?.issues ? { issues: source.issues } : {}),
      });
      continue;
    }
    if (!Array.isArray(source.chain)) {
      roles.push({
        role,
        status: "null",
        chain: null,
        nullReason: source.nullReason ?? "캐논에서 해당 파트 없음",
        ...(source.id ? { canonicalId: source.id } : {}),
      });
      continue;
    }

    const projected = projectChain(source.chain, index, catalog.defaults);
    if (!projected.ok) {
      roles.push({
        role,
        status: "skipped",
        chain: null,
        nullReason: null,
        issues:
          projected.unmapped?.map((item) => ({
            path: `chain[${item.blockIndex}].base_gear`,
            message: `실기 "${item.name}"(${item.category || "unknown"})를 카탈로그에서 찾을 수 없음`,
          })) ?? [],
      });
      continue;
    }

    const gate = validateProjection(projected.chain, modelCatalog);
    if (!gate.ok) {
      roles.push({
        role,
        status: "skipped",
        chain: null,
        nullReason: null,
        issues: gate.issues,
      });
      continue;
    }
    roles.push({
      role,
      status: "projected",
      chain: projected.chain ?? [],
      nullReason: null,
      ...(source.id ? { canonicalId: source.id } : {}),
    });
  }

  const representative = roles.find(
    (role): role is ProjectDraftRole & { role: CanonRole; chain: Block[] } =>
      CANON_ROLES.includes(role.role as CanonRole) &&
      role.status === "projected" &&
      Array.isArray(role.chain),
  );

  for (const target of ["real_amp", "phone"] as const) {
    if (!representative) {
      roles.push({
        role: target,
        status: "skipped",
        chain: null,
        nullReason: null,
        issues: [
          {
            path: "chain",
            message:
              "파생할 파트 톤 없음 — lead/backing/solo 모두 미매핑 또는 미생성",
          },
        ],
      });
      continue;
    }
    const chain = deriveOutputTarget(representative.chain, target);
    const gate = validateProjection(chain, modelCatalog);
    roles.push(
      gate.ok
        ? {
            role: target,
            status: "projected",
            chain,
            nullReason: null,
            sourceRole: representative.role,
            ...(representative.canonicalId
              ? { canonicalId: representative.canonicalId }
              : {}),
          }
        : {
            role: target,
            status: "skipped",
            chain: null,
            nullReason: null,
            issues: gate.issues,
          },
    );
  }

  return { roles };
}

// ── 오디오 랩 단일 톤 투영 ─────────────────────────────
// role/real_amp/phone 파생 없음 — 선택 구간 하나의 투영 성공/실패만 판정(설계 §5).
export interface SingleToneProjectionInput {
  chain: CanonBlock[] | null;
  nullReason?: string | null;
  status?: "valid" | "null" | "skipped";
  issues?: GateIssue[];
}

export interface ProjectSingleToneResult {
  status: "projected" | "null" | "skipped";
  chain: Block[] | null;
  nullReason: string | null;
  issues?: GateIssue[];
}

export function projectSingleTone(
  input: SingleToneProjectionInput,
  catalog: EffectsCatalog,
): ProjectSingleToneResult {
  if (input.status === "skipped") {
    return {
      status: "skipped",
      chain: null,
      nullReason: null,
      ...(input.issues ? { issues: input.issues } : {}),
    };
  }
  if (!Array.isArray(input.chain)) {
    return {
      status: "null",
      chain: null,
      nullReason: input.nullReason ?? "캐논에서 톤을 확정하지 못함",
    };
  }

  const index = buildReverseIndex(catalog.entries);
  const modelCatalog = {
    exact: new Set(catalog.entries.map((entry) => entry.model)),
    prefixes: [] as string[],
  };

  const projected = projectChain(input.chain, index, catalog.defaults);
  if (!projected.ok) {
    return {
      status: "skipped",
      chain: null,
      nullReason: null,
      issues:
        projected.unmapped?.map((item) => ({
          path: `chain[${item.blockIndex}].base_gear`,
          message: `실기 "${item.name}"(${item.category || "unknown"})를 카탈로그에서 찾을 수 없음`,
        })) ?? [],
    };
  }

  const gate = validateProjection(projected.chain, modelCatalog);
  if (!gate.ok) {
    return { status: "skipped", chain: null, nullReason: null, issues: gate.issues };
  }
  return { status: "projected", chain: projected.chain ?? [], nullReason: null };
}
