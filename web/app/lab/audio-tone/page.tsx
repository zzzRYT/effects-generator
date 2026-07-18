import { redirect } from "next/navigation";
import { AudioToneLab } from "@/components/audio-lab/AudioToneLab";
import styles from "@/components/audio-lab/audio-tone-lab.module.css";
import { hasAdminSession } from "@/lib/admin/require-admin";
import { getApprovedGuitars, getApprovedProcessors } from "@/lib/data/catalog";

export const dynamic = "force-dynamic";

export default async function AudioToneLabPage() {
  if (!(await hasAdminSession())) redirect("/admin/login?next=/lab/audio-tone");
  const [guitars, processors] = await Promise.all([
    getApprovedGuitars(),
    getApprovedProcessors(),
  ]);
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>오디오 톤 A/B 실험실</h1>
        <p>YouTube 구간 관측이 GP-150 설정의 논리와 실사용성을 개선하는지 블라인드 비교합니다.</p>
      </header>
      <AudioToneLab guitars={guitars} processors={processors} />
    </main>
  );
}
