import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PATCHES } from "@/lib/patches.generated";
import { SongDetail } from "@/components/song-detail/SongDetail";

// 패치 정체성 = (rig, slug) 복합키. 같은 곡이 여러 rig 에 있을 수 있으므로
// 라우트도 /songs/<rig>/<song> 으로 키잉한다(파일시스템상 항상 유일).
type RouteParams = { rig: string; song: string };

export function generateStaticParams() {
  return PATCHES.map((song) => ({ rig: song.rig, song: song.slug }));
}

function findSong(rig: string, songSlug: string) {
  return PATCHES.find((s) => s.rig === rig && s.slug === songSlug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { rig, song: songSlug } = await params;
  const song = findSong(rig, songSlug);
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
  const { rig, song: songSlug } = await params;
  const song = findSong(rig, songSlug);
  if (!song) notFound();
  return <SongDetail song={song} />;
}
