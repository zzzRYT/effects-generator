// 캐시 키 정규화 — Supabase songs.artist_norm/title_norm 과 동일 규칙이어야 캐시 조회가 정확.
// 실DB introspect: artist_norm="oasis", title_norm="don't look back in anger" → lower(trim()).
// n8n save_generated_patch RPC 가 같은 규칙으로 norm 을 만든다(둘이 어긋나면 중복 판정 깨짐).

export function normArtist(s: string): string {
  return s.trim().toLowerCase();
}

export function normTitle(s: string): string {
  return s.trim().toLowerCase();
}
