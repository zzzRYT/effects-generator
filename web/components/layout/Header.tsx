import Link from "next/link";
import { RequestLink } from "@/components/request-form/RequestLink";
import styles from "./header.module.css";

// 상단 섀시 바 — 워드마크 + 내비 + 기기 배지 + 제보 진입점.
// Tone Forge DS `ui_kits/tone-forge-web/Header.jsx` 를 앱 라우팅에 맞춰 이식했다.
// 서버 컴포넌트: 현재 경로 하이라이트는 CSS `:has`/aria-current 없이도 되는
// 링크 스타일만 쓰고, 상태를 위해 클라이언트 번들을 늘리지 않는다.
export function Header() {
  return (
    <header className={styles.header}>
      <Link className={styles.brand} href="/" aria-label="Tone Forge 홈">
        <span className={styles.wordmark}>
          TONE<span className={styles.wordmarkAccent}> FORGE</span>
        </span>
        {/* 전원 LED — 유닛이 켜져 있다는 상시 신호(장식 아님: 상태 은유). */}
        <span className="tf-led tf-led--on" aria-hidden="true" />
        <span className={styles.tagline}>멀티 이펙터 톤 생성기</span>
      </Link>

      <nav className={styles.nav} aria-label="주요 메뉴">
        <Link className="tf-btn tf-btn--ghost tf-btn--sm" href="/">
          Generate
        </Link>
        <Link className="tf-btn tf-btn--ghost tf-btn--sm" href="/tones">
          Catalog
        </Link>
      </nav>

      <div className={styles.meta}>
        <span className="tf-badge tf-badge--accent">GP-150</span>
        <RequestLink unstyled className="tf-btn tf-btn--secondary tf-btn--sm">
          제보하기
        </RequestLink>
      </div>
    </header>
  );
}
