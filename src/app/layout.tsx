import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SVC 고객별 자재출고·DV 분석",
  description: "월도별 부품·소모품 출고 현황과 고객 사용량(DV) 대비 출고를 분석합니다.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
