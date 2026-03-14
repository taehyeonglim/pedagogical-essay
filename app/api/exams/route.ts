import { NextResponse } from "next/server";
import { getAllExamSummaries, getExam, getCommentary } from "@/lib/knowledge-base";

export const runtime = "nodejs";

const MIN_YEAR = 2015;
const MAX_YEAR = 2030;

function parseYear(value: string): number | null {
  const n = parseInt(value, 10);
  if (isNaN(n) || n < MIN_YEAR || n > MAX_YEAR) return null;
  return n;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get("year");
    const commentaryParam = searchParams.get("commentary");

    if (commentaryParam) {
      const year = parseYear(commentaryParam);
      if (!year) return NextResponse.json({ error: "유효하지 않은 연도입니다" }, { status: 400 });
      const data = getCommentary(year);
      if (!data) return NextResponse.json({ error: "해설을 찾을 수 없습니다" }, { status: 404 });
      return NextResponse.json(data, {
        headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
      });
    }

    if (yearParam) {
      const year = parseYear(yearParam);
      if (!year) return NextResponse.json({ error: "유효하지 않은 연도입니다" }, { status: 400 });
      const exam = getExam(year);
      if (!exam) return NextResponse.json({ error: "시험을 찾을 수 없습니다" }, { status: 404 });
      return NextResponse.json(exam, {
        headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
      });
    }

    const summaries = getAllExamSummaries();
    return NextResponse.json(summaries, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch {
    return NextResponse.json({ error: "데이터를 불러오는 중 오류가 발생했습니다" }, { status: 500 });
  }
}
