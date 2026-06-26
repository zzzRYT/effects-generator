// 카탈로그 조회 — Supabase REST → 렌더러 Song. 서버 컴포넌트/라우트에서 사용.
// 각 곡은 최신 version patch 1개로 대표(재생성 누적분 중 최신).

import type { Song } from "@/lib/types";
import { sbSelect } from "@/lib/supabase/rest";
import { adaptPatch, type DbPatch, type DbSong } from "./adapt";
import { songSlug } from "./slugify";
import { normArtist, normTitle } from "./normalize";

// 곡별 최신 version patch 만 남긴다(version desc 정렬된 목록에서 첫 등장).
function latestPerSong(patches: DbPatch[]): Map<string, DbPatch> {
  const latest = new Map<string, DbPatch>();
  for (const p of patches) if (!latest.has(p.song_id)) latest.set(p.song_id, p);
  return latest;
}

/** 전체 곡 목록(각 곡 최신 패치). 리스트/홈 미리보기용. */
export async function listSongs(): Promise<Song[]> {
  const songs = await sbSelect<DbSong>("songs", "select=*&order=created_at.desc");
  if (songs.length === 0) return [];
  const ids = songs.map((s) => s.id).join(",");
  const patches = await sbSelect<DbPatch>(
    "patches",
    `select=*&status=eq.ready&song_id=in.(${ids})&order=version.desc`,
  );
  const latest = latestPerSong(patches);
  const out: Song[] = [];
  for (const s of songs) {
    const p = latest.get(s.id);
    if (p) out.push(adaptPatch(s, p));
  }
  return out;
}

// URL 라우트 param 은 퍼센트 인코딩/유니코드 분해형(NFD)일 수 있어 디코드+NFC 정규화 후 비교.
function decodeSlugParam(raw: string): string {
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // 잘못된 % 시퀀스 — 원문 사용
  }
  return decoded.normalize("NFC");
}

/** slug → 곡 상세(최신 패치). 없으면 null. slug 는 songSlug(artist,title) 매칭. */
export async function getSongBySlug(slug: string): Promise<Song | null> {
  const target = decodeSlugParam(slug);
  const songs = await sbSelect<DbSong>("songs", "select=*");
  const song = songs.find((s) => songSlug(s.artist, s.title) === target);
  if (!song) return null;
  const patches = await sbSelect<DbPatch>(
    "patches",
    `select=*&status=eq.ready&song_id=eq.${song.id}&order=version.desc&limit=1`,
  );
  if (patches.length === 0) return null;
  return adaptPatch(song, patches[0]);
}

/** 최근 생성 N곡(홈 미리보기). */
export async function getRecent(n = 6): Promise<Song[]> {
  return (await listSongs()).slice(0, n);
}

/** 캐시 조회 — (artist_norm, title_norm, processor) 히트면 그 곡의 slug 반환(생성 폼 캐시-우선). */
export async function findCachedSlug(
  artist: string,
  title: string,
): Promise<string | null> {
  const songs = await sbSelect<DbSong>(
    "songs",
    `select=*&artist_norm=eq.${encodeURIComponent(normArtist(artist))}&title_norm=eq.${encodeURIComponent(normTitle(title))}`,
  );
  if (songs.length === 0) return null;
  const song = songs[0];
  const patches = await sbSelect<DbPatch>(
    "patches",
    `select=id&status=eq.ready&song_id=eq.${song.id}&limit=1`,
  );
  if (patches.length === 0) return null;
  return songSlug(song.artist, song.title);
}
