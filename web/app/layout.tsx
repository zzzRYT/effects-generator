import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/lib/tokens.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        {/* 무플래시: 패널 페인트 전 html.js 부착 → 변주 탭 CSS(비활성 패널 숨김)가 즉시 적용.
            1st-party 한 줄, no-JS 면 미실행(=모든 패널 visible 폴백). 정적 사이트라 CSP 미설정. */}
        <script
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.classList.add('js')",
          }}
        />
        {children}
      </body>
    </html>
  );
}
