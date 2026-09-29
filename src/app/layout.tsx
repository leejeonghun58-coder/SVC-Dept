import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "서비스 자재 출고·DV 통합분석 시스템",
  description: "Service Supply & DV Analytics",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
