import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import type { ExamPaper, ExamPatterns, QuestionStructure } from "@/lib/types";

const PARSED_DIR = join(process.cwd(), "data", "parsed");
const PATTERNS_FILE = join(process.cwd(), "data", "patterns.json");
const ANALYSIS_FILE = join(process.cwd(), "data", "analysis.json");

function parseQuestionStructure(md: string): QuestionStructure {
  const subQMatch = md.match(/(\d+)\)/g);
  const numberOfSubQuestions = subQMatch ? new Set(subQMatch).size : 0;
  const hasIntroScenario = /제시문|대화/.test(md);
  const refMatch = md.match(/\(가\)|\(나\)|\(다\)|\(라\)/g);
  const referenceMaterialCount = refMatch ? new Set(refMatch).size : 0;
  const wordLimitMatch = md.match(/(\d[,.]?\d+)자/);
  const wordLimit = wordLimitMatch ? parseInt(wordLimitMatch[1].replace(",", "")) : 1200;

  return { hasIntroScenario, numberOfSubQuestions, referenceMaterialCount, wordLimit };
}

function extractTopic(md: string): string {
  const topicMatch = md.match(/##\s*논술\s*주제\s*\n+(.+)/);
  return topicMatch ? topicMatch[1].replace(/\*+/g, "").trim() : "주제 미상";
}

function extractSubTopics(md: string): string[] {
  const lines = md.split("\n");
  const topics: string[] = [];
  for (const line of lines) {
    const match = line.match(/^\d+\)\s*(.+)/);
    if (match) topics.push(match[1].trim());
  }
  return topics;
}

function extractReferenceTexts(md: string): string[] {
  const refs: string[] = [];
  const refSection = md.match(/##\s*제시문[\s\S]*?(?=##\s*하위|$)/);
  if (refSection) {
    const parts = refSection[0].split(/\*\*\((?:가|나|다|라)\)\*\*/);
    for (let i = 1; i < parts.length; i++) {
      refs.push(parts[i].trim());
    }
    if (refs.length === 0) refs.push(refSection[0].trim());
  }
  return refs;
}

export function getExam(year: number): ExamPaper | null {
  try {
    const filePath = join(PARSED_DIR, `${year}.md`);
    const rawMd = readFileSync(filePath, "utf-8");
    return {
      year,
      rawMd,
      topic: extractTopic(rawMd),
      subTopics: extractSubTopics(rawMd),
      questionStructure: parseQuestionStructure(rawMd),
      referenceTexts: extractReferenceTexts(rawMd),
    };
  } catch {
    return null;
  }
}

export function getAllExams(): ExamPaper[] {
  const files = readdirSync(PARSED_DIR).filter((f) => f.endsWith(".md"));
  const exams: ExamPaper[] = [];
  for (const file of files) {
    const year = parseInt(file.replace(".md", ""));
    if (!isNaN(year)) {
      const exam = getExam(year);
      if (exam) exams.push(exam);
    }
  }
  return exams.sort((a, b) => a.year - b.year);
}

export function getExamPatterns(): ExamPatterns {
  const raw = readFileSync(PATTERNS_FILE, "utf-8");
  return JSON.parse(raw);
}

export function getAnalysis() {
  const raw = readFileSync(ANALYSIS_FILE, "utf-8");
  return JSON.parse(raw);
}
