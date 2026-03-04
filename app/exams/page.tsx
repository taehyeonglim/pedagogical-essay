"use client";

import { useState, useEffect } from "react";

interface ExamSummary {
  year: number;
  topic: string;
  subTopics: string[];
  rawMd: string;
}

export default function ExamsPage() {
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [selected, setSelected] = useState<ExamSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/exams")
      .then((r) => r.json())
      .then((data) => {
        setExams(data);
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
            onClick={() => setSelected(exam)}
            className={`rounded-lg border-2 p-4 text-left transition ${
              selected?.year === exam.year
                ? "border-emerald-500 bg-emerald-600 text-white shadow-md"
                : "border-stone-200 bg-white text-stone-800 hover:border-emerald-300 hover:bg-emerald-50"
            }`}
          >
            <div className="text-lg font-semibold">
              {selected?.year === exam.year ? "✓ " : ""}
              {exam.year}학년도
            </div>
            <div
              className={`mt-1 text-xs line-clamp-2 ${
                selected?.year === exam.year ? "text-emerald-100" : "text-stone-500"
              }`}
            >
              {exam.topic}
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="rounded-xl border border-stone-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-bold text-stone-800">{selected.year}학년도 교직논술</h2>
          <div className="mt-2 text-sm font-medium text-emerald-600">{selected.topic}</div>
          <div className="prose prose-sm prose-stone mt-6 max-w-none whitespace-pre-wrap leading-relaxed text-stone-700">
            {selected.rawMd}
          </div>
        </div>
      )}
    </div>
  );
}
