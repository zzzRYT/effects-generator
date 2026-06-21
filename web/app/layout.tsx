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
      <body>{children}</body>
    </html>
  );
}
