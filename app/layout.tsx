import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-noto",
});

export const metadata: Metadata = {
  title: "作業時間記録 | 技能五輪 練習ログ",
  description: "工程別の練習タイムと気づきを記録する",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={notoSansJP.variable}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
