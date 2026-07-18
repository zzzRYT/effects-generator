import Link from "next/link";
import type { Block, Song } from "@/lib/types";
import type { ToneRole } from "@/lib/pipeline/types";
import { VariationTabs } from "./VariationTabs";
import { RoleTabs } from "./RoleTabs";
import type { RoleTabData } from "./RoleTabs";
import styles from "./song-detail.module.css";

interface TonesSongDetail {
  song: { id: string; artist: string; title: string };
  tones: Array<{
    role: string;
    signalChain: unknown[] | null;
    nullReason: string | null;
    label: string | null;
  }>;
}

interface SongDetailProps {
  song: Song | TonesSongDetail;
}

// 곡 상세 — 기존 변주 또는 신 role 5탭.
// 권위: docs/trd/r4-web-rewire.md D1~D6 (Phase 4).
export function SongDetail({ song: songProp }: SongDetailProps) {
  // 타입 판정: variations이 있으면 기존 Song, 아니면 신 tones 구조
  const isLegacy = "variations" in songProp;

  if (!isLegacy) {
    // 신 tones 구조 → role 5탭 (D1~D6).
    const data = songProp as TonesSongDetail;
    const roles: RoleTabData[] = data.tones.map((t) => ({
      role: t.role as ToneRole,
      signalChain: (t.signalChain as Block[] | null),
      nullReason: t.nullReason,
      label: t.label,
    }));

    return (
      <main className={styles.detail}>
        <nav className={styles.backNav} aria-label="곡 목록으로">
          <Link className={styles.backLink} href="/">
            ← 곡 목록
          </Link>
        </nav>
        <header className={styles.songHead}>
          <p className={styles.artist}>{data.song.artist}</p>
          <h1 className={styles.title}>{data.song.title}</h1>
        </header>
        <RoleTabs roles={roles} />
      </main>
    );
  }

  const legacySong = songProp as Song;
  return (
    <main className={styles.detail}>
      <nav className={styles.backNav} aria-label="곡 목록으로">
        <Link className={styles.backLink} href="/">
          ← 곡 목록
        </Link>
      </nav>
      <header className={styles.songHead}>
        <p className={styles.artist}>{legacySong.artist}</p>
        <h1 className={styles.title}>{legacySong.title}</h1>
        <dl className={styles.meta}>
          <div className={styles.metaItem}>
            <dt>리그</dt>
            <dd className={styles.rig}>{legacySong.rig}</dd>
          </div>
          {legacySong.genre ? (
            <div className={styles.metaItem}>
              <dt>장르</dt>
              <dd>{legacySong.genre}</dd>
            </div>
          ) : null}
        </dl>
        {legacySong.confidence ? (
          <p className={styles.confidence}>
            <span className={styles.confidenceLabel}>신뢰도</span>{" "}
            {legacySong.confidence}
          </p>
        ) : null}
      </header>

      <VariationTabs song={legacySong} />
    </main>
  );
}
