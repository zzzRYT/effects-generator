"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./admin-login.module.css";

export function AdminLoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (response.status === 204) {
        router.replace(nextPath);
        router.refresh();
        return;
      }

      const body = await response.json().catch(() => null);
      setError(body?.error ?? "로그인에 실패했어요");
    } catch {
      setError("네트워크 오류가 발생했어요");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={`tf-field`}>
        <label className={`tf-field__label ${styles.label}`} htmlFor="admin-password">
          관리자 비밀번호
        </label>
        <input
          id="admin-password"
          className={`tf-input ${styles.input}`}
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
          autoFocus
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "admin-login-error" : undefined}
        />
      </div>
      {error ? (
        <p id="admin-login-error" className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <button className={`tf-btn tf-btn--primary ${styles.submit}`} type="submit" disabled={submitting}>
        {submitting ? "확인 중…" : "실험실 들어가기"}
      </button>
    </form>
  );
}
