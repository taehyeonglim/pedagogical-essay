import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "기출 열람 및 해설 | 교직논술 연습",
  description: "2015~2026학년도 초등 임용 교직논술 기출문제와 모범 답안, 문장별 첨삭 해설을 확인합니다.",
};

export default function ExamsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
