import type { GuitarSetting as GuitarSettingData } from "@/lib/types";
import styles from "./guitar-setting.module.css";

interface GuitarSettingProps {
  guitar?: GuitarSettingData;
}

// 기타 본체 세팅 박스 — signal_chain(GP-150) 과 별개. 톤의 출발점인 기타 컨트롤
// (셀렉터 위치/볼륨/톤/코일스플릿/메모)을 라벨-값으로. 없는 행은 숨긴다.
// coilSplit 은 걸렸을 때(true)만 표시(설계 §7). 표시할 게 없으면 null.
export function GuitarSetting({ guitar }: GuitarSettingProps) {
  if (!guitar) return null;
  const { selector, selectorLabel, volume, tone, coilSplit, note } = guitar;

  const hasSelector = selector !== undefined;
  const hasVolume = volume !== undefined;
  const hasTone = tone !== undefined;
  const hasSplit = coilSplit === true;
  const hasNote = typeof note === "string" && note.length > 0;

  if (!hasSelector && !hasVolume && !hasTone && !hasSplit && !hasNote) {
    return null;
  }

  return (
    <section className={styles.guitar} aria-label="기타 세팅">
      <h3 className={styles.heading}>기타 세팅</h3>
      <dl className={styles.list}>
        {hasSelector ? (
          <div className={styles.row}>
            <dt className={styles.key}>셀렉터</dt>
            <dd className={styles.val}>
              <span className={styles.pos}>{selector}</span>
              {selectorLabel ?? `위치 ${selector}`}
            </dd>
          </div>
        ) : null}
        {hasVolume ? (
          <div className={styles.row}>
            <dt className={styles.key}>볼륨</dt>
            <dd className={styles.val}>{volume}</dd>
          </div>
        ) : null}
        {hasTone ? (
          <div className={styles.row}>
            <dt className={styles.key}>톤</dt>
            <dd className={styles.val}>{tone}</dd>
          </div>
        ) : null}
        {hasSplit ? (
          <div className={styles.row}>
            <dt className={styles.key}>코일 스플릿</dt>
            <dd className={styles.val}>걸기</dd>
          </div>
        ) : null}
        {hasNote ? (
          <div className={styles.row}>
            <dt className={styles.key}>메모</dt>
            <dd className={styles.valNote}>{note}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
