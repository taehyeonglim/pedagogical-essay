import { generateJSON } from "@/lib/ai/gemini";
import { getAllExams, getExamPatterns, getAnalysis } from "@/lib/knowledge-base";
import type { GeneratedQuestion, ExamPaper } from "@/lib/types";

interface AnalysisDomain {
  id: string;
  name: string;
  theories: { name: string; years: number[]; description: string }[];
}

interface AnalysisData {
  domains: AnalysisDomain[];
  yearlyAnalysis: { year: number; domain: string; domainId: string; rawMd?: string }[];
  statistics: {
    domainDistribution: { domain: string; domainId: string; count: number; years: number[] }[];
    formatDistribution: { dialogue: { percentage: number }; report: { percentage: number } };
    scoringChanges: { period: string; content: number; structure: number; note: string }[];
    recentEmphasis: string[];
    frequentCombinations: { theories: string[]; years: number[] }[];
  };
}

const DIFFICULTY_GUIDE: Record<string, string> = {
  basic: "단일 이론 적용, 직접적 질문. 이론의 개념과 특징을 학교 현장 사례에 적용하는 수준.",
  standard: "2개 이론 비교·적용. 이론 간 공통점·차이점 분석 + 현장 적용 개선 방안 제시.",
  advanced: "3개 이론 융합, 비판적 분석 + 대안 제시. 복합 영역 출제 가능.",
};

function selectDomain(
  analysis: AnalysisData,
  difficulty: string
): AnalysisDomain {
  const domains = analysis.domains;
  const dist = analysis.statistics.domainDistribution;

  if (difficulty === "basic") {
    const highFreqIds = dist
      .filter((d) => d.count >= 3)
      .map((d) => d.domainId);
    const candidates = domains.filter((d) => highFreqIds.includes(d.id));
    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
  }

  if (difficulty === "advanced") {
    const lowFreqIds = dist
      .filter((d) => d.count > 0 && d.count <= 2)
      .map((d) => d.domainId);
    const candidates = domains.filter((d) => lowFreqIds.includes(d.id));
    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
  }

  // standard 또는 fallback: 전 영역 랜덤
  return domains[Math.floor(Math.random() * domains.length)];
}

function findRecentExamForDomain(
  exams: ExamPaper[],
  analysis: AnalysisData,
  domainId: string
): ExamPaper | null {
  const yearlyForDomain = analysis.yearlyAnalysis
    .filter((y) => y.domainId === domainId)
    .sort((a, b) => b.year - a.year);

  for (const entry of yearlyForDomain) {
    const exam = exams.find((e) => e.year === entry.year);
    if (exam) return exam;
  }
  // fallback: 가장 최근 기출
  return exams.length > 0 ? exams[exams.length - 1] : null;
}

function buildPrompt(
  exams: ExamPaper[],
  difficulty: string,
  analysis: AnalysisData,
  domain: AnalysisDomain
): string {
  const patterns = getExamPatterns();
  const stats = analysis.statistics;

  // 선택 영역의 이론 목록
  const theoriesList = domain.theories
    .map(
      (t) =>
        `- ${t.name} (출제: ${t.years.join(", ")}): ${t.description}`
    )
    .join("\n");

  // 12개년 영역별 출제 빈도
  const domainFreq = stats.domainDistribution
    .map((d) => `${d.domain}: ${d.count}회`)
    .join(", ");

  // 자주 함께 출제되는 이론 조합
  const combos = stats.frequentCombinations
    .map((c) => `[${c.theories.join(" + ")}] (${c.years.join(", ")})`)
    .join("\n");

  // 최근 강조 주제
  const recentEmphasis = stats.recentEmphasis.join(", ");

  // 실제 기출문제 예시
  const sampleExam = findRecentExamForDomain(exams, analysis, domain.id);
  const sampleExamText = sampleExam
    ? `[${sampleExam.year}학년도]\n${sampleExam.rawMd}`
    : "(해당 영역 기출 없음)";

  return `당신은 초등학교 임용시험 교직논술 출제 전문가입니다.
아래 교육학 이론과 기출 패턴을 **반드시** 활용하여 문제를 출제하세요.

## 출제 영역: ${domain.name}
이 영역의 핵심 이론:
${theoriesList}

## 12개년 출제 패턴
- 영역별 출제 빈도: ${domainFreq}
- 형식: 대화형 ${stats.formatDistribution.dialogue.percentage}% / 보고서형 ${stats.formatDistribution.report.percentage}%
- 배점: 내용 ${patterns.scoringSystem.breakdown.content.score}점 + 체계 ${patterns.scoringSystem.breakdown.structure.score}점 = 총 ${patterns.scoringSystem.totalScore}점
- 하위 문항: ${patterns.questionStructure.typicalSubQuestions.min}~${patterns.questionStructure.typicalSubQuestions.max}개, 각 문항에 배점 명시
- 답안: 답안지 2매 이내

## 자주 함께 출제되는 이론 조합
${combos}

## 최근 3개년 강조 주제
${recentEmphasis}

## 실제 기출문제 예시
${sampleExamText}

## 출제 요구사항
1. 위 이론 중 2~3개를 **반드시** 포함
2. 대화형 제시문: 3~5명 교사가 학교 현장 사례 논의
3. 하위 문항 3~4개, 각 배점 명시 (합계 15점)
4. 각 문항은 이론 적용·분석·개선 방안 중 하나 요구
5. 난이도: ${difficulty} — ${DIFFICULTY_GUIDE[difficulty]}
6. 답안지 2매 이내 분량

다음 JSON 형식으로 응답하세요:
{
  "promptText": "문제 전문 (제시문 대화 + 하위 문항 포함, 폴백용)",
  "referenceMaterials": ["제시문에 포함된 참고 자료들"],
  "expectedStructure": {
    "hasIntroScenario": true,
    "numberOfSubQuestions": 3,
    "referenceMaterialCount": 1,
    "wordLimit": 1200
  },
  "difficulty": "${difficulty}",
  "targetTheories": ["출제에 활용된 이론명"],
  "targetDomain": "${domain.name}",
  "examFormat": {
    "title": "20XX학년도 초등학교 교직논술",
    "topic": "논술 주제 한 줄 요약",
    "scenario": "제시문 전체 (대화형 텍스트, 교사 이름과 대화 포함)",
    "subQuestions": {
      "instruction": "위 대화에 근거하여 논하시오. [총 20점]",
      "items": ["1) 첫 번째 하위 문항 [X점]", "2) 두 번째 하위 문항 [X점]"]
    },
    "scoring": {
      "content": { "total": 15, "items": [{"label": "평가 항목", "score": 5}] },
      "structure": { "total": 5, "items": [{"label": "평가 항목", "score": 5}] }
    },
    "notes": ["답안의 분량은 답안지 2매 이내로 작성", "문제와 관계없는 내용은 배점에서 제외"]
  }
}`;
}

export async function generateQuestion(
  difficulty: "basic" | "standard" | "advanced" = "standard"
): Promise<GeneratedQuestion> {
  const exams = getAllExams();
  const analysis = getAnalysis() as AnalysisData;
  const domain = selectDomain(analysis, difficulty);
  const prompt = buildPrompt(exams, difficulty, analysis, domain);
  const result = await generateJSON<Omit<GeneratedQuestion, "id">>(prompt);

  return {
    id: `q_${Date.now()}`,
    ...result,
  };
}
