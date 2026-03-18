import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import type { GeneratedQuestion } from "@/lib/types";
import { QUESTION_DURATION_MS } from "@/lib/generated-question";

const QUESTION_SUBMISSION_GRACE_MS = 30_000;

type SignedQuestionInput = Omit<GeneratedQuestion, "auth"> & {
  auth: {
    issuedAt: number;
    expiresAt: number;
  };
};

function getSigningKey(): string {
  const key = process.env.QUESTION_SIGNING_SECRET;
  if (!key) {
    throw new Error("QUESTION_SIGNING_SECRET 환경변수가 필요합니다");
  }
  return key;
}

function serializeQuestion(input: SignedQuestionInput): string {
  return JSON.stringify({
    id: input.id,
    promptText: input.promptText,
    referenceMaterials: input.referenceMaterials,
    expectedStructure: input.expectedStructure,
    difficulty: input.difficulty,
    targetTheories: input.targetTheories ?? [],
    targetDomain: input.targetDomain ?? null,
    examFormat: input.examFormat ?? null,
    issuedAt: input.auth.issuedAt,
    expiresAt: input.auth.expiresAt,
  });
}

function signQuestion(input: SignedQuestionInput): string {
  return createHmac("sha256", getSigningKey()).update(serializeQuestion(input)).digest("hex");
}

export function createSignedQuestion(question: Omit<GeneratedQuestion, "id" | "auth">): GeneratedQuestion {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + QUESTION_DURATION_MS;
  const base: SignedQuestionInput = {
    id: crypto.randomUUID(),
    ...question,
    auth: { issuedAt, expiresAt },
  };

  return {
    ...base,
    auth: {
      ...base.auth,
      signature: signQuestion(base),
    },
  };
}

export function verifySignedQuestion(question: GeneratedQuestion): { ok: true } | { ok: false; reason: "expired" | "invalid" } {
  const { issuedAt, expiresAt, signature } = question.auth;
  if (expiresAt <= issuedAt) {
    return { ok: false, reason: "invalid" };
  }
  if (expiresAt - issuedAt > QUESTION_DURATION_MS + QUESTION_SUBMISSION_GRACE_MS) {
    return { ok: false, reason: "invalid" };
  }

  const expected = signQuestion({
    ...question,
    auth: { issuedAt, expiresAt },
  });

  const actualBytes = Buffer.from(signature, "hex");
  const expectedBytes = Buffer.from(expected, "hex");
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) {
    return { ok: false, reason: "invalid" };
  }

  if (Date.now() > expiresAt + QUESTION_SUBMISSION_GRACE_MS) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true };
}
