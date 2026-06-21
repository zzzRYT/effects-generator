import type { Metadata } from "next";
import Link from "next/link";
import { RequestForm } from "@/components/request-form/RequestForm";
import { WEB3FORMS_KEY } from "@/lib/requestEnv";
import styles from "./request.module.css";

export const metadata: Metadata = {
  title: "곡 제보 — GP-150 톤 라이브러리",
  description: "라이브러리에 없는 곡을 제보하세요.",
};

// 정적 제보 페이지 — JS 가 없을 때(또는 하이드레이션 전)의 폴백 진입점. 네이티브 <form> 으로 Web3Forms 직접 제출.
// JS 가 있으면 트리거가 dialog 를 열어 여기로 오지 않는다. SSG(런타임 서버·API 0).
export default function RequestPage() {
  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>곡 제보</h1>
        <p className={styles.sub}>
          듣고 싶은 곡을 알려주세요. 확인하고 패치로 만들어 둘게요.
        </p>
      </header>

      <RequestForm mode="native" accessKey={WEB3FORMS_KEY} />

      <p className={styles.back}>
        <Link className={styles.backLink} href="/">
          ← 목록으로
        </Link>
      </p>
    </main>
  );
}
