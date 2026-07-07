// R0 씨앗 — 캐논·투영 부활 스키마(2026-07-06 설계 §6 R0)에 기존 자산을 적재한다.
// - processors: models/processors/valeton-gp150/*.md → effects_catalog(exact/prefixes)·amps·cabs·modules
// - guitars: models/guitars/*.md (둘 다 superstrat, HSS)
// - songs: web/lib/patches.generated.ts 8곡의 곡 정규화 레코드만 적재
//
// canonical_tones/tones는 여기서 씨앗하지 않는다. 기존 patches는 GP-150 전용 signal_chain(model 직접
// 기입)이라 캐논(base_gear 구조화 레코드, 기기무관) 형태가 아니고, 지금 역추출하면 검증 없는 캐논을
// 만들게 된다 — patches→캐논 역추출은 ToneProjector·검증 게이트가 준비된 뒤(R2~R3, 설계 §5 "라운드트립
// 게이트")에 별도로 다룰 마이그레이션 문제다. 지금 억지로 끼워 넣지 않는다.
//
// 실행: set -a; . web/.env.local; set +a; npx tsx web/scripts/seed-reset.ts
// (빈 새 테이블 가정 — 재실행 시 유니크 충돌로 실패하는 게 의도: 중복 씨앗 방지.)

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { extractCatalog, extractCatalogEntries } from "../lib/parser/catalog";
import { PATCHES } from "../lib/patches.generated";
import type { Song } from "../lib/types";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("환경변수 필요: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const ROOT = join(__dirname, "..", "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

// onConflict 를 주면 upsert(merge-duplicates) — 시드 재실행이 멱등이 되도록 전 테이블 공통 사용.
async function insert<T>(table: string, rows: unknown, onConflict?: string): Promise<T> {
  const path = onConflict ? `${table}?on_conflict=${encodeURIComponent(onConflict)}` : table;
  const prefer = onConflict ? "return=representation,resolution=merge-duplicates" : "return=representation";
  const res = await fetch(`${URL}/rest/v1/${path}`, {
    method: "POST",
    headers: {
      apikey: KEY!,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      Prefer: prefer,
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`${table} ${onConflict ? "upsert" : "insert"} 실패 ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as T[];
  return data as unknown as T;
}

// ── processors: GP-150 ──────────────────────────────
const GP150_DIR = "models/processors/valeton-gp150";
const effectsText = read(`${GP150_DIR}/effects.md`);
const ampsText = read(`${GP150_DIR}/amps.md`);
const cabsText = read(`${GP150_DIR}/cabs.md`);

const effects = extractCatalog([effectsText]);
const amps = extractCatalog([ampsText]);
const cabs = extractCatalog([cabsText]);

// base_gear 역인덱스 엔트리 추출 — R3 ToneProjector가 사용.
const effectsEntries = extractCatalogEntries(effectsText, "effect");
const ampsEntries = extractCatalogEntries(ampsText, "amp");
const cabsEntries = extractCatalogEntries(cabsText, "cab");
const catalogEntries = [...ampsEntries, ...cabsEntries, ...effectsEntries];

const GP150_MODULES = [
  { type: "NR", name: "Noise Gate" },
  { type: "PRE", name: "Pre-Effects", categories: ["COMP", "BOOST", "FILTER", "PITCH"] },
  { type: "WAH", name: "Wah" },
  { type: "DST", name: "Distortion", categories: ["OD", "DST", "FUZZ"] },
  { type: "NS", name: "SnapTone" },
  { type: "AMP", name: "Amp" },
  { type: "CAB", name: "Cab" },
  { type: "EQ", name: "EQ" },
  { type: "MOD", name: "Modulation" },
  { type: "DLY", name: "Delay" },
  { type: "RVB", name: "Reverb" },
  { type: "VOL", name: "Volume" },
] as const;

// ── guitars ─────────────────────────────────────────
const HSS_SELECTOR = [
  { position: 1, label: "브릿지 험버커" },
  { position: 2, label: "브릿지 + 미들" },
  { position: 3, label: "미들" },
  { position: 4, label: "미들 + 넥" },
  { position: 5, label: "넥" },
];
const HSS_PICKUPS = [
  { position: "neck", kind: "single" },
  { position: "middle", kind: "single" },
  { position: "bridge", kind: "humbucker" },
];

const GUITARS = [
  {
    slug: "cort-g250",
    brand: "Cort",
    model: "G250",
    body_archetype: "superstrat",
    pickups: HSS_PICKUPS,
    selector_positions: HSS_SELECTOR,
    controls: { volume: 1, tone: 1, coil_split: true, coil_split_note: "푸시-풀 톤 노브, 브릿지 험버커" },
    sources: [{ storage_path: "models/guitars/cort-g250.md", kind: "seed_md" }],
    confidence: 0.9,
    status: "approved",
  },
  {
    slug: "xt-450",
    brand: "Unknown",
    model: "XT-450",
    body_archetype: "superstrat",
    pickups: HSS_PICKUPS,
    selector_positions: HSS_SELECTOR,
    controls: { volume: 1, tone: 1, coil_split: false },
    sources: [{ storage_path: "models/guitars/xt-450.md", kind: "seed_md" }],
    confidence: 0.4, // 바디·스플릿 미확인
    status: "approved",
  },
];

// ── songs ────────────────────────────────────────────
const norm = (s: string) => s.toLowerCase().normalize("NFC").replace(/\s+/g, " ").trim();

async function main() {
  await insert(
    "processors",
    [
      {
        slug: "valeton-gp150",
        brand: "Valeton",
        model: "GP-150",
        modules: GP150_MODULES,
        effects_catalog: {
          exact: [...effects.exact],
          prefixes: effects.prefixes,
          entries: catalogEntries,
        },
        amps: [...amps.exact],
        cabs: { exact: [...cabs.exact], prefixes: cabs.prefixes },
        sources: [{ storage_path: GP150_DIR, kind: "seed_md" }],
        confidence: 0.95,
        status: "approved",
      },
    ],
    "slug",
  );
  console.log(`processors: valeton-gp150 (${effects.exact.size} FX, ${amps.exact.size} amps, ${catalogEntries.length} entries)`);

  await insert("guitars", GUITARS, "slug");
  console.log(`guitars: ${GUITARS.map((g) => g.slug).join(", ")}`);

  // PATCHES는 동일 곡을 rig별로 여러 번 담을 수 있다(예: YB-흰수염고래 2벌). songs는 곡 정규화
  // 레코드이므로 (artist_norm, title_norm) 기준으로 dedupe한다.
  const songMap = new Map<string, { artist: string; title: string; artist_norm: string; title_norm: string; genre: string | null }>();
  for (const song of PATCHES as readonly Song[]) {
    const artist_norm = norm(song.artist);
    const title_norm = norm(song.title);
    const key = `${artist_norm}|${title_norm}`;
    if (!songMap.has(key)) {
      songMap.set(key, { artist: song.artist, title: song.title, artist_norm, title_norm, genre: song.genre ?? null });
    }
  }
  const songs = [...songMap.values()];
  await insert("songs", songs, "artist_norm,title_norm");
  console.log(`songs: ${songs.length} (PATCHES ${PATCHES.length}건 → 곡 dedupe. canonical_tones/tones는 미적재 — 헤더 주석 참조)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
