import type { NextConfig } from "next";

// 동적 카탈로그(피벗 Phase 3) — 런타임 Supabase 조회 + 생성 폼/라우트 핸들러를 쓰므로
// 정적 export(output:"export")를 제거했다. Vercel 동적(서버 컴포넌트 + 라우트 핸들러)으로 배포한다.
// 리스트/상세 라우트는 force-dynamic, env(NEXT_PUBLIC_SUPABASE_URL/ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)는
// Vercel 환경변수로 주입한다. (이전: 빌드타임 md → 정적 out/.)
const nextConfig: NextConfig = {};

export default nextConfig;
