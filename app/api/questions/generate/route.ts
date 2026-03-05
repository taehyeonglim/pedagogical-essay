import { NextResponse } from "next/server";
import { generateQuestion } from "@/lib/question-generator";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";

const VALID_DIFFICULTIES = new Set(["basic", "standard", "advanced"]);

export async function POST(request: Request) {
  const { ok } = checkRateLimit(getClientIP(request));
  if (!ok) {
    return NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const difficulty = VALID_DIFFICULTIES.has(body.difficulty) ? body.difficulty : "standard";
    const question = await generateQuestion(difficulty);
    return NextResponse.json(question);
  } catch {
    return NextResponse.json({ error: "문제 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
