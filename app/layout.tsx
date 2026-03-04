import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "초등 임용 교직논술 연습",
  description: "초등학교 임용시험 교직논술 연습 플랫폼",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <header className="border-b border-gray-200 bg-white">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-lg font-bold text-blue-700">
              교직논술 연습
            </Link>
            <div className="flex gap-6 text-sm">
              <Link href="/exams" className="hover:text-blue-600">기출 열람</Link>
              <Link href="/practice" className="hover:text-blue-600">모의 연습</Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
