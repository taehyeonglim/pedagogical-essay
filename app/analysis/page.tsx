import type { Metadata } from "next";
import { getAnalysis } from "@/lib/knowledge-base";
import AnalysisClient from "./AnalysisClient";

export const metadata: Metadata = {
  title: "출제 패턴 분석 | 교직논술 연습",
  description: "2015~2026학년도 12개년 기출문제를 교육학 영역별·이론별로 종합 분석합니다.",
};

export default function AnalysisPage() {
  try {
    const data = getAnalysis();
    return <AnalysisClient data={data} />;
  } catch {
    return (
      <div className="py-16 text-center">
        <h1 className="text-xl font-bold text-stone-800">출제 패턴 분석</h1>
        <p className="mt-4 text-stone-500">분석 데이터를 불러올 수 없습니다. 페이지를 새로고침해 주세요.</p>
      </div>
    );
  }
}
