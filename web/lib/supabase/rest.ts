// Supabase PostgREST 얇은 fetch 래퍼. @supabase/supabase-js 미도입(폴링 v1 — 번들 절감).
// 읽기 = anon 키(서버/클라 공용, RLS 공개읽기). 쓰기/관리 = service 키(서버 라우트 전용, 절대 클라 노출 금지).

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export interface SbOptions {
  /** true 면 service_role 키 사용(서버 전용). 기본 anon. */
  admin?: boolean;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
}

function keyFor(admin: boolean): string {
  const key = admin ? SERVICE_KEY : ANON_KEY;
  if (!SUPABASE_URL) throw new Error("NEXT_PUBLIC_SUPABASE_URL 미설정");
  if (!key) {
    throw new Error(
      admin ? "SUPABASE_SERVICE_ROLE_KEY 미설정" : "NEXT_PUBLIC_SUPABASE_ANON_KEY 미설정",
    );
  }
  return key;
}

/** PostgREST 경로(예: "patches?select=*") 호출. 실패 시 상태+본문으로 throw. */
export async function sbFetch(path: string, opts: SbOptions = {}): Promise<Response> {
  const key = keyFor(opts.admin ?? false);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: opts.method ?? "GET",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...opts.headers,
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    // 동적 카탈로그 — 항상 최신(새 패치 즉시 반영). 후일 ISR revalidate 로 조정 가능.
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase ${res.status} ${path}: ${text}`);
  }
  return res;
}

/** SELECT 헬퍼. table + PostgREST 쿼리스트링 → 행 배열. */
export async function sbSelect<T>(table: string, query = "", admin = false): Promise<T[]> {
  const res = await sbFetch(`${table}${query ? `?${query}` : ""}`, { admin });
  return (await res.json()) as T[];
}

/** RPC 호출(예: save_generated_patch). 서버 전용(admin) 권장. */
export async function sbRpc<T>(fn: string, args: Record<string, unknown>, admin = true): Promise<T> {
  const res = await sbFetch(`rpc/${fn}`, {
    admin,
    method: "POST",
    body: args,
    headers: { Prefer: "return=representation" },
  });
  return (await res.json()) as T;
}
