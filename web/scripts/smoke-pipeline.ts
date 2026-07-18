// 파이프라인 라이브 스모크 — 신곡 1건으로 R1~R3 전체 사슬을 실제 환경(Gemini + Supabase)에서 돌린다.
// 실행: web/ 에서 `npx tsx --env-file=.env.local scripts/smoke-pipeline.ts [artist] [title]`
// 검증 항목: ① Resolver(기어 슬러그 해소) ② 리서치(song_research 캐시) ③ 3-role 캐논 생성+게이트
// ④ 투영(역인덱스 2단 룩업)+파생(real_amp/phone) ⑤ canonical_tones/tones 적재.
// 주의: Gemini 실호출(과금)·리모트 DB 쓰기가 있는 개발용 스크립트다 — CI 대상 아님.

import { resolveRequest } from "../lib/pipeline/resolver";
import { generateCanon } from "../lib/pipeline/generate";
import { projectSong } from "../lib/pipeline/projector";
import { sbSelect } from "../lib/supabase/rest";

const artist = process.argv[2] ?? "Radiohead";
const title = process.argv[3] ?? "Creep";

async function main() {
  console.log(`\n=== 스모크: "${title}" — ${artist} ===`);

  // ① Resolver — 자연스러운 사용자 입력 우선, 실패 시 표기 변형 폴백(슬러그 관측용).
  const guitar = "Cort G250";
  let processorInput = "Valeton GP-150";
  let resolved = await resolveRequest({ artist, title, guitar, processor: processorInput });
  if (!resolved.ok) {
    console.log(`① Resolver 미해소(${JSON.stringify(resolved.unresolved)}) — 표기 변형 재시도`);
    processorInput = "Valeton GP150";
    resolved = await resolveRequest({ artist, title, guitar, processor: processorInput });
  }
  if (!resolved.ok) {
    console.error("① Resolver 실패:", JSON.stringify(resolved.unresolved, null, 2));
    process.exit(1);
  }
  console.log(`① Resolver OK — song_id=${resolved.resolved.song.id ?? "(신곡)"}, guitar=${resolved.resolved.guitar.slug}(${resolved.resolved.guitar.body_archetype}), processor=${resolved.resolved.processor.slug} (입력: "${processorInput}")`);

  // ②③ 리서치 + 캐논 생성 (Gemini 실호출) — 캐논 캐시 히트면 생성 생략(헌법 "캐시-우선").
  let songId = resolved.resolved.song.id;
  const cachedCanon = songId
    ? await sbSelect<{ id: string }>("canonical_tones", `song_id=eq.${encodeURIComponent(songId)}&select=id`, true)
    : [];
  if (songId && cachedCanon.length > 0) {
    console.log(`②③ 캐논 캐시 HIT(${cachedCanon.length}행) — 생성 생략, 투영만 재실행`);
  } else {
    console.time("②③ 리서치+캐논 생성");
    const gen = await generateCanon({ artist, title, guitar, processor: processorInput }, resolved.resolved);
    console.timeEnd("②③ 리서치+캐논 생성");
    console.log(`   리서치 캐시: ${gen.researchCached ? "HIT" : "MISS(신규 생성)"}`);
    for (const r of gen.roles) {
      console.log(`   캐논 ${r.role}: ${r.status}${r.issues ? " — " + JSON.stringify(r.issues) : ""}`);
    }
    songId = gen.songId;
  }

  // ④ 투영.
  const proj = await projectSong({
    songId: songId!,
    bodyArchetype: resolved.resolved.guitar.body_archetype,
    processorId: resolved.resolved.processor.id,
  });
  for (const r of proj.roles) {
    console.log(`   투영 ${r.role}: ${r.status}${r.issues ? " — " + JSON.stringify(r.issues) : ""}`);
  }

  // ⑤ DB 적재 확인.
  const canon = await sbSelect<{ role: string; chain: unknown; null_reason: string | null; confidence: number | null }>(
    "canonical_tones",
    `song_id=eq.${encodeURIComponent(songId!)}&select=role,chain,null_reason,confidence`,
    true,
  );
  console.log(`⑤ canonical_tones: ${canon.length}행`);
  for (const c of canon) {
    const blocks = Array.isArray(c.chain) ? `${c.chain.length}블록` : `null(${c.null_reason})`;
    console.log(`   ${c.role}: ${blocks}, confidence=${c.confidence}`);
  }
  const tones = await sbSelect<{ role: string; signal_chain: unknown; label: string | null }>(
    "tones",
    `song_id=eq.${encodeURIComponent(songId!)}&select=role,signal_chain,label`,
  );
  console.log(`⑤ tones: ${tones.length}행`);
  for (const t of tones) {
    const blocks = Array.isArray(t.signal_chain) ? `${t.signal_chain.length}블록` : "null";
    console.log(`   ${t.role}: ${blocks}${t.label ? ` [${t.label}]` : ""}`);
  }

  // 캐논 lead 체인 미리보기(사람 눈 검증용).
  const lead = canon.find((c) => c.role === "lead");
  if (lead && Array.isArray(lead.chain)) {
    console.log("\n--- 캐논 lead 체인 ---");
    console.log(JSON.stringify(lead.chain, null, 2));
  }
  const leadTone = tones.find((t) => t.role === "lead");
  if (leadTone && Array.isArray(leadTone.signal_chain)) {
    console.log("\n--- 투영 lead signal_chain (model 매핑) ---");
    for (const b of leadTone.signal_chain as Array<{ type: string; model: string; base_gear?: string; enabled: boolean }>) {
      console.log(`   ${b.type}: ${b.model} (base: ${b.base_gear ?? "-"}) ${b.enabled ? "on" : "off"}`);
    }
  }
}

main().catch((e) => {
  console.error("스모크 실패:", e);
  process.exit(1);
});
