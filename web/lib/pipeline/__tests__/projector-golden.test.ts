import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { buildReverseIndex, projectChain } from "../projector";
import { extractCatalogEntries } from "../../parser/catalog";
import { PATCHES } from "../../patches.generated";
import type { CanonBlock } from "../types";

// 라운드트립 골든 게이트(설계 §6 R3) — 기존 패치(사람이 검증한 실기→모델 매핑)를 캐논으로 역변환해
// 실제 md 카탈로그 역인덱스로 재투영하면 원본 model 이 그대로 복원되어야 한다.
// 이 테스트가 잡는 것: (a) 매칭 알고리즘 회귀(복원 실패 = mismatch), (b) md 카탈로그↔패치 간 어휘 드리프트.
// 단위는 블록 — 변주 24개 전부에 base_gear 없는 블록(기기 고유 Gate/EQ/User IR 등)이 섞여 있어
// 체인 단위 전수 라운드트립은 불가능하다(2026-07-07 실측 0/24).

const ROOT = join(process.cwd(), "../models/processors/valeton-gp150");

const entries = [
  ...extractCatalogEntries(readFileSync(join(ROOT, "amps.md"), "utf8"), "amp"),
  ...extractCatalogEntries(readFileSync(join(ROOT, "cabs.md"), "utf8"), "cab"),
  ...extractCatalogEntries(readFileSync(join(ROOT, "effects.md"), "utf8"), "effect"),
];
const index = buildReverseIndex(entries);

// 매핑 불가가 확인된 base_gear(2026-07-07 전수 실측, 91블록 중 84 매핑·7블록/6종 미매핑).
// 사유가 사라지면(md 에 (기반:) 보강 등) 이 목록에서도 제거해야 통과한다 —
// 관측 집합과 "정확히 일치"를 요구해 죽은 예외가 남지 않게 한다.
const EXPECTED_UNMAPPED = new Set([
  "클래식 슬랩백", // Slapback — md 에 (기반:) 없음(오리지널/범용 모델), 패치가 서술형 이름을 씀
  "Boss DD-3", // Digital Delay S — md 에 (기반:) 없음(범용 디지털 딜레이)
  "Line 6 DL4", // Digital Delay S — 상동
  "GP-150 5-band", // Guitar EQ 1 — 기기 내장 EQ, (기반:) 없음
  "Marshall 1959 Super Lead Plexi", // md 는 "Marshall 1959HW Super Lead Plexi" — 중간 토큰(1959↔1959HW) 차라 경계 매칭 불가
  "Marshall 4x12 빈티지", // UK Vintage — md (기반:) 표기와 서술형 이름이 달라 매칭 불가
]);

describe("라운드트립 골든 — PATCHES 전수 블록 역투영", () => {
  test("md 카탈로그가 실제로 로드된다(빈 파일이면 여기서 크게 실패)", () => {
    expect(entries.length).toBeGreaterThan(100);
  });

  test("base_gear 있는 모든 블록: 복원 mismatch 0 + 미매핑은 예외 목록과 정확히 일치", () => {
    const mismatches: string[] = [];
    const unmapped = new Set<string>();
    let ok = 0;
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

          const result = projectChain(canon, index);
          if (!result.ok) {
            unmapped.add(block.base_gear);
            continue;
          }
          const restored = result.chain![0]!;
          if (restored.model !== block.model) {
            mismatches.push(
              `${song.slug} ${block.type}: 원본 "${block.model}" → 복원 "${restored.model}" (base_gear: ${block.base_gear})`,
            );
            continue;
          }
          ok++;
        }
      }
    }

    expect(mismatches).toEqual([]); // 복원 정확성 — 골든의 핵심(매핑됐다면 반드시 원본 모델)
    expect([...unmapped].sort()).toEqual([...EXPECTED_UNMAPPED].sort()); // 예외는 정확히 이 목록만
    expect(ok).toBeGreaterThanOrEqual(80); // 커버리지 바닥선(실측 84/91) — md·패치 대량 드리프트 감지
    expect(total).toBeGreaterThanOrEqual(90);
  });
});
