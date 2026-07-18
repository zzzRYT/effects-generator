import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import styles from "@/components/admin/admin-login.module.css";

function safeNextPath(raw: string | undefined): string {
  const candidate = raw ?? "/lab/audio-tone";
  if (
    candidate === "/admin" ||
    candidate.startsWith("/admin/") ||
    candidate === "/lab" ||
    candidate.startsWith("/lab/")
  ) {
    return candidate;
  }
  return "/lab/audio-tone";
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const nextPath = safeNextPath((await searchParams).next);

  return (
    <main className={styles.shell}>
      <section className={styles.card} aria-labelledby="admin-login-title">
        <div className={styles.status} aria-hidden="true">
          ADMIN
        </div>
        <h1 id="admin-login-title" className={styles.title}>
          관리자 로그인
        </h1>
        <p className={styles.description}>
          오디오 톤 실험실은 승인된 관리자만 사용할 수 있어요.
        </p>
        <AdminLoginForm nextPath={nextPath} />
      </section>
    </main>
  );
}
