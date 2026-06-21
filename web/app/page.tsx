import Link from "next/link";
import { PATCHES } from "@/lib/patches.generated";
import styles from "./page.module.css";

// 임시 진입점 — 곡 목록/검색은 사이클 #3(song-index)에서 본격 구현. 지금은 링크만.
export default function Home() {
  return (
    <main className={styles.home}>
      <h1 className={styles.homeTitle}>GP-150 톤 라이브러리</h1>
      <p className={styles.homeSub}>곡을 골라 시그널 체인을 봅니다.</p>
      <ul className={styles.songList}>
        {PATCHES.map((song) => (
          <li key={song.slug}>
            <Link className={styles.songLink} href={`/songs/${song.slug}`}>
              <span className={styles.songArtist}>{song.artist}</span>
              <span className={styles.songName}>{song.title}</span>
              <span className={styles.songRig}>
                {song.rig} · 변주 {song.variations.length}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
