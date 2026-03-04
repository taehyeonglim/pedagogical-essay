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
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">
        <header className="bg-emerald-700 shadow-md">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-lg font-bold text-white">
              교직논술 연습
            </Link>
            <div className="flex gap-8 text-sm font-medium">
              <Link
                href="/exams"
                className="rounded-lg px-3 py-2 text-emerald-100 transition hover:bg-emerald-600 hover:text-white"
              >
                기출 열람
              </Link>
              <Link
                href="/practice"
                className="rounded-lg px-3 py-2 text-emerald-100 transition hover:bg-emerald-600 hover:text-white"
              >
                모의 연습
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
