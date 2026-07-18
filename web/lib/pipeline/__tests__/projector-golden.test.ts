import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { buildReverseIndex, projectChain } from "../projector";
import { extractCatalogEntries } from "../../parser/catalog";
import { PATCHES } from "../../patches.generated";
import type { CanonBlock } from "../types";

// 라운드트립 골든 게이트(설계 §6 R3) — 기존 패치(사람이 검증한 실기→모델 매핑)를 캐논으로 역변환해
// 실제 md 카탈로그 역인덱스로 재투영하면 원본 model 이 그대로 복원되어야 한다.
// 이 테스트가 잡는 것: (a) 매칭 알고리즘 회귀(복원 실패 = mismatch), (b) md 카탈로그↔패치 간 어휘 드리프트,
// (c) 기능 폴백 회귀(폴백 결과가 지정 디폴트와 다르면 실패).
// 단위는 블록 — 변주 24개 전부에 base_gear 없는 블록(기기 고유 Gate/EQ/User IR 등)이 섞여 있어
// 체인 단위 전수 라운드트립은 불가능하다(2026-07-07 실측 0/24).

const ROOT = join(process.cwd(), "../models/processors/valeton-gp150");

const entries = [
  ...extractCatalogEntries(readFileSync(join(ROOT, "amps.md"), "utf8"), "amp"),
  ...extractCatalogEntries(readFileSync(join(ROOT, "cabs.md"), "utf8"), "cab"),
  ...extractCatalogEntries(readFileSync(join(ROOT, "effects.md"), "utf8"), "effect"),
];
const index = buildReverseIndex(entries);

// 시드(scripts/seed-reset.ts effects_catalog.defaults)와 동일해야 하는 기능 모듈 디폴트.
const DEFAULTS = { NR: "Gate 1", EQ: "Guitar EQ 1", DLY: "Digital Delay S", RVB: "Room", VOL: "Volume" } as const;

// 매핑·폴백 모두 불가가 확인된 base_gear(2026-07-08 전수 실측: 91블록 = 84 정밀매핑 + 5 폴백 + 2 미매핑).
// 둘 다 톤 정체성 모듈(AMP/CAB) — 폴백 대상이 아니며, 어드민 온보딩 TODO 가 정답인 부류.
// 사유가 사라지면(md 보강 등) 목록에서도 제거해야 통과 — 관측 집합과 "정확히 일치"를 요구.
const EXPECTED_UNMAPPED = new Set([
  "Marshall 1959 Super Lead Plexi", // AMP — md 는 "Marshall 1959HW Super Lead Plexi", 1959↔1959HW 토큰 차라 3단 매칭도 불가
  "Marshall 4x12 빈티지", // CAB — 서술형 이름, md (기반:) 표기와 매칭 불가
]);

describe("라운드트립 골든 — PATCHES 전수 블록 역투영(3분류)", () => {
  test("md 카탈로그가 실제로 로드된다(빈 파일이면 여기서 크게 실패)", () => {
    expect(entries.length).toBeGreaterThan(100);
  });

  test("정밀매핑=원본 복원, 폴백=지정 디폴트, 미매핑=예외 목록과 정확히 일치", () => {
    const mismatches: string[] = [];
    const fallbackViolations: string[] = [];
    const unmapped = new Set<string>();
    let exactOk = 0;
    let fallbackOk = 0;
    let total = 0;

    for (const song of PATCHES) {
      for (const variation of song.variations) {
        for (const block of variation.signalChain) {
          if (typeof block.base_gear !== "string" || block.base_gear.length === 0) continue;
          total++;

          // signal_chain → 캐논 역변환: model 제거, base_gear 문자열 → BaseGearRef.
          const canon: CanonBlock[] = [
            {
              type: block.type,
              category: block.category,
              base_gear: { name: block.base_gear, category: block.category ?? block.type },
              knobs: block.knobs,
              enabled: block.enabled,
            },
          ];

          const result = projectChain(canon, index, DEFAULTS);
          if (!result.ok) {
            unmapped.add(block.base_gear);
            continue;
          }
          const restored = result.chain![0]!;

          if ((result.notes ?? "").includes("기능 폴백")) {
            // 폴백 분류 — 원본 model 과 다를 수 있음(예: 원본 "Slapback" → 디폴트 "Digital Delay S").
            // 검증 대상은 "지정 디폴트가 결정적으로 적용됐는가".
            const expected = DEFAULTS[block.type as keyof typeof DEFAULTS];
            if (restored.model !== expected) {
              fallbackViolations.push(`${song.slug} ${block.type}: 폴백 "${restored.model}" ≠ 디폴트 "${expected}"`);
            } else {
              fallbackOk++;
            }
            continue;
          }

          if (restored.model !== block.model) {
            mismatches.push(
              `${song.slug} ${block.type}: 원본 "${block.model}" → 복원 "${restored.model}" (base_gear: ${block.base_gear})`,
            );
            continue;
          }
          exactOk++;
        }
      }
    }

    expect(mismatches).toEqual([]); // 복원 정확성 — 골든의 핵심(매핑됐다면 반드시 원본 모델)
    expect(fallbackViolations).toEqual([]); // 폴백은 항상 지정 디폴트
    expect([...unmapped].sort()).toEqual([...EXPECTED_UNMAPPED].sort()); // 예외는 정확히 이 목록만
    expect(exactOk).toBeGreaterThanOrEqual(80); // 커버리지 바닥선(실측 84)
    expect(fallbackOk).toBeGreaterThanOrEqual(4); // 폴백 실측 5 — 대량 증가(정밀매핑 후퇴)도 이상 신호
    expect(fallbackOk).toBeLessThanOrEqual(10);
    expect(total).toBeGreaterThanOrEqual(90);
  });
});
