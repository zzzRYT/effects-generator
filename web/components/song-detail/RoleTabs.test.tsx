import { describe, expect, test } from "vitest";
import { buildRoleTabs, roleStatus } from "./RoleTabs";
import type { RoleTabData } from "./RoleTabs";

// roleStatus·buildRoleTabs — 컴포넌트가 export 하는 실물을 직접 테스트(복사본 금지 — 드리프트 방지).

describe("roleStatus", () => {
  test("rendered: signal_chain 배열 있음 (D2)", () => {
    const data: RoleTabData = {
      role: "lead",
      signalChain: [{ type: "AMP", model: "UK 800", enabled: true, knobs: [] }],
      nullReason: null,
      label: null,
    };
    expect(roleStatus(data)).toBe("rendered");
  });

  test("null: signal_chain null + null_reason 있음 (D3)", () => {
    const data: RoleTabData = {
      role: "solo",
      signalChain: null,
      nullReason: "이 곡엔 이 파트 없음",
      label: null,
    };
    expect(roleStatus(data)).toBe("null");
  });

  test("missing: signal_chain null + null_reason 없음 (D4)", () => {
    const data: RoleTabData = {
      role: "real_amp",
      signalChain: null,
      nullReason: null,
      label: null,
    };
    expect(roleStatus(data)).toBe("missing");
  });

  test("파생 소스 label (D5)", () => {
    const data: RoleTabData = {
      role: "real_amp",
      signalChain: [{ type: "AMP", model: "UK 800", enabled: true, knobs: [] }],
      nullReason: null,
      label: "lead 파생",
    };
    expect(roleStatus(data)).toBe("rendered");
    // label은 UI에서 표시 (여기서는 status 판정만 확인)
  });

  test("empty signalChain 배열은 rendered로 취급", () => {
    const data: RoleTabData = {
      role: "backing",
      signalChain: [],
      nullReason: null,
      label: null,
    };
    expect(roleStatus(data)).toBe("rendered");
  });
});

describe("buildRoleTabs — 항상 5탭(D1) + 부재 role은 missing 합성(D4)", () => {
  test("tones 1행(solo)만 있어도 5탭이 순서대로 나온다 — 라이브 QA 회귀(Muse)", () => {
    const tabs = buildRoleTabs([
      { role: "solo", signalChain: null, nullReason: "솔로 없음", label: null },
    ]);
    expect(tabs.map((t) => t.role)).toEqual(["lead", "backing", "solo", "real_amp", "phone"]);
    expect(roleStatus(tabs[0]!)).toBe("missing"); // lead: 행 없음 → missing
    expect(roleStatus(tabs[2]!)).toBe("null"); // solo: null_reason 승계
  });

  test("5행 전부 있으면 그대로 순서 정렬", () => {
    const mk = (role: string) => ({ role: role as never, signalChain: [], nullReason: null, label: null });
    const tabs = buildRoleTabs([mk("phone"), mk("lead"), mk("solo"), mk("backing"), mk("real_amp")]);
    expect(tabs.map((t) => t.role)).toEqual(["lead", "backing", "solo", "real_amp", "phone"]);
  });
});
