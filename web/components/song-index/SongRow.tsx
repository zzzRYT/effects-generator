import Link from "next/link";
import type { Song } from "@/lib/types";
import styles from "./song-index.module.css";

interface SongRowProps {
  song: Song;
}

// 곡 목록 행 1개 — 정적 HTML. data-* 는 아일랜드가 필터에 쓰는 매칭 데이터(PATCHES 클라이언트 미전송).
// data-search 에 genre 까지 소문자로 녹여 검색 대상에 포함(genre 칩 대신 검색으로 커버).
export function SongRow({ song }: SongRowProps) {
  const search = `${song.artist} ${song.title} ${song.genre ?? ""}`.toLowerCase();
  // tones 기반 행은 rig=""·variations=[] 일 수 있다(R4 listSongs) — 빈 조각은 표기하지 않는다.
  const metaParts = [
    song.rig,
    song.variations.length > 0 ? `변주 ${song.variations.length}` : "",
  ].filter(Boolean);
  return (
    <li
      className={styles.row}
      data-key={`${song.rig}/${song.slug}`}
      data-search={search}
      data-rig={song.rig}
    >
      <Link
        className={`tf-panel ${styles.rowLink}`}
        href={`/songs/${song.slug}`}
      >
        <span className={styles.rowArtist}>{song.artist}</span>
        <span className={styles.rowTitle}>{song.title}</span>
        {metaParts.length > 0 && (
          <span className={styles.rowMeta}>{metaParts.join(" · ")}</span>
        )}
      </Link>
    </li>
  );
}
