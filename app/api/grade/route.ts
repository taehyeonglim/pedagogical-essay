import { NextResponse } from "next/server";
import { gradeEssay } from "@/lib/grader";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import type { GeneratedQuestion } from "@/lib/types";

const MAX_ESSAY_LENGTH = 10_000;

export async function POST(request: Request) {
  const { ok } = checkRateLimit(getClientIP(request));
  if (!ok) {
    return NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { essay, question } = body as { essay: string; question: GeneratedQuestion };

    if (!essay || typeof essay !== "string") {
      return NextResponse.json({ error: "essay는 문자열이어야 합니다" }, { status: 400 });
    }
    if (essay.length > MAX_ESSAY_LENGTH) {
      return NextResponse.json({ error: `답안은 ${MAX_ESSAY_LENGTH}자를 초과할 수 없습니다` }, { status: 400 });
    }
    if (!question || typeof question !== "object" || !question.promptText) {
      return NextResponse.json({ error: "유효한 question 객체가 필요합니다" }, { status: 400 });
    }

    const result = await gradeEssay(essay, question);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "채점 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
