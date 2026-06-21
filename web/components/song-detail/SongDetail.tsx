import Link from "next/link";
import type { Song } from "@/lib/types";
import { VariationTabs } from "./VariationTabs";
import styles from "./song-detail.module.css";

interface SongDetailProps {
  song: Song;
}

// 곡 상세 — 헤더(아티스트·제목·rig·confidence) + 변주 세로 나열.
export function SongDetail({ song }: SongDetailProps) {
  return (
    <main className={styles.detail}>
      <nav className={styles.backNav} aria-label="곡 목록으로">
        <Link className={styles.backLink} href="/">
          ← 곡 목록
        </Link>
      </nav>
      <header className={styles.songHead}>
        <p className={styles.artist}>{song.artist}</p>
        <h1 className={styles.title}>{song.title}</h1>
        <dl className={styles.meta}>
          <div className={styles.metaItem}>
            <dt>리그</dt>
            <dd className={styles.rig}>{song.rig}</dd>
          </div>
          {song.genre ? (
            <div className={styles.metaItem}>
              <dt>장르</dt>
              <dd>{song.genre}</dd>
            </div>
          ) : null}
        </dl>
        {song.confidence ? (
          <p className={styles.confidence}>
            <span className={styles.confidenceLabel}>신뢰도</span>{" "}
            {song.confidence}
          </p>
        ) : null}
      </header>

      <VariationTabs song={song} />
    </main>
  );
}
