import { NextResponse } from "next/server";
import { getAllExams, getExam, getCommentary } from "@/lib/knowledge-base";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year");
  const commentary = searchParams.get("commentary");

  if (commentary) {
    const data = getCommentary(parseInt(commentary));
    if (!data) return NextResponse.json({ error: "해설을 찾을 수 없습니다" }, { status: 404 });
    return NextResponse.json(data);
  }

  if (year) {
    const exam = getExam(parseInt(year));
    if (!exam) return NextResponse.json({ error: "시험을 찾을 수 없습니다" }, { status: 404 });
    return NextResponse.json(exam);
  }

  const exams = getAllExams();
  return NextResponse.json(exams);
}
