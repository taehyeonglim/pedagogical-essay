import { generateJSON } from "@/lib/ai/gemini";
import type { GradeResult, GeneratedQuestion } from "@/lib/types";

function buildGradePrompt(essay: string, question: GeneratedQuestion): string {
  return `당신은 초등학교 임용시험 교직논술 채점 전문가입니다.

## 채점 기준
- 총점: 20점
- 논술의 내용 (15점): 문항별 요구사항 충족도, 교육학적 정확성, 근거의 타당성
- 논술의 체계 (5점): 글의 논리적 체계성(3점), 맞춤법 및 표현의 적절성(2점)

## 출제 문항
${question.promptText}

## 수험생 답안
${essay}

## 채점 요구사항
1. 각 영역별 점수와 구체적 피드백 제공
2. 맞춤법 오류 식별 (원문, 수정 제안, 맥락)
3. 잘한 점 3가지 이상
4. 개선할 점 3가지 이상

다음 JSON 형식으로 응답하세요:
{
  "overallScore": 15,
  "breakdown": {
    "content": { "score": 10, "maxScore": 15, "feedback": "내용 피드백" },
    "logic": { "score": 3, "maxScore": 3, "feedback": "논리 피드백" },
    "expression": { "score": 2, "maxScore": 2, "feedback": "표현 피드백" }
  },
  "spellingIssues": [
    { "original": "오류 단어", "suggestion": "수정 제안", "context": "문장 맥락" }
  ],
  "strengths": ["잘한 점 1", "잘한 점 2", "잘한 점 3"],
  "improvements": ["개선점 1", "개선점 2", "개선점 3"]
}`;
}

export async function gradeEssay(
  essay: string,
  question: GeneratedQuestion
): Promise<GradeResult> {
  const prompt = buildGradePrompt(essay, question);
  return await generateJSON<GradeResult>(prompt);
}
