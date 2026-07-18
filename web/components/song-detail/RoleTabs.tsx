"use client";

import { useState } from "react";
import type { Block } from "@/lib/types";
import type { ToneRole } from "@/lib/pipeline/types";
import { SignalChain } from "@/components/signal-chain/SignalChain";
import styles from "./role-tabs.module.css";

// role 탭 데이터 (DB tones 행).
export interface RoleTabData {
  role: ToneRole;
  signalChain: Block[] | null;
  nullReason: string | null;
  label: string | null;
}

interface RoleTabsProps {
  songArtist?: string; // 미래 사용(예: 소셜 공유)
  songTitle?: string; // 미래 사용(예: 소셜 공유)
  roles: RoleTabData[];
}

// role 상태 판정: rendered | null | missing.
export function roleStatus(data: RoleTabData): "rendered" | "null" | "missing" {
  if (data.signalChain) return "rendered";
  if (data.signalChain === null && data.nullReason) return "null";
  return "missing";
}

// 항상 5탭(D1) — tones 행이 없는 role 은 missing 엔트리로 합성(D4). 순수 함수(테스트 대상).
export const ROLE_TAB_ORDER: ToneRole[] = ["lead", "backing", "solo", "real_amp", "phone"];
export function buildRoleTabs(roles: RoleTabData[]): RoleTabData[] {
  return ROLE_TAB_ORDER.map(
    (r) => roles.find((x) => x.role === r) ?? { role: r, signalChain: null, nullReason: null, label: null },
  );
}

/**
 * role 5탭 뷰 — lead/backing/solo/real_amp/phone.
 * - rendered: signal_chain → SignalChain 렌더러
 * - null: null_reason 문구 표시
 * - missing: "이 기기로 낼 수 없음" + 기어 추가 요청 링크
 * 권위: docs/trd/r4-web-rewire.md D1~D6.
 */
export function RoleTabs({ roles }: RoleTabsProps) {
  const sortedRoles = buildRoleTabs(roles);

  const [activeRole, setActiveRole] = useState<ToneRole>(sortedRoles[0]?.role ?? "lead");
  const activeData = sortedRoles.find((r) => r.role === activeRole);

  if (!activeData) {
    return <div className={styles.empty}>톤 데이터를 찾을 수 없습니다</div>;
  }

  const status = roleStatus(activeData);

  return (
    <div className={styles.roleTabsContainer}>
      {/* role 탭 목록 — 시맨틱 탭(aria-label) + 키보드 접근 (D6). */}
      <div role="tablist" aria-label="톤 역할" className={styles.tabList}>
        {sortedRoles.map((role) => (
          <button
            key={role.role}
            role="tab"
            aria-selected={activeRole === role.role}
            aria-controls={`tab-panel-${role.role}`}
            className={`${styles.tabButton} ${activeRole === role.role ? styles.active : ""}`}
            onClick={() => setActiveRole(role.role)}
          >
            {roleLabel(role.role)}
          </button>
        ))}
      </div>

      {/* role 패널 */}
      <div
        id={`tab-panel-${activeRole}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeRole}`}
        className={styles.tabPanel}
      >
        {status === "rendered" && activeData.signalChain ? (
          // D2: signal_chain 있음 → 기존 SignalChain 렌더러 무수정 마운트.
          <div className={styles.signalChainWrapper}>
            {activeData.label ? (
              // D5: real_amp/phone 파생 소스 표기(label 예: "real_amp 파생(lead)").
              <p className={styles.derivedNote}>{activeData.label}</p>
            ) : null}
            <SignalChain blocks={activeData.signalChain} />
          </div>
        ) : status === "null" ? (
          // D3: signal_chain null → null_reason 표시.
          <div className={styles.statusBox}>
            <p className={styles.statusMessage}>{activeData.nullReason || "정보 없음"}</p>
          </div>
        ) : (
          // D4: missing → "이 기기로 낼 수 없음" + 기어 요청 링크.
          <div className={styles.statusBox}>
            <p className={styles.statusMessage}>이 기기로 낼 수 없습니다</p>
            <p className={styles.statusHint}>
              기타나 멀티이펙터를 추가하면 더 많은 톤을 생성할 수 있습니다.{" "}
              <a href="/request?type=gear-add" className={styles.requestLink}>
                기어 추가 요청
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/** role 탭 라벨 — 탭 이름은 항상 고정 한국어. 파생 소스(label)는 패널 안에서 표기(D5). */
function roleLabel(role: ToneRole): string {
  const labels: Record<ToneRole, string> = {
    lead: "리드",
    backing: "백킹",
    solo: "솔로",
    real_amp: "실앰프",
    phone: "헤드폰",
  };
  return labels[role];
}
