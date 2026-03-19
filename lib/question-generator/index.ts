import { generateJSON } from "@/lib/ai/gemini";
import { createSignedQuestion } from "@/lib/question-auth";
import { normalizeGeneratedQuestionPayload } from "@/lib/generated-question";
import { getAllExams, getExamPatterns, getAnalysis } from "@/lib/knowledge-base";
import type { GeneratedQuestion, ExamPaper, AnalysisData, AnalysisDomain, QuestionDifficulty } from "@/lib/types";

const DIFFICULTY_GUIDE: Record<string, string> = {
  basic: "1~2개 이론이 자연스럽게 녹아든 단순한 현장 상황. 교사 대화에서 문제 상황이 명확히 드러남.",
  standard: "2~3개 이론이 복합적으로 관련된 현장 상황. 교사마다 다른 접근 방식을 보여 비교·분석이 필요.",
  advanced: "3개 이상 이론이 얽힌 복합적 현장 상황. 여러 영역(교육과정, 평가, 학급경영 등)이 교차하며 비판적 분석과 대안 제시 요구.",
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
  if (domains.length === 0) {
    throw new Error("분석 데이터에 출제 영역이 없습니다");
  }
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
    ? `[${sampleExam.year}학년도]\n${sampleExam.rawMd.slice(0, 3_000)}`
    : "(해당 영역 기출 없음)";

  return `당신은 초등학교 임용시험 교직논술 출제 전문가입니다.
실제 기출문제의 출제 스타일을 정확히 재현하세요.

## 출제 영역: ${domain.name}
이 영역에서 수험생이 알아야 할 이론 (출제 시 참고용, 문항에 직접 언급 금지):
${theoriesList}

## 12개년 기출 분석 결과
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

## 출제의 핵심 원칙: 현장적합성

실제 기출문제 12개년을 분석한 결과, 다음 패턴이 확인되었습니다:
- 하위 문항에서 이론명·학자명을 **직접 언급한 경우는 12년간 단 1건** (2017 STAD)
- 전체 문항의 87.5%는 **학교 현장 시나리오를 제시하고 분석·개선 방안을 묻는 형식**
- 이론은 제시문의 **교사 대화 속에 자연스럽게 체현**되며, 수험생이 스스로 파악하여 적용

따라서 다음을 **반드시** 지키세요:

## 출제 요구사항
1. **문항에 이론명·학자명을 직접 쓰지 마세요.** "XXX 이론의 관점에서", "XXX에 따르면" 같은 표현 금지. 대신 "김 교사의 상황에서 나타난 문제점", "박 교사가 제안한 방법의 교육적 의의" 같이 시나리오 기반으로 물으세요.
2. 제시문 대화에서 교사들이 이론을 **행동·발언으로 체현**하게 하세요. 예: 교사가 "학생 수준에 맞춰 단계별 힌트를 제공했다"고 말하면, 수험생이 이것을 ZPD/스캐폴딩으로 파악해야 합니다.
3. 대화형 제시문: 3~5명 교사가 **구체적인 학교 현장 사례**를 논의 (학생 이름, 수업 상황, 학교 맥락 등 구체적으로)
4. 하위 문항 3~4개, 각 배점 명시 (합계 15점)
5. 각 문항은 **현장 상황 분석, 원인 진단, 개선 방안 제시, 교육적 의의 설명** 등을 요구
6. 난이도: ${difficulty} — ${DIFFICULTY_GUIDE[difficulty]}
7. 답안지 2매 이내 분량
8. "평가의 타당도 측면에서", "선다형 문항의 장단점" 같은 **교육학 일반 용어**는 사용 가능하나, **특정 학자명이나 이론 고유명칭**은 문항에 넣지 마세요.

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
  "targetTheories": ["제시문에 암묵적으로 녹아든 이론명 (문항에는 미언급이나 채점 시 참조용)"],
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
  difficulty: QuestionDifficulty = "standard"
): Promise<GeneratedQuestion> {
  const exams = getAllExams();
  const analysis = getAnalysis();
  const domain = selectDomain(analysis, difficulty);
  const prompt = buildPrompt(exams, difficulty, analysis, domain);
  const raw = await generateJSON<unknown>(prompt);
  const normalized = normalizeGeneratedQuestionPayload(raw, difficulty);

  return createSignedQuestion(normalized);
}
