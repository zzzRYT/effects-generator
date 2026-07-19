import { Suspense } from "react";
import type { Song } from "@/lib/types";
import { panelId, tabId } from "@/lib/variationTab";
import { VariationPanel } from "./VariationPanel";
import { VariationTabsClient } from "./VariationTabsClient";
import styles from "./variation-tabs.module.css";

interface VariationTabsProps {
  song: Song;
}

// 변주 비교 — 탭바 + 모든 패널(정적). 서버가 전부 visible 로 그려 no-JS=전부 접근(AC5).
// JS 아일랜드가 한 번에 하나만 보이게 강화. 변주 1개면 탭바·아일랜드 없이 패널만(AC8).
export function VariationTabs({ song }: VariationTabsProps) {
  const variations = song.variations;

  if (variations.length <= 1) {
    const only = variations[0];
    return only ? <VariationPanel variation={only} index={0} /> : null;
  }

  // (rig, slug) 는 페이지당 유일 → 컨테이너 id 충돌 없음(아일랜드가 getElementById 로 스코프).
  const containerId = `vtabs-${song.slug}`;

  return (
    <div id={containerId} className={styles.tabs}>
      <div role="tablist" aria-label="변주 선택" className={styles.tablist}>
        {variations.map((v, i) => (
          // 탭을 <button> 이 아니라 <a role="tab" href="#panel"> 로 쓰는 이유(점진적 향상):
          //  - no-JS 에서 href 가 패널로 스크롤 점프(패널은 전부 visible). button 은 JS 없으면 무동작.
          //  - role="tab" 이 네이티브 링크 의미를 덮어써 AT 가 "tab" 으로 안내(ARIA 1.2 유효).
          //  - 서버는 roving tabindex 미설정 → 모든 탭 포커스 가능(no-JS 키보드). 아일랜드가 roving 부여.
          <a
            key={tabId(i)}
            id={tabId(i)}
            role="tab"
            href={`#${panelId(i)}`}
            aria-controls={panelId(i)}
            aria-selected={i === 0}
            data-active={i === 0 ? "true" : "false"}
            className={`tf-btn tf-btn--ghost ${styles.tab}`}
          >
            {v.label}
          </a>
        ))}
      </div>

      <div className={styles.panels}>
        {variations.map((v, i) => (
          <VariationPanel key={`vpanel-${i}`} variation={v} index={i} tabbed />
        ))}
      </div>

      <Suspense fallback={null}>
        <VariationTabsClient
          containerId={containerId}
          count={variations.length}
        />
      </Suspense>
    </div>
  );
}
