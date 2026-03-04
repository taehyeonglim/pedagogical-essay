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

export interface GeneratedQuestion {
  id: string;
  promptText: string;
  referenceMaterials: string[];
  expectedStructure: QuestionStructure;
  difficulty: "basic" | "standard" | "advanced";
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
  topicFrequency: { topic: string; count: number; percentage: number }[];
  questionStructure: {
    commonFormat: string;
    typicalSubQuestions: { min: number; max: number; average: number };
  };
  scoringSystem: {
    totalScore: number;
    breakdown: {
      content: { score: number; label: string };
      structure: { score: number; label: string };
    };
  };
}
