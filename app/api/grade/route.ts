import { NextResponse } from "next/server";
import { gradeEssay } from "@/lib/grader";
import { normalizeGeneratedQuestion } from "@/lib/generated-question";
import { verifySignedQuestion } from "@/lib/question-auth";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import type { GeneratedQuestion } from "@/lib/types";

export const runtime = "nodejs";

const MAX_ESSAY_LENGTH = 10_000;
const MIN_ESSAY_LENGTH = 100;

export async function POST(request: Request) {
  const { ok } = checkRateLimit(getClientIP(request));
  if (!ok) {
    return NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 잘못되었습니다" }, { status: 400 });
  }

  const { essay, question: rawQuestion } = body as { essay?: unknown; question?: unknown };

  if (typeof essay !== "string") {
    return NextResponse.json({ error: "essay는 문자열이어야 합니다" }, { status: 400 });
  }
  const normalizedEssay = essay.replace(/\r\n/g, "\n");
  if (normalizedEssay.trim().length < MIN_ESSAY_LENGTH) {
    return NextResponse.json({ error: `답안은 최소 ${MIN_ESSAY_LENGTH}자 이상이어야 합니다` }, { status: 400 });
  }
  if (normalizedEssay.length > MAX_ESSAY_LENGTH) {
    return NextResponse.json({ error: `답안은 ${MAX_ESSAY_LENGTH}자를 초과할 수 없습니다` }, { status: 400 });
  }

  let question: GeneratedQuestion;
  try {
    question = normalizeGeneratedQuestion(rawQuestion);
  } catch {
    return NextResponse.json({ error: "유효한 question 객체가 필요합니다" }, { status: 400 });
  }

  const verification = verifySignedQuestion(question);
  if (!verification.ok) {
    const errorMessage =
      verification.reason === "expired"
        ? "제출 시간이 만료되었습니다. 새 문제를 생성해 주세요."
        : "유효하지 않은 문제 데이터입니다. 새 문제를 다시 생성해 주세요.";
    const status = verification.reason === "expired" ? 410 : 400;
    return NextResponse.json({ error: errorMessage }, { status });
  }

  try {
    const result = await gradeEssay(normalizedEssay, question);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "채점 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
