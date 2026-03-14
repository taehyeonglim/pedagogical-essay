import type { GeneratedQuestion } from "@/lib/types";

export function buildUnsignedQuestion(): Omit<GeneratedQuestion, "id" | "auth"> {
  return {
    promptText: "학교 현장에서 생활지도를 강화하기 위한 방안을 논하시오.",
    referenceMaterials: ["생활지도 관련 사례"],
    expectedStructure: {
      hasIntroScenario: true,
      numberOfSubQuestions: 3,
      referenceMaterialCount: 1,
      wordLimit: 1200,
    },
    difficulty: "standard",
    targetTheories: ["생활지도 이론"],
    targetDomain: "생활지도",
    examFormat: {
      title: "2026학년도 초등학교 교직논술",
      topic: "생활지도 강화 방안",
      scenario: "교사들이 생활지도 개선 방안을 논의하는 상황이다.",
      subQuestions: {
        instruction: "위 사례를 바탕으로 논하시오. [총 20점]",
        items: [
          "1) 문제 원인을 분석하시오. [5점]",
          "2) 관련 이론을 적용하시오. [5점]",
          "3) 실행 방안을 제시하시오. [5점]",
        ],
      },
      scoring: {
        content: {
          total: 15,
          items: [{ label: "내용 충실도", score: 15 }],
        },
        structure: {
          total: 5,
          items: [{ label: "구성 및 표현", score: 5 }],
        },
      },
      notes: ["답안은 2매 이내로 작성"],
    },
  };
}
