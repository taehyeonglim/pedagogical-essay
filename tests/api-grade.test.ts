import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSignedQuestion } from "@/lib/question-auth";
import { buildUnsignedQuestion } from "./support/question";

const { gradeEssayMock, checkRateLimitMock } = vi.hoisted(() => ({
  gradeEssayMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
}));

vi.mock("@/lib/grader", () => ({
  gradeEssay: gradeEssayMock,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: checkRateLimitMock,
}));

import { POST } from "@/app/api/grade/route";

describe("POST /api/grade", () => {
  beforeEach(() => {
    process.env.QUESTION_SIGNING_SECRET = "test-signing-secret";
    checkRateLimitMock.mockResolvedValue({ ok: true, remaining: 9 });
    gradeEssayMock.mockResolvedValue({
      overallScore: 18,
      breakdown: {
        content: { score: 13, maxScore: 15, feedback: "내용이 좋습니다." },
        logic: { score: 3, maxScore: 3, feedback: "논리가 명확합니다." },
        expression: { score: 2, maxScore: 2, feedback: "표현이 안정적입니다." },
      },
      spellingIssues: [],
      strengths: ["핵심 이론을 정확히 적용했습니다."],
      improvements: ["사례를 조금 더 구체화하세요."],
    });
  });

  afterEach(() => {
    delete process.env.QUESTION_SIGNING_SECRET;
    vi.useRealTimers();
  });

  it("returns 410 for an expired signed question", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-14T00:00:00.000Z"));

    const question = createSignedQuestion(buildUnsignedQuestion());
    vi.setSystemTime(new Date(question.auth.expiresAt + 30_001));

    const response = await POST(
      new Request("http://localhost/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          essay: "가".repeat(120),
          question,
        }),
      })
    );

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({
      error: "제출 시간이 만료되었습니다. 새 문제를 생성해 주세요.",
    });
    expect(gradeEssayMock).not.toHaveBeenCalled();
  });

  it("normalizes line endings before grading", async () => {
    const question = createSignedQuestion(buildUnsignedQuestion());
    const essay = ["첫 문장입니다.", "둘째 문장입니다.", "셋째 문장입니다."].join("\r\n").repeat(20);

    const response = await POST(
      new Request("http://localhost/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ essay, question }),
      })
    );

    expect(response.status).toBe(200);
    expect(gradeEssayMock).toHaveBeenCalledWith(essay.replace(/\r\n/g, "\n"), question);
    await expect(response.json()).resolves.toMatchObject({ overallScore: 18 });
  });

  it("returns 429 when the grading endpoint is rate limited", async () => {
    checkRateLimitMock.mockResolvedValueOnce({ ok: false, remaining: 0 });
    const question = createSignedQuestion(buildUnsignedQuestion());

    const response = await POST(
      new Request("http://localhost/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          essay: "나".repeat(120),
          question,
        }),
      })
    );

    expect(response.status).toBe(429);
    expect(gradeEssayMock).not.toHaveBeenCalled();
  });
});
