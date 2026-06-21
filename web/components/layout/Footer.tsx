import { RequestLink } from "@/components/request-form/RequestLink";
import styles from "./footer.module.css";

// 전역 푸터 — 어느 페이지에서나 제보 진입점. 트리거는 RequestLink(/request 강등 + dialog 강화).
export function Footer() {
  return (
    <footer className={styles.footer}>
      <p className={styles.note}>찾는 곡이 없나요?</p>
      <RequestLink className={styles.cta}>곡 제보하기</RequestLink>
    </footer>
  );
}
