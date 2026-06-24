import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IdeoTrack · 管理后台",
  description: "IdeoTrack 管理员 Web 后台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
