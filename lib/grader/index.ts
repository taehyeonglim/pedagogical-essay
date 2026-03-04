import { generateJSON } from "@/lib/ai/gemini";
import { getAnalysis } from "@/lib/knowledge-base";
import type { GradeResult, GeneratedQuestion } from "@/lib/types";

function lookupTheoryDescriptions(
  theoryNames: string[]
): { name: string; description: string }[] {
  const analysis = getAnalysis();
  const results: { name: string; description: string }[] = [];

  for (const name of theoryNames) {
    for (const domain of analysis.domains) {
      const found = domain.theories.find(
        (t: { name: string; description: string }) => t.name === name
      );
      if (found) {
        results.push({ name: found.name, description: found.description });
        break;
      }
    }
  }
  return results;
}

function buildGradePrompt(essay: string, question: GeneratedQuestion): string {
  // 이론 해설 섹션 구성
  let theorySection = "";
  if (question.targetTheories && question.targetTheories.length > 0) {
    const theories = lookupTheoryDescriptions(question.targetTheories);
    if (theories.length > 0) {
      const theoryList = theories
        .map((t) => `- ${t.name}: ${t.description}`)
        .join("\n");
      theorySection = `
## 이 문항에서 다루는 핵심 교육학 이론
${theoryList}

## 이론 정확성 검증 기준
- 이론의 핵심 개념을 올바르게 서술했는가
- 학자명·모형명 등 전문 용어를 정확히 사용했는가
- 이론을 학교 현장 맥락에 적절히 적용했는가
- 단순 나열이 아닌 분석적·논리적 서술인가
`;
    }
  }

  return `당신은 초등학교 임용시험 교직논술 채점 전문가입니다.

## 채점 기준
- 총점 20점 = 내용 15점 + 체계 5점
- 내용: 하위 문항별 요구사항 충족, 교육학 이론의 정확한 이해·적용, 근거 타당성
- 체계: 논리적 체계성(3점) + 맞춤법·표현(2점)
${theorySection}
## 출제 문항
${question.promptText}

## 수험생 답안
${essay}

## 채점 요구사항
1. 각 영역별 점수와 구체적 피드백
2. 교육학 이론 사용의 정확성 평가 (잘못된 이론 적용 지적)
3. 맞춤법 오류 식별 (원문, 수정 제안, 맥락)
4. 잘한 점 3가지 이상
5. 개선할 점 3가지 이상 (이론적 보완 포인트 포함)

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
