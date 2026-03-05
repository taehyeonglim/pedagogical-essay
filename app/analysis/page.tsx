import type { Metadata } from "next";
import { getAnalysis } from "@/lib/knowledge-base";
import AnalysisClient from "./AnalysisClient";

export const metadata: Metadata = {
  title: "출제 패턴 분석 | 교직논술 연습",
  description: "2015~2026학년도 12개년 기출문제를 교육학 영역별·이론별로 종합 분석합니다.",
};

export default function AnalysisPage() {
  const data = getAnalysis();
  return <AnalysisClient data={data} />;
}
