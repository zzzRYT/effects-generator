// 카탈로그 조회 — Supabase REST → 렌더러 입력. 서버 컴포넌트/라우트에서 사용.
// 권위: docs/trd/r4-web-rewire.md §2 데이터 흐름 E1~E3 (tones 기반).

import type { Song } from "@/lib/types";
import { sbSelect } from "@/lib/supabase/rest";
import { type DbSong } from "./adapt";
import { songSlug } from "./slugify";
import { normArtist, normTitle } from "./normalize";

/** tones 1행 이상 적재된 곡만 목록에 노출. 최신순. (E1) */
export async function listSongs(): Promise<Song[]> {
  // tones에서 distinct song_id로 조회
  try {
    const tonesDistinct = await sbSelect<{ song_id: string }>(
      "tones",
      "select=song_id&order=song_id.desc"
    );
    if (tonesDistinct.length === 0) return [];

    // song_id 중복 제거 + 최신 곡부터
    const songIds = [...new Set(tonesDistinct.map((t) => t.song_id))];

    // songs 테이블에서 해당 곡들만 조회
    // IN 연산자는 개별 쿼리가 필요 — 간단한 구현: 전체 조회 후 메모리 필터
    const allSongs = await sbSelect<DbSong>("songs", "select=*");
    const songs = allSongs.filter((s) => songIds.includes(s.id));

    // 각 곡마다 최신 tones 샘플 1개 조회해서 기본 정보 구성
    const out: Song[] = [];
    for (const song of songs) {
      try {
        // 이 곡의 tones 최신 1개 조회 (샘플용)
        const tones = await sbSelect<{ role: string }>(
          "tones",
          `select=role&song_id=eq.${song.id}&limit=1`
        );
        if (tones.length > 0) {
          // 곡 정보 구성 (variations는 빈 배열 또는 역할 표시)
          out.push({
            artist: song.artist,
            title: song.title,
            rig: "", // tones에서 수집 불가 — UI에서 보완
            slug: songSlug(song.artist, song.title),
            variations: [], // E1~E3는 목록만 — 상세 조회 시 role 5탭 구성
          });
        }
      } catch {
        // 개별 곡 조회 실패는 무시 — 다음 곡으로
      }
    }
    return out;
  } catch {
    // tones 조회 실패 — 빈 목록 반환
    return [];
  }
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

/** slug → 곡 상세(role 5탭 뷰모델). 없으면 null. slug 는 songSlug(artist,title) 매칭. */
export async function getSongBySlug(
  slug: string
): Promise<{
  song: { id: string; artist: string; title: string };
  tones: Array<{
    role: string;
    signalChain: unknown[] | null;
    nullReason: string | null;
    label: string | null;
  }>;
} | null> {
  const target = decodeSlugParam(slug);
  const songs = await sbSelect<DbSong>("songs", "select=*");
  const song = songs.find((s) => songSlug(s.artist, s.title) === target);
  if (!song) return null;

  // tones 조회: song_id 기준, role 5종 모두 (없는 것도 포함)
  try {
    const tonesRows = await sbSelect<{
      role: string;
      signal_chain: unknown[] | null;
      null_reason: string | null;
      label: string | null;
    }>(
      "tones",
      `select=role,signal_chain,null_reason,label&song_id=eq.${song.id}&order=role`
    );

    return {
      song: {
        id: song.id,
        artist: song.artist,
        title: song.title,
      },
      tones: tonesRows.map((t) => ({
        role: t.role,
        signalChain: t.signal_chain,
        nullReason: t.null_reason,
        label: t.label,
      })),
    };
  } catch {
    return null;
  }
}

/** 최근 생성 N곡(홈 미리보기). */
export async function getRecent(n = 6): Promise<Song[]> {
  return (await listSongs()).slice(0, n);
}

/** approved 기타 목록 (GenerateForm 드롭다운용). */
export async function getApprovedGuitars(): Promise<
  Array<{ id: string; slug: string; brand: string; model: string }>
> {
  try {
    const guitars = await sbSelect<{
      id: string;
      slug: string;
      brand: string;
      model: string;
    }>("guitars", "select=id,slug,brand,model&status=eq.approved&order=brand,model");
    return guitars;
  } catch {
    return [];
  }
}

/** approved 멀티이펙터 목록 (GenerateForm 드롭다운용). */
export async function getApprovedProcessors(): Promise<
  Array<{ id: string; slug: string; brand: string; model: string }>
> {
  try {
    const processors = await sbSelect<{
      id: string;
      slug: string;
      brand: string;
      model: string;
    }>("processors", "select=id,slug,brand,model&status=eq.approved&order=brand,model");
    return processors;
  } catch {
    return [];
  }
}

/** 캐시 조회 — tones 히트면 그 곡의 slug 반환. */
export async function findCachedSlug(
  artist: string,
  title: string
): Promise<string | null> {
  const songs = await sbSelect<DbSong>(
    "songs",
    `select=*&artist_norm=eq.${encodeURIComponent(normArtist(artist))}&title_norm=eq.${encodeURIComponent(normTitle(title))}`
  );
  if (songs.length === 0) return null;
  const song = songs[0];

  try {
    const tones = await sbSelect<{ id: string }>(
      "tones",
      `select=id&song_id=eq.${song.id}&limit=1`
    );
    if (tones.length === 0) return null;
    return songSlug(song.artist, song.title);
  } catch {
    return null;
  }
}
