import { PATCHES } from "@/lib/patches.generated";
import { SongIndex } from "@/components/song-index/SongIndex";

// 홈 = 곡 목록 진입점(사이클 #3 song-index). 정적 목록 + 클라이언트 필터(검색·rig 칩).
export default function Home() {
  return <SongIndex songs={PATCHES} />;
}
