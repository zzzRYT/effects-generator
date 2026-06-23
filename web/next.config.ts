import type { NextConfig } from "next";

// 정적 export(SSG → out/). 앱은 서버 기능을 전혀 안 쓰므로(동적 라우트엔 generateStaticParams,
// cookies/headers/rewrites/redirects/ISR/server actions/next-image 없음) 순수 정적으로 구울 수 있다.
// 배포: Vercel Root Directory 를 web 으로 잡으면 빌드 파서(gen:patches)가 ../patches 를 못 읽으므로
// (Vercel 이 Root 밖 파일 접근을 막음), repo 루트의 vercel.json 이 `cd web && build` 후 web/out 을 정적 서빙한다.
const nextConfig: NextConfig = {
  output: "export",
};

export default nextConfig;
