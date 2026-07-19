import type { Metadata } from "next";
import Link from "next/link";
import styles from "../request.module.css";

export const metadata: Metadata = {
  title: "제보 완료 — GP-150 톤 라이브러리",
};

// no-JS 네이티브 제출의 redirect 도착지(SITE_URL 설정 시). 직접 방문해도 무해한 정적 thank-you.
export default function RequestSentPage() {
  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>제보 고마워요</h1>
        <p className={styles.sub}>확인하고 곧 패치로 만들어 둘게요.</p>
      </header>
      <p className={styles.back}>
        <Link className={styles.backLink} href="/">
          ← 목록으로
        </Link>
      </p>
    </main>
  );
}
