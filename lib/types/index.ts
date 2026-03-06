export interface ExamPaperFormat {
  title: string;
  topic: string;
  scenario: string;
  subQuestions: {
    instruction: string;
    items: string[];
  };
  scoring: {
    content: { total: number; items: { label: string; score: number }[] };
    structure: { total: number; items: { label: string; score: number }[] };
  };
  notes: string[];
}

export interface ExamPaper {
  year: number;
  rawMd: string;
  topic: string;
  subTopics: string[];
  questionStructure: QuestionStructure;
  referenceTexts: string[];
}

export interface QuestionStructure {
  hasIntroScenario: boolean;
  numberOfSubQuestions: number;
  referenceMaterialCount: number;
  wordLimit: number;
}

export type QuestionDifficulty = "basic" | "standard" | "advanced";

export interface GeneratedQuestionAuth {
  issuedAt: number;
  expiresAt: number;
  signature: string;
}

export interface GeneratedQuestion {
  id: string;
  promptText: string;
  referenceMaterials: string[];
  expectedStructure: QuestionStructure;
  difficulty: QuestionDifficulty;
  targetTheories?: string[];
  targetDomain?: string;
  examFormat?: ExamPaperFormat;
  auth: GeneratedQuestionAuth;
}

export interface ScoreItem {
  score: number;
  maxScore: number;
  feedback: string;
}

export interface GradeResult {
  overallScore: number;
  breakdown: {
    content: ScoreItem;
    logic: ScoreItem;
    expression: ScoreItem;
  };
  spellingIssues: {
    original: string;
    suggestion: string;
    context: string;
  }[];
  strengths: string[];
  improvements: string[];
}

export interface PracticeSession {
  id: string;
  questionId: string;
  essay: string;
  startedAt: string;
  submittedAt?: string;
  gradeResult?: GradeResult;
}

export interface ExamPatterns {
  examYears: number[];
  totalExams: number;
  topicCategories: Record<string, number[]>;
  topicFrequency: { topic: string; count: number; percentage: number }[];
  questionStructure: {
    commonFormat: string;
    typicalSubQuestions: { min: number; max: number; average: number };
    presentationStyle: {
      dialogue: { count: number; percentage: number; years: number[] };
      report: { count: number; percentage: number; years: number[] };
    };
  };
  scoringSystem: {
    totalScore: number;
    breakdown: {
      content: { score: number; label: string };
      structure: { score: number; label: string };
    };
    structureDetail: {
      logicalCoherence: { score: number; label: string };
      spelling: { score: string; label: string };
      length: { score: string; label: string };
    };
  };
  wordLimit: {
    early: { years: number[]; format: string; penaltyRange: string };
    recent: { years: number[]; format: string; note: string };
  };
  writingGuidelines: string[];
  keyPatterns: string[];
}

// --- Commentary ---

export interface ExamCommentary {
  year: number;
  modelAnswer: string;
  problemExplanation: string;
  pedagogicalBackground: string;
  references: { title: string; url: string }[];
  sentenceAnnotations: { sentence: string; annotation: string }[];
}

// --- Analysis ---

export interface AnalysisTheory {
  name: string;
  years: number[];
  description: string;
  references: { title: string; url: string }[];
}

export interface AnalysisDomain {
  id: string;
  name: string;
  color: string;
  years: number[];
  theories: AnalysisTheory[];
}

export interface AnalysisYearlyItem {
  year: number;
  domain: string;
  domainId: string;
  topic: string;
  format: string;
  subQuestions: number;
  scoring: { content: number; structure: number };
  keyTheories: string[];
  keywords: string[];
  detail: string;
}

export interface AnalysisStatistics {
  domainDistribution: { domain: string; domainId: string; count: number; years: number[] }[];
  scoringChanges: { period: string; format: string; content: number; structure: number; note: string }[];
  formatDistribution: {
    dialogue: { count: number; percentage: number };
    report: { count: number; percentage: number };
  };
  recentEmphasis: string[];
  frequentCombinations: { theories: string[]; years: number[] }[];
}

export interface AnalysisData {
  domains: AnalysisDomain[];
  yearlyAnalysis: AnalysisYearlyItem[];
  statistics: AnalysisStatistics;
}
