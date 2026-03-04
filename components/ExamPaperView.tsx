"use client";

import type { ExamPaperFormat } from "@/lib/types";

interface ExamPaperViewProps {
  examFormat?: ExamPaperFormat;
  fallbackText?: string;
  difficulty: string;
}

const DIFFICULTY_LABEL: Record<string, string> = {
  basic: "기본",
  standard: "표준",
  advanced: "심화",
};

export default function ExamPaperView({
  examFormat,
  fallbackText,
  difficulty,
}: ExamPaperViewProps) {
  if (!examFormat) {
    return (
      <div className="mx-auto max-w-4xl rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-stone-800">문제</h2>
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
          {fallbackText}
        </div>
      </div>
    );
  }

  return (
    <div
      data-exam-paper
      className="mx-auto max-w-4xl border-2 border-stone-800 bg-white shadow-2xl"
    >
      {/* 헤더 */}
      <div className="border-b-4 border-double border-stone-800 px-8 py-6 text-center">
        <div className="mb-1 text-sm text-stone-500">교육부</div>
        <h1 className="text-xl font-bold tracking-wider text-stone-900">
          {examFormat.title}
        </h1>
        <div className="mt-2 text-2xl font-black tracking-[0.3em] text-stone-900">
          교 직 논 술
        </div>
      </div>

      {/* 수험 정보 */}
      <div className="flex flex-wrap items-center justify-between border-b border-stone-300 px-8 py-3 text-sm text-stone-600">
        <div className="flex gap-6">
          <span>
            수험번호:{" "}
            <span className="inline-block w-28 border-b border-stone-400" />
          </span>
          <span>
            성명:{" "}
            <span className="inline-block w-20 border-b border-stone-400" />
          </span>
        </div>
        <div className="flex gap-6">
          <span>시험 시간: 60분</span>
          <span>배점: 20점</span>
          <span className="rounded bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500">
            난이도: {DIFFICULTY_LABEL[difficulty] ?? difficulty}
          </span>
        </div>
      </div>

      {/* 본문 */}
      <div className="px-8 py-6">
        {/* 주제 */}
        <div className="mb-6 rounded border border-stone-200 bg-stone-50 px-4 py-3">
          <span className="text-xs font-semibold text-stone-500">주제</span>
          <p className="mt-1 text-sm font-medium text-stone-800">
            {examFormat.topic}
          </p>
        </div>

        {/* 제시문 */}
        <div className="mb-6">
          <h3 className="mb-3 border-b border-stone-200 pb-1 text-sm font-bold text-stone-800">
            제시문
          </h3>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
            {examFormat.scenario}
          </div>
        </div>

        {/* 하위 문항 */}
        <div className="mb-6 rounded-lg border-2 border-stone-700 bg-stone-50 p-5">
          <p className="mb-3 font-semibold text-stone-900">
            {examFormat.subQuestions.instruction}
          </p>
          <ul className="space-y-2">
            {examFormat.subQuestions.items.map((item, i) => (
              <li key={i} className="text-sm leading-relaxed text-stone-800">
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* 배점 기준 */}
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-bold text-stone-800">배점 기준</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded border border-stone-200 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-stone-700">
                  논술의 내용
                </span>
                <span className="text-sm font-bold text-stone-900">
                  [{examFormat.scoring.content.total}점]
                </span>
              </div>
              <ul className="space-y-1">
                {examFormat.scoring.content.items.map((item, i) => (
                  <li
                    key={i}
                    className="flex justify-between text-xs text-stone-600"
                  >
                    <span>- {item.label}</span>
                    <span>{item.score}점</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded border border-stone-200 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-stone-700">
                  논술의 구성 및 표현
                </span>
                <span className="text-sm font-bold text-stone-900">
                  [{examFormat.scoring.structure.total}점]
                </span>
              </div>
              <ul className="space-y-1">
                {examFormat.scoring.structure.items.map((item, i) => (
                  <li
                    key={i}
                    className="flex justify-between text-xs text-stone-600"
                  >
                    <span>- {item.label}</span>
                    <span>{item.score}점</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* 유의사항 */}
        {examFormat.notes.length > 0 && (
          <div className="rounded border border-amber-200 bg-amber-50 p-4">
            <h3 className="mb-2 text-sm font-bold text-amber-800">
              ※ 답안 작성 시 유의 사항
            </h3>
            <ul className="space-y-1">
              {examFormat.notes.map((note, i) => (
                <li key={i} className="text-xs text-amber-700">
                  {i + 1}. {note}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
