import { NextResponse } from "next/server";
import { generateQuestion } from "@/lib/question-generator";

const VALID_DIFFICULTIES = new Set(["basic", "standard", "advanced"]);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const difficulty = VALID_DIFFICULTIES.has(body.difficulty) ? body.difficulty : "standard";
    const question = await generateQuestion(difficulty);
    return NextResponse.json(question);
  } catch (error) {
    const message = error instanceof Error ? error.message : "문제 생성 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
