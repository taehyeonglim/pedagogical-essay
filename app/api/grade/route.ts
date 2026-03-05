import { NextResponse } from "next/server";
import { gradeEssay } from "@/lib/grader";
import type { GeneratedQuestion } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { essay, question } = body as { essay: string; question: GeneratedQuestion };

    if (!essay || typeof essay !== "string") {
      return NextResponse.json({ error: "essay는 문자열이어야 합니다" }, { status: 400 });
    }
    if (!question || typeof question !== "object" || !question.promptText) {
      return NextResponse.json({ error: "유효한 question 객체가 필요합니다" }, { status: 400 });
    }

    const result = await gradeEssay(essay, question);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "채점 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
