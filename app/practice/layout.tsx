import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "모의 연습 | 교직논술 연습",
  description: "AI가 출제한 모의 문제로 교직논술을 작성하고 즉시 채점받습니다.",
};

export default function PracticeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
