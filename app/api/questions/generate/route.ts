import { NextResponse } from "next/server";
import { generateQuestion } from "@/lib/question-generator";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";

const VALID_DIFFICULTIES = new Set(["basic", "standard", "advanced"]);

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

  const { difficulty } = body as { difficulty?: string };
  if (difficulty && !VALID_DIFFICULTIES.has(difficulty)) {
    return NextResponse.json({ error: "유효한 difficulty 값: basic, standard, advanced" }, { status: 400 });
  }

  try {
    const question = await generateQuestion((difficulty as "basic" | "standard" | "advanced") ?? "standard");
    return NextResponse.json(question);
  } catch {
    return NextResponse.json({ error: "문제 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
