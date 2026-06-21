"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  matchesRow,
  parseFilters,
  SONG_COUNT_ID,
  SONG_EMPTY_ID,
  SONG_LIST_ID,
} from "@/lib/songFilter";
import styles from "./song-index.module.css";

interface SongFilterClientProps {
  rigs: string[];
}

// 하이드레이션 게이트 — 서버 prerender 와 클라 첫 렌더는 false(=빈 필터), 그 뒤 true.
// setState/effect 없이 하이드레이션 안전: 정적 HTML(빈 필터)과 첫 렌더가 일치하므로
// ?rig= 딥링크에서도 불일치가 없다. 마운트 후에만 URL 파생 필터를 적용.
const emptySubscribe = () => () => {};
function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

// 필터 상태(q·rig)를 URL 로. 빈 파라미터는 생략해 깔끔하게(`/`, `/?q=oasis`, `/?q=…&rig=…`).
function buildFilterUrl(pathname: string, q: string, rig: string): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (rig) params.set("rig", rig);
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

// 필터 컨트롤 — 검색창 + rig 칩. CSS 가 no-JS(html.js 없음)일 때 숨김 → no-JS=전체 목록 폴백.
// 상태는 URL(?q/?rig)이 단일 출처. 정적 리스트 행을 matchesRow 로 hidden 토글하고 count/빈상태 갱신.
export function SongFilterClient({ rigs }: SongFilterClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const hydrated = useHydrated();

  // 하이드레이션 전엔 빈 필터(서버와 동일) → 이후 URL 파생.
  const { q, rig } = hydrated
    ? parseFilters(searchParams)
    : { q: "", rig: "" };
  const rawQ = hydrated ? (searchParams.get("q") ?? "") : "";

  // 입력값 동기화 + 정적 리스트 필터(전부 DOM 변경 — setState 없음).
  // cleanup 없음(의도적): 형제 정적 리스트만 변경하고 구독/타이머 없음, 아일랜드는 언마운트되지 않으며
  // 리스트는 빌드 상수라 세션 중 불변. 행이 동적으로 바뀌는 구조가 되면 그때 cleanup 검토.
  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== rawQ) {
      inputRef.current.value = rawQ;
    }
    const list = document.getElementById(SONG_LIST_ID);
    if (!list) return;
    const countEl = document.getElementById(SONG_COUNT_ID);
    const emptyEl = document.getElementById(SONG_EMPTY_ID);
    const rows = list.querySelectorAll<HTMLElement>("[data-key]");
    let visible = 0;
    rows.forEach((row) => {
      const match = matchesRow(
        { search: row.dataset.search ?? "", rig: row.dataset.rig ?? "" },
        { q, rig },
      );
      row.hidden = !match;
      if (match) visible += 1;
    });
    if (countEl) countEl.textContent = `${visible}곡`;
    if (emptyEl) emptyEl.hidden = visible > 0;
  }, [q, rig, rawQ]);

  const onSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    router.replace(buildFilterUrl(pathname, e.target.value, rig), {
      scroll: false,
    });
  };
  const onRig = (next: string) => {
    // 현재 검색어는 라이브 입력값(비제어 input)에서 읽는다 — searchParams 는 router.replace 후
    // 비동기 갱신이라, 타이핑 직후 칩 클릭 시 stale q 로 검색어가 누락되는 레이스를 피한다.
    const currentQ = inputRef.current?.value ?? "";
    router.replace(buildFilterUrl(pathname, currentQ, next), { scroll: false });
  };

  return (
    <div className={styles.filterbar}>
      <input
        ref={inputRef}
        type="search"
        className={styles.search}
        placeholder="곡·아티스트·장르 검색"
        aria-label="곡 검색"
        onChange={onSearch}
      />
      <div className={styles.chips} role="group" aria-label="리그 필터">
        <button
          type="button"
          className={styles.chip}
          aria-pressed={rig === ""}
          data-active={rig === "" ? "true" : "false"}
          onClick={() => onRig("")}
        >
          전체
        </button>
        {rigs.map((r) => (
          <button
            key={r}
            type="button"
            className={styles.chip}
            aria-pressed={rig === r}
            data-active={rig === r ? "true" : "false"}
            onClick={() => onRig(r)}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}
