import Link from "next/link";
import { GenerateForm } from "@/components/generate/GenerateForm";
import { SongRow } from "@/components/song-index/SongRow";
import { getRecent } from "@/lib/data/catalog";
import styles from "@/components/generate/generate.module.css";

// 홈 = 생성 폼 히어로(아티스트+곡 → Gen) + 최근 톤 미리보기. 전체 목록은 /tones.
export const dynamic = "force-dynamic";

export default async function Home() {
  const recent = await getRecent(6);
  return (
    <main className={styles.hero}>
      <section className={styles.heroHead}>
        <h1 className={styles.heroTitle}>곡 톤 생성기</h1>
        <p className={styles.heroSub}>
          아티스트와 곡을 입력하면 GP-150 멀티이펙터 패치를 만들어 드려요.
        </p>
      </section>

      <GenerateForm />

      {recent.length > 0 && (
        <section className={styles.recent}>
          <div className={styles.recentHead}>
            <h2 className={styles.recentTitle}>최근 톤</h2>
            <Link className={styles.recentMore} href="/tones">
              전체 보기 →
            </Link>
          </div>
          <ul className={styles.recentList}>
            {recent.map((s) => (
              <SongRow key={s.slug} song={s} />
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
