import type { Metadata } from "next";
import { SongIndex } from "@/components/song-index/SongIndex";
import { listSongs } from "@/lib/data/catalog";

// 톤 리스트 — Supabase 런타임 조회(생성·축적분 즉시 반영). 검색/필터는 기존 SongIndex 재사용.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "톤 카탈로그 — GP-150",
  description: "생성·축적된 곡별 기타 톤 패치 목록.",
};

export default async function TonesPage() {
  const songs = await listSongs();
  return <SongIndex songs={songs} />;
}
