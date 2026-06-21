import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PATCHES } from "@/lib/patches.generated";
import { SongDetail } from "@/components/song-detail/SongDetail";

// 빌드 타임 정적 생성 — 모든 곡 slug 를 PATCHES 상수에서. 런타임 페치 0.
export function generateStaticParams() {
  return PATCHES.map((song) => ({ slug: song.slug }));
}

function findSong(slug: string) {
  return PATCHES.find((song) => song.slug === slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const song = findSong(slug);
  if (!song) return { title: "곡을 찾을 수 없음" };
  return {
    title: `${song.title} — ${song.artist}`,
    description: `${song.rig} 패치 · 변주 ${song.variations.length}개`,
  };
}

export default async function SongPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const song = findSong(slug);
  if (!song) notFound();
  return <SongDetail song={song} />;
}
