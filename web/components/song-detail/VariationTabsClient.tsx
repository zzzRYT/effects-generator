"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { resolveActiveIndex } from "@/lib/variationTab";

interface VariationTabsClientProps {
  /** VariationTabs 컨테이너 id (정적 탭/패널을 찾는 앵커). */
  containerId: string;
  count: number;
}

// 동작 전용 아일랜드 — 렌더 결과 null(하이드레이션 불일치 0).
// 서버가 그린 정적 탭/패널을 강화: JS 표시, aria-selected/roving tabindex/data-active,
// 키보드(←/→/Home/End automatic activation), 탭 클릭 → ?v=N 동기화.
// useSearchParams 는 Suspense 경계로 격리되어 패널 정적 HTML 은 보존된다(AC10).
export function VariationTabsClient({
  containerId,
  count,
}: VariationTabsClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const active = resolveActiveIndex(searchParams.get("v"), count);

  // 1) mount: JS 표시 + 클릭/키보드 리스너 바인드. URL 만 갱신하고 상태는 ?v 에서 파생.
  useEffect(() => {
    const root = document.getElementById(containerId);
    if (!root) return;
    document.documentElement.classList.add("js");
    const tabs = Array.from(
      root.querySelectorAll<HTMLElement>('[role="tab"]'),
    );
    if (tabs.length === 0) return;

    const go = (index: number) => {
      const clamped = Math.max(0, Math.min(index, tabs.length - 1));
      tabs[clamped]?.focus();
      router.replace(`${pathname}?v=${clamped + 1}`, { scroll: false });
    };

    const cleanups = tabs.map((tab, i) => {
      const onClick = (e: MouseEvent) => {
        e.preventDefault();
        go(i);
      };
      const onKeyDown = (e: KeyboardEvent) => {
        let next: number | null = null;
        if (e.key === "ArrowRight" || e.key === "ArrowDown")
          next = (i + 1) % tabs.length;
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
          next = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === "Home") next = 0;
        else if (e.key === "End") next = tabs.length - 1;
        if (next === null) return;
        e.preventDefault();
        go(next);
      };
      tab.addEventListener("click", onClick);
      tab.addEventListener("keydown", onKeyDown);
      return () => {
        tab.removeEventListener("click", onClick);
        tab.removeEventListener("keydown", onKeyDown);
      };
    });
    return () => {
      cleanups.forEach((c) => c());
    };
    // count 는 deps 에 불필요: 변주 수는 빌드 상수(런타임 불변)이고, 곡이 바뀌면 slug→containerId 가
    // 바뀌어 이 effect 가 재실행돼 리스너를 새 탭에 다시 바인드한다.
  }, [containerId, pathname, router]);

  // 2) active 변경 시 정적 DOM 상태 반영(aria/roving/data-active). CSS 가 비활성 패널 숨김.
  useEffect(() => {
    const root = document.getElementById(containerId);
    if (!root) return;
    const tabs = root.querySelectorAll<HTMLElement>('[role="tab"]');
    const panels = root.querySelectorAll<HTMLElement>('[role="tabpanel"]');
    tabs.forEach((tab, i) => {
      const isActive = i === active;
      tab.setAttribute("aria-selected", String(isActive));
      tab.tabIndex = isActive ? 0 : -1;
      tab.dataset.active = String(isActive);
    });
    panels.forEach((panel, i) => {
      panel.dataset.active = String(i === active);
    });
  }, [containerId, active]);

  return null;
}
