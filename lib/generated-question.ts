import type {
  ExamPaperFormat,
  GeneratedQuestion,
  GeneratedQuestionAuth,
  QuestionDifficulty,
  QuestionStructure,
} from "@/lib/types";

export const QUESTION_DURATION_MS = 60 * 60 * 1000;

type GeneratedQuestionPayload = Omit<GeneratedQuestion, "id" | "auth">;

const VALID_DIFFICULTIES: QuestionDifficulty[] = ["basic", "standard", "advanced"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(
  value: unknown,
  field: string,
  {
    minLength = 1,
    maxLength = 12_000,
    trim = true,
  }: { minLength?: number; maxLength?: number; trim?: boolean } = {}
): string {
  if (typeof value !== "string") {
    throw new Error(`${field} must be a string`);
  }

  const normalized = trim ? value.trim() : value;
  if (normalized.length < minLength || normalized.length > maxLength) {
    throw new Error(`${field} has an invalid length`);
  }

  return normalized;
}

function readOptionalString(
  value: unknown,
  field: string,
  options?: { maxLength?: number; trim?: boolean }
): string | undefined {
  if (value == null) return undefined;
  if (typeof value !== "string") {
    throw new Error(`${field} must be a string`);
  }
  const normalized = (options?.trim ?? true) ? value.trim() : value;
  if (!normalized) return undefined;
  return readString(normalized, field, { minLength: 1, ...options });
}

function readStringArray(
  value: unknown,
  field: string,
  { maxItems = 20, maxItemLength = 2_000 }: { maxItems?: number; maxItemLength?: number } = {}
): string[] {
  if (value == null) return [];
  if (!Array.isArray(value)) {
    throw new Error(`${field} must be an array`);
  }

  const normalized = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems)
    .map((item, index) => readString(item, `${field}[${index}]`, { maxLength: maxItemLength }));

  return Array.from(new Set(normalized));
}

function readBoolean(value: unknown, defaultValue: boolean): boolean {
  return typeof value === "boolean" ? value : defaultValue;
}

function readInteger(
  value: unknown,
  defaultValue: number,
  { min = 0, max = 100_000 }: { min?: number; max?: number } = {}
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return defaultValue;
  const normalized = Math.trunc(value);
  return Math.min(max, Math.max(min, normalized));
}

function readDifficulty(value: unknown, fallback?: QuestionDifficulty): QuestionDifficulty {
  if (typeof value === "string" && VALID_DIFFICULTIES.includes(value as QuestionDifficulty)) {
    return value as QuestionDifficulty;
  }
  if (fallback) return fallback;
  throw new Error("difficulty must be basic, standard, or advanced");
}

function buildPromptTextFromExamFormat(examFormat: ExamPaperFormat): string {
  const sections = [
    examFormat.title,
    examFormat.topic,
    examFormat.scenario,
    examFormat.subQuestions.instruction,
    ...examFormat.subQuestions.items,
    ...examFormat.notes,
  ];

  return sections.filter(Boolean).join("\n\n");
}

function normalizeExamFormat(value: unknown): ExamPaperFormat | undefined {
  if (!isRecord(value)) return undefined;

  try {
    const subQuestions = isRecord(value.subQuestions) ? value.subQuestions : null;
    const scoring = isRecord(value.scoring) ? value.scoring : null;
    const content = scoring && isRecord(scoring.content) ? scoring.content : null;
    const structure = scoring && isRecord(scoring.structure) ? scoring.structure : null;

    if (!subQuestions || !content || !structure) {
      return undefined;
    }

    const items = readStringArray(subQuestions.items, "examFormat.subQuestions.items", {
      maxItems: 5,
      maxItemLength: 500,
    });
    if (items.length === 0) {
      return undefined;
    }

    return {
      title: readString(value.title, "examFormat.title", { maxLength: 200 }),
      topic: readString(value.topic, "examFormat.topic", { maxLength: 500 }),
      scenario: readString(value.scenario, "examFormat.scenario", { maxLength: 8_000 }),
      subQuestions: {
        instruction: readString(subQuestions.instruction, "examFormat.subQuestions.instruction", { maxLength: 1_000 }),
        items,
      },
      scoring: {
        content: {
          total: readInteger(content.total, 15, { min: 0, max: 20 }),
          items: Array.isArray(content.items)
            ? content.items
                .filter(isRecord)
                .slice(0, 5)
                .map((item, index) => ({
                  label: readString(item.label, `examFormat.scoring.content.items[${index}].label`, {
                    maxLength: 200,
                  }),
                  score: readInteger(item.score, 0, { min: 0, max: 20 }),
                }))
            : [],
        },
        structure: {
          total: readInteger(structure.total, 5, { min: 0, max: 20 }),
          items: Array.isArray(structure.items)
            ? structure.items
                .filter(isRecord)
                .slice(0, 5)
                .map((item, index) => ({
                  label: readString(item.label, `examFormat.scoring.structure.items[${index}].label`, {
                    maxLength: 200,
                  }),
                  score: readInteger(item.score, 0, { min: 0, max: 20 }),
                }))
            : [],
        },
      },
      notes: readStringArray(value.notes, "examFormat.notes", { maxItems: 10, maxItemLength: 300 }),
    };
  } catch {
    return undefined;
  }
}

function normalizeExpectedStructure(
  value: unknown,
  examFormat: ExamPaperFormat | undefined,
  referenceMaterials: string[]
): QuestionStructure {
  const defaults = {
    hasIntroScenario: Boolean(examFormat?.scenario),
    numberOfSubQuestions: examFormat?.subQuestions.items.length ?? 3,
    referenceMaterialCount: referenceMaterials.length,
    wordLimit: 1_200,
  };

  if (!isRecord(value)) {
    return defaults;
  }

  return {
    hasIntroScenario: readBoolean(value.hasIntroScenario, defaults.hasIntroScenario),
    numberOfSubQuestions: readInteger(value.numberOfSubQuestions, defaults.numberOfSubQuestions, { min: 1, max: 6 }),
    referenceMaterialCount: readInteger(value.referenceMaterialCount, defaults.referenceMaterialCount, {
      min: 0,
      max: 10,
    }),
    wordLimit: readInteger(value.wordLimit, defaults.wordLimit, { min: 200, max: 5_000 }),
  };
}

export function normalizeGeneratedQuestionPayload(
  value: unknown,
  requestedDifficulty?: QuestionDifficulty
): GeneratedQuestionPayload {
  if (!isRecord(value)) {
    throw new Error("generated question must be an object");
  }

  const examFormat = normalizeExamFormat(value.examFormat);
  const promptText =
    readOptionalString(value.promptText, "promptText", { maxLength: 12_000 }) ??
    (examFormat ? buildPromptTextFromExamFormat(examFormat) : undefined);

  if (!promptText) {
    throw new Error("promptText is required");
  }

  const referenceMaterials = readStringArray(value.referenceMaterials, "referenceMaterials", {
    maxItems: 10,
    maxItemLength: 2_000,
  });

  return {
    promptText,
    referenceMaterials,
    expectedStructure: normalizeExpectedStructure(value.expectedStructure, examFormat, referenceMaterials),
    difficulty: readDifficulty(value.difficulty, requestedDifficulty),
    targetTheories: readStringArray(value.targetTheories, "targetTheories", { maxItems: 6, maxItemLength: 120 }),
    targetDomain: readOptionalString(value.targetDomain, "targetDomain", { maxLength: 120 }),
    examFormat,
  };
}

function normalizeQuestionAuth(value: unknown): GeneratedQuestionAuth {
  if (!isRecord(value)) {
    throw new Error("question auth metadata is required");
  }

  return {
    issuedAt: readInteger(value.issuedAt, 0, { min: 1, max: 9_999_999_999_999 }),
    expiresAt: readInteger(value.expiresAt, 0, { min: 1, max: 9_999_999_999_999 }),
    signature: readString(value.signature, "auth.signature", { minLength: 32, maxLength: 256, trim: false }),
  };
}

export function normalizeGeneratedQuestion(value: unknown): GeneratedQuestion {
  if (!isRecord(value)) {
    throw new Error("generated question must be an object");
  }

  return {
    id: readString(value.id, "id", { maxLength: 200, trim: false }),
    ...normalizeGeneratedQuestionPayload(value),
    auth: normalizeQuestionAuth(value.auth),
  };
}
