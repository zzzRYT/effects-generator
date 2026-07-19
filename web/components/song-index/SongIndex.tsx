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
// 권위: docs/trd/r4-web-rewire.md E1~E3 (tones 기반, E3 생성 유도 CTA).
export function SongIndex({ songs }: SongIndexProps) {
  // E3: 빈/희소 상태(곡 2개 미만) → 생성 유도 CTA.
  if (songs.length < 2) {
    return (
      <main className={styles.index}>
        <header className={styles.head}>
          <h1 className={styles.title}>GP-150 톤 라이브러리</h1>
          <p className={styles.sub}>아직 생성된 톤이 없습니다.</p>
        </header>
        <div className={styles.emptyState}>
          <p className={styles.emptyMessage}>
            첫 번째 톤을 생성해서 라이브러리를 채워보세요!
          </p>
          <Link href="/" className={styles.ctaButton}>
            톤 생성 시작
          </Link>
          {songs.length > 0 && (
            <ul id={SONG_LIST_ID} className={styles.list}>
              {songs.map((song) => (
                <SongRow key={`${song.rig}/${song.slug}`} song={song} />
              ))}
            </ul>
          )}
        </div>
      </main>
    );
  }

  // tones 기반 목록은 rig 가 빈 문자열일 수 있다(R4 listSongs) — 빈 이름 칩은 접근명 없는
  // 버튼(axe button-name 위반)이 되므로 제외. rig 가 하나도 없으면 '전체' 칩만 남는다.
  const rigs = [...new Set(songs.map((s) => s.rig))].filter(Boolean);
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
