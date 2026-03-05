import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import type { ExamPaper, ExamPatterns, ExamCommentary, AnalysisData, QuestionStructure } from "@/lib/types";

const PARSED_DIR = join(process.cwd(), "data", "parsed");
const COMMENTARY_DIR = join(process.cwd(), "data", "commentary");
const PATTERNS_FILE = join(process.cwd(), "data", "patterns.json");
const ANALYSIS_FILE = join(process.cwd(), "data", "analysis.json");

let _examsCache: ExamPaper[] | null = null;
let _patternsCache: ExamPatterns | null = null;
let _analysisCache: AnalysisData | null = null;

function parseQuestionStructure(md: string): QuestionStructure {
  // 하위 문항 섹션만 추출하여 카운트 (배점 기준 등 오매칭 방지)
  const subSection = md.match(/##\s*하위\s*문항[\s\S]*?(?=##|$)/)?.[0] ?? md;
  const subQMatch = subSection.match(/^\s*\d+[).]\s/gm);
  const numberOfSubQuestions = subQMatch ? subQMatch.length : 0;
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
  const subSection = md.match(/##\s*하위\s*문항[\s\S]*?(?=##|$)/)?.[0] ?? md;
  const lines = subSection.split("\n");
  const topics: string[] = [];
  for (const line of lines) {
    const match = line.match(/^\s*\d+[).]\s*(.+)/);
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
  if (_examsCache) return _examsCache;
  const files = readdirSync(PARSED_DIR).filter((f) => f.endsWith(".md"));
  const exams: ExamPaper[] = [];
  for (const file of files) {
    const year = parseInt(file.replace(".md", ""));
    if (!isNaN(year)) {
      const exam = getExam(year);
      if (exam) exams.push(exam);
    }
  }
  _examsCache = exams.sort((a, b) => a.year - b.year);
  return _examsCache;
}

let _summariesCache: { year: number; topic: string }[] | null = null;

export function getAllExamSummaries(): { year: number; topic: string }[] {
  if (_summariesCache) return _summariesCache;
  const files = readdirSync(PARSED_DIR).filter((f) => f.endsWith(".md"));
  const summaries: { year: number; topic: string }[] = [];
  for (const file of files) {
    const year = parseInt(file.replace(".md", ""));
    if (!isNaN(year)) {
      try {
        const md = readFileSync(join(PARSED_DIR, file), "utf-8");
        summaries.push({ year, topic: extractTopic(md) });
      } catch { /* skip */ }
    }
  }
  _summariesCache = summaries.sort((a, b) => a.year - b.year);
  return _summariesCache;
}

export function getExamPatterns(): ExamPatterns {
  if (_patternsCache) return _patternsCache;
  const raw = readFileSync(PATTERNS_FILE, "utf-8");
  _patternsCache = JSON.parse(raw) as ExamPatterns;
  return _patternsCache;
}

export function getAnalysis(): AnalysisData {
  if (_analysisCache) return _analysisCache;
  const raw = readFileSync(ANALYSIS_FILE, "utf-8");
  _analysisCache = JSON.parse(raw) as AnalysisData;
  return _analysisCache;
}

export function getCommentary(year: number): ExamCommentary | null {
  try {
    const filePath = join(COMMENTARY_DIR, `${year}.json`);
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
