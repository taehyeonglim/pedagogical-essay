import { generateJSON } from "@/lib/ai/gemini";
import { getAllExams, getExamPatterns } from "@/lib/knowledge-base";
import type { GeneratedQuestion, ExamPaper } from "@/lib/types";

function buildPrompt(exams: ExamPaper[], difficulty: string): string {
  const patterns = getExamPatterns();
  const sampleExams = exams.slice(-3).map((e) => ({
    year: e.year,
    topic: e.topic,
    subTopics: e.subTopics,
    structure: e.questionStructure,
  }));

  return `당신은 초등학교 임용시험 교직논술 출제 전문가입니다.

## 출제 패턴 분석
- 주요 주제 빈도: ${JSON.stringify(patterns.topicFrequency)}
- 문항 구조: 대화형 제시문 + 하위 문항 ${patterns.questionStructure.typicalSubQuestions.average}개
- 총점: ${patterns.scoringSystem.totalScore}점 (내용 ${patterns.scoringSystem.breakdown.content.score}점 + 체계 ${patterns.scoringSystem.breakdown.structure.score}점)

## 최근 기출 샘플
${JSON.stringify(sampleExams, null, 2)}

## 요구사항
위 패턴을 분석하여 새로운 모의 교직논술 문제를 1개 생성하세요.
난이도: ${difficulty}

다음 JSON 형식으로 응답하세요:
{
  "promptText": "문제 전문 (제시문 대화 + 하위 문항 포함)",
  "referenceMaterials": ["제시문에 포함된 참고 자료들"],
  "expectedStructure": {
    "hasIntroScenario": true,
    "numberOfSubQuestions": 3,
    "referenceMaterialCount": 1,
    "wordLimit": 1200
  },
  "difficulty": "${difficulty}"
}`;
}

export async function generateQuestion(
  difficulty: "basic" | "standard" | "advanced" = "standard"
): Promise<GeneratedQuestion> {
  const exams = getAllExams();
  const prompt = buildPrompt(exams, difficulty);
  const result = await generateJSON<Omit<GeneratedQuestion, "id">>(prompt);

  return {
    id: `q_${Date.now()}`,
    ...result,
  };
}
