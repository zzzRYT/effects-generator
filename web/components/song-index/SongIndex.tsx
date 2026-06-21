import { Suspense } from "react";
import Link from "next/link";
import type { Song } from "@/lib/types";
import { SONG_COUNT_ID, SONG_EMPTY_ID, SONG_LIST_ID } from "@/lib/songFilter";
import { SongRow } from "./SongRow";
import { SongFilterClient } from "./SongFilterClient";
import { RequestLink } from "@/components/request-form/RequestLink";
import styles from "./song-index.module.css";

interface SongIndexProps {
  songs: readonly Song[];
}

// 곡 목록 진입점 — 서버가 모든 행을 정적으로 그려 no-JS=전부 표시(폴백). 필터 컨트롤은 아일랜드가
// JS 일 때만 렌더(Suspense 격리), 정적 리스트를 DOM 으로 필터. 리스트는 Suspense 밖 → SSG 유지.
export function SongIndex({ songs }: SongIndexProps) {
  const rigs = [...new Set(songs.map((s) => s.rig))];
  return (
    <main className={styles.index}>
      <header className={styles.head}>
        <h1 className={styles.title}>GP-150 톤 라이브러리</h1>
        <p className={styles.sub}>곡을 골라 시그널 체인을 봅니다.</p>
      </header>

      <Suspense fallback={null}>
        <SongFilterClient rigs={rigs} />
      </Suspense>

      <p id={SONG_COUNT_ID} className={styles.count} aria-live="polite">
        {songs.length}곡
      </p>

      <ul id={SONG_LIST_ID} className={styles.list}>
        {songs.map((song) => (
          <SongRow key={`${song.rig}/${song.slug}`} song={song} />
        ))}
      </ul>

      <p id={SONG_EMPTY_ID} className={styles.empty} hidden>
        검색 결과가 없습니다.{" "}
        <Link className={styles.resetLink} href="/">
          필터 초기화
        </Link>
        <span className={styles.emptyCta}>
          찾는 곡이 라이브러리에 없나요? <RequestLink>이 곡 제보하기 →</RequestLink>
        </span>
      </p>
    </main>
  );
}
