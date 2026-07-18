import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SongDetail } from "@/components/song-detail/SongDetail";
import { getSongBySlug } from "@/lib/data/catalog";

// 곡 상세 — slug(=songSlug(artist,title))로 tones 조회 → role 5탭 뷰.
// 권위: docs/trd/r4-web-rewire.md D1~D6 (Phase 4).
export const dynamic = "force-dynamic";

type RouteParams = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getSongBySlug(slug);
  if (!data) return { title: "곡을 찾을 수 없음" };
  const { song } = data;
  return {
    title: `${song.title} — ${song.artist}`,
    description: "톤 기어 설정",
  };
}

export default async function SongPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { slug } = await params;
  const data = await getSongBySlug(slug);
  if (!data) notFound();
  // Phase 4: SongDetail 컴포넌트 리뷰 후 role 5탭으로 재구성.
  return <SongDetail song={data} />;
}
