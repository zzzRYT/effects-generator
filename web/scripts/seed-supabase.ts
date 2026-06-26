// 씨앗 임포트 — patches.generated.ts(빌드 파서 산출 8곡) → Supabase save_generated_patch RPC 1회 적재.
// 정적 라이브러리의 큐레이션 패치를 동적 카탈로그 초기 씨앗으로 옮긴다(피벗 설계 §6 "씨앗").
// 실행: set -a; . web/.env.local; set +a; npx tsx web/scripts/seed-supabase.ts
// (빈 DB 가정 — save_generated_patch 는 호출마다 version 누적. 재실행 전 테스트행 정리 필요.)

import { PATCHES } from "../lib/patches.generated";
import type { Song, Variation } from "../lib/types";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !KEY) {
  console.error("환경변수 필요: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (web/.env.local 소싱)");
  process.exit(1);
}

// rig 'g250-gp150' → processor 'gp150'.
function processorOf(rig: string): string {
  const parts = rig.split("-");
  return parts[parts.length - 1] || "gp150";
}

// 렌더러 Song.variations(camel) → DB 정규 shape(signal_chain snake, switching 문자열, selectorLabel 제거).
function toRawVariations(variations: readonly Variation[]) {
  return variations.map((v) => ({
    label: v.label,
    signal_chain: v.signalChain,
    guitar: v.guitar
      ? {
          selector: v.guitar.selector,
          volume: v.guitar.volume,
          tone: v.guitar.tone,
          coilSplit: v.guitar.coilSplit,
          note: v.guitar.note,
        }
      : undefined,
    switching: v.switching
      ? Object.fromEntries(
          (["A", "B"] as const)
            .filter((k) => v.switching?.[k])
            .map((k) => [k, v.switching![k]!.description]),
        )
      : undefined,
  }));
}

async function seedOne(song: Song): Promise<void> {
  const body = {
    p_artist: song.artist,
    p_title: song.title,
    p_processor: processorOf(song.rig),
    p_variations: toRawVariations(song.variations),
    p_confidence: song.confidence ?? null,
    p_genre: song.genre ?? null,
    p_model_used: "seed:md",
  };
  const res = await fetch(`${URL}/rest/v1/rpc/save_generated_patch`, {
    method: "POST",
    headers: {
      apikey: KEY!,
      Authorization: `Bearer ${KEY!}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${text}`);
  }
}

async function main() {
  console.log(`씨앗 ${PATCHES.length}곡 임포트 시작...`);
  let ok = 0;
  const failures: string[] = [];
  for (const song of PATCHES) {
    try {
      await seedOne(song);
      ok += 1;
      console.log(`  ✓ ${song.artist} — ${song.title} (${song.variations.length}변주)`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      failures.push(`${song.artist} — ${song.title}: ${msg}`);
      console.error(`  ✗ ${song.artist} — ${song.title}: ${msg}`);
    }
  }
  console.log(`\n완료: ${ok}/${PATCHES.length} 적재.`);
  if (failures.length) {
    console.error(`실패 ${failures.length}건:\n${failures.join("\n")}`);
    process.exit(1);
  }
}

main();
