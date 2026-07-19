import type { Metadata } from "next";
import { Oswald, Barlow, Space_Mono } from "next/font/google";
import "@/lib/tokens.css";
import "./globals.css";
import { Footer } from "@/components/layout/Footer";
import { RequestDialogClient } from "@/components/request-form/RequestDialogClient";

// Tone Forge 타이포그래피 — Oswald(디스플레이) / Barlow(본문) / Space Mono(수치·라벨).
// next/font 가 빌드타임에 셀프호스트(외부 요청 0, CSP 안전) + font-display: swap 기본.
const oswald = Oswald({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const barlow = Barlow({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const spaceMono = Space_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "GP-150 톤 라이브러리",
  description: "멀티 이펙터 곡별 기타 톤 패치를 GP-150 화면처럼 본다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: 아래 무플래시 스크립트가 하이드레이션 전 html.classList 에 'js' 를
    // 더하므로 server/client className 이 의도적으로 다르다(next-themes 패턴). 이 요소만 경고 억제.
    <html
      lang="ko"
      className={`${oswald.variable} ${barlow.variable} ${spaceMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        {/* 공유 점진적-향상 게이트: 페인트 전 html.js 를 부착한다. 여러 CSS 가 이 클래스를 게이트로 쓴다
            (변주 탭 비활성 패널 숨김: variation-tabs.module.css / 곡목록 필터바 표시: song-index.module.css).
            1st-party 한 줄, no-JS 면 미실행(=정적 폴백: 모든 패널/목록 visible, 컨트롤 부재).
            이 스크립트나 :global(html.js) 셀렉터를 바꾸면 그 폴백들이 깨진다. 정적 사이트라 CSP 미설정. */}
        <script
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.classList.add('js')",
          }}
        />
        {children}
        <Footer />
        {/* 전역 제보 dialog — 닫힘=display:none(흐름 영향 0). no-JS 면 트리거 <a> 가 /request 로 navigate. */}
        <RequestDialogClient />
      </body>
    </html>
  );
}
