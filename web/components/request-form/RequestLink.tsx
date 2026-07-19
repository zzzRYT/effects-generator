import styles from "./request-form.module.css";

// 제보 트리거 — 진짜 <a href="/request">(PE 이음새). no-JS 면 navigate, JS 면 RequestDialogClient 가 가로채 dialog.
// next/link 대신 plain <a>: 위임 핸들러가 capture 단계에서 navigate 를 선점하므로 클라 라우팅 충돌이 없고,
// 하이드레이션 전 클릭해도 최악의 경우 동작하는 /request 로 풀 네비게이트(graceful).
interface RequestLinkProps {
  className?: string;
  children?: React.ReactNode;
  /** true 면 기본 링크 스킨(.trigger)을 빼고 className 만 쓴다 — 헤더처럼 버튼으로 낼 때. */
  unstyled?: boolean;
}

export function RequestLink({ className, children, unstyled }: RequestLinkProps) {
  const cls = unstyled
    ? (className ?? "")
    : className
      ? `${styles.trigger} ${className}`
      : styles.trigger;
  return (
    <a href="/request" data-request-trigger="" className={cls}>
      {children ?? "곡 제보"}
    </a>
  );
}
