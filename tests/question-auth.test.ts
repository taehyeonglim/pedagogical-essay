import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSignedQuestion, verifySignedQuestion } from "@/lib/question-auth";
import { buildUnsignedQuestion } from "./support/question";

describe("question auth", () => {
  beforeEach(() => {
    process.env.QUESTION_SIGNING_SECRET = "test-signing-secret";
  });

  afterEach(() => {
    delete process.env.QUESTION_SIGNING_SECRET;
    vi.useRealTimers();
  });

  it("accepts an untampered signed question", () => {
    const question = createSignedQuestion(buildUnsignedQuestion());

    expect(verifySignedQuestion(question)).toEqual({ ok: true });
  });

  it("rejects a tampered signed question", () => {
    const question = createSignedQuestion(buildUnsignedQuestion());
    const tampered = {
      ...question,
      promptText: `${question.promptText}\n추가 문항`,
    };

    expect(verifySignedQuestion(tampered)).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects an expired signed question", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-14T00:00:00.000Z"));

    const question = createSignedQuestion(buildUnsignedQuestion());
    vi.setSystemTime(new Date(question.auth.expiresAt + 30_001));

    expect(verifySignedQuestion(question)).toEqual({ ok: false, reason: "expired" });
  });
});
