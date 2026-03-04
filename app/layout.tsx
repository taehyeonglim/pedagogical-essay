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
              <Link
                href="/analysis"
                className="rounded-lg px-3 py-2 text-emerald-100 transition hover:bg-emerald-600 hover:text-white"
              >
                출제 패턴 분석
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="border-t border-stone-200 bg-stone-100">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-1 px-4 py-6 text-xs text-stone-400">
            <p>
              전주교육대학교 초등교육과 임태형 교수 개발 ·{" "}
              <a href="mailto:thlim@jnue.kr" className="underline underline-offset-2 transition hover:text-stone-600">
                thlim@jnue.kr
              </a>
            </p>
            <p>&copy; {new Date().getFullYear()} Jeonju National University of Education. All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
