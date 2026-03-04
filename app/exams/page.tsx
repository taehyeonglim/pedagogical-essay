"use client";

import { useState, useEffect } from "react";

interface ExamSummary {
  year: number;
  topic: string;
}

export default function ExamsPage() {
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/exams")
      .then((r) => r.json())
      .then((data) => {
        setExams(data.map((e: ExamSummary) => ({ year: e.year, topic: e.topic })));
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="py-16 text-center text-stone-500">기출문제를 불러오는 중...</div>;
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold text-stone-800">📖 기출문제 열람</h1>

      <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4">
        {exams.map((exam) => (
          <button
            key={exam.year}
            onClick={() => setSelectedYear(exam.year)}
            className={`rounded-lg border-2 p-4 text-left transition ${
              selectedYear === exam.year
                ? "border-emerald-500 bg-emerald-600 text-white shadow-md"
                : "border-stone-200 bg-white text-stone-800 hover:border-emerald-300 hover:bg-emerald-50"
            }`}
          >
            <div className="text-lg font-semibold">
              {selectedYear === exam.year ? "✓ " : ""}
              {exam.year}학년도
            </div>
            <div
              className={`mt-1 text-xs line-clamp-2 ${
                selectedYear === exam.year ? "text-emerald-100" : "text-stone-500"
              }`}
            >
              {exam.topic}
            </div>
          </button>
        ))}
      </div>

      {selectedYear && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-stone-800">
              {selectedYear}학년도 교직논술
            </h2>
            <a
              href={`/exams/${selectedYear}.pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              새 탭에서 열기
            </a>
          </div>
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            <iframe
              key={selectedYear}
              src={`/exams/${selectedYear}.pdf`}
              className="h-[75vh] w-full"
              title={`${selectedYear}학년도 교직논술`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
