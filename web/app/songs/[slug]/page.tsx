import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SongDetail } from "@/components/song-detail/SongDetail";
import { getSongBySlug } from "@/lib/data/catalog";

// 곡 상세 — slug(=songSlug(artist,title))로 Supabase 최신 패치 조회 → 기존 SongDetail 렌더러 재사용.
export const dynamic = "force-dynamic";

type RouteParams = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const song = await getSongBySlug(slug);
  if (!song) return { title: "곡을 찾을 수 없음" };
  return {
    title: `${song.title} — ${song.artist}`,
    description: `${song.rig} 패치 · 변주 ${song.variations.length}개`,
  };
}

export default async function SongPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { slug } = await params;
  const song = await getSongBySlug(slug);
  if (!song) notFound();
  return <SongDetail song={song} />;
}
