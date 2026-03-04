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
    return <div className="py-16 text-center text-gray-500">기출문제를 불러오는 중...</div>;
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold">기출문제 열람</h1>

      <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4">
        {exams.map((exam) => (
          <button
            key={exam.year}
            onClick={() => setSelected(exam)}
            className={`rounded-lg border p-4 text-left transition hover:border-blue-300 ${
              selected?.year === exam.year
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 bg-white"
            }`}
          >
            <div className="text-lg font-semibold">{exam.year}학년도</div>
            <div className="mt-1 text-xs text-gray-500 line-clamp-2">{exam.topic}</div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="rounded-xl border border-gray-200 bg-white p-8">
          <h2 className="text-xl font-bold">{selected.year}학년도 교직논술</h2>
          <div className="mt-2 text-sm text-blue-600">{selected.topic}</div>
          <div className="prose prose-sm mt-6 max-w-none whitespace-pre-wrap text-gray-700">
            {selected.rawMd}
          </div>
        </div>
      )}
    </div>
  );
}
