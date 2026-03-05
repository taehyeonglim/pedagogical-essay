"use client";

import { useState, useEffect } from "react";

interface ExamSummary {
  year: number;
  topic: string;
}

interface Commentary {
  year: number;
  modelAnswer: string;
  problemExplanation: string;
  pedagogicalBackground: string;
  references: { title: string; url: string }[];
  sentenceAnnotations: { sentence: string; annotation: string }[];
}

type TabKey =
  | "pdf"
  | "modelAnswer"
  | "explanation"
  | "pedagogy"
  | "references"
  | "annotations";

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "pdf", label: "원본 시험지", icon: "📄" },
  { key: "modelAnswer", label: "모범 답안", icon: "📝" },
  { key: "explanation", label: "문제 해설", icon: "💡" },
  { key: "pedagogy", label: "교육학적 설명", icon: "📚" },
  { key: "references", label: "참고문헌", icon: "🔗" },
  { key: "annotations", label: "첨삭 해설", icon: "✏️" },
];

export default function ExamsPage() {
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [commentary, setCommentary] = useState<Commentary | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("pdf");
  const [loading, setLoading] = useState(true);
  const [commentaryLoading, setCommentaryLoading] = useState(false);

  useEffect(() => {
    fetch("/api/exams")
      .then((r) => r.json())
      .then((data) => {
        setExams(data.map((e: ExamSummary) => ({ year: e.year, topic: e.topic })));
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!selectedYear) return;
    setCommentaryLoading(true);
    fetch(`/api/exams?commentary=${selectedYear}`)
      .then((r) => r.json())
      .then((data) => {
        setCommentary(data);
        setCommentaryLoading(false);
      })
      .catch(() => setCommentaryLoading(false));
  }, [selectedYear]);

  function selectYear(year: number) {
    setSelectedYear(year);
    setActiveTab("pdf");
    setCommentary(null);
  }

  if (loading) {
    return (
      <div className="py-16 text-center text-stone-500">
        기출문제를 불러오는 중...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold text-stone-800">
        기출문제 열람 및 해설
      </h1>

      {/* 연도 선택 그리드 */}
      <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4">
        {exams.map((exam) => (
          <button
            key={exam.year}
            onClick={() => selectYear(exam.year)}
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
                selectedYear === exam.year
                  ? "text-emerald-100"
                  : "text-stone-500"
              }`}
            >
              {exam.topic}
            </div>
          </button>
        ))}
      </div>

      {/* 선택된 연도의 컨텐츠 */}
      {selectedYear && (
        <div className="flex flex-col gap-4">
          {/* 헤더 */}
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
              PDF 새 탭에서 열기
            </a>
          </div>

          {/* 탭 네비게이션 */}
          <div className="flex flex-wrap gap-1 rounded-xl border border-stone-200 bg-stone-100 p-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  activeTab === tab.key
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-stone-500 hover:bg-white/50 hover:text-stone-700"
                }`}
              >
                <span className="text-base">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* 탭 콘텐츠 */}
          <div className="min-h-[60vh] rounded-xl border border-stone-200 bg-white shadow-sm">
            {activeTab === "pdf" && (
              <iframe
                key={selectedYear}
                src={`/exams/${selectedYear}.pdf`}
                className="h-[75vh] w-full rounded-xl"
                title={`${selectedYear}학년도 교직논술`}
              />
            )}

            {activeTab !== "pdf" && commentaryLoading && (
              <div className="flex h-64 items-center justify-center text-stone-400">
                해설을 불러오는 중...
              </div>
            )}

            {activeTab !== "pdf" && !commentaryLoading && !commentary && (
              <div className="flex h-64 items-center justify-center text-stone-400">
                해설 데이터가 없습니다.
              </div>
            )}

            {activeTab === "modelAnswer" && commentary && (
              <ModelAnswerTab commentary={commentary} />
            )}

            {activeTab === "explanation" && commentary && (
              <ExplanationTab commentary={commentary} />
            )}

            {activeTab === "pedagogy" && commentary && (
              <PedagogyTab commentary={commentary} />
            )}

            {activeTab === "references" && commentary && (
              <ReferencesTab commentary={commentary} />
            )}

            {activeTab === "annotations" && commentary && (
              <AnnotationsTab commentary={commentary} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- 탭 컴포넌트들 ---------- */

function ModelAnswerTab({ commentary }: { commentary: Commentary }) {
  return (
    <div className="p-6 sm:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-xl">
          📝
        </div>
        <div>
          <h3 className="text-lg font-bold text-stone-800">모범 답안</h3>
          <p className="text-xs text-stone-400">
            {commentary.year}학년도 교직논술 모범 답안
          </p>
        </div>
      </div>
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-6">
        <div className="whitespace-pre-wrap text-[15px] leading-[1.9] text-stone-800">
          {commentary.modelAnswer}
        </div>
      </div>
    </div>
  );
}

function ExplanationTab({ commentary }: { commentary: Commentary }) {
  return (
    <div className="p-6 sm:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-xl">
          💡
        </div>
        <div>
          <h3 className="text-lg font-bold text-stone-800">문제 해설</h3>
          <p className="text-xs text-stone-400">출제 의도와 핵심 요구사항 분석</p>
        </div>
      </div>
      <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-stone-700">
        {commentary.problemExplanation}
      </div>
    </div>
  );
}

function PedagogyTab({ commentary }: { commentary: Commentary }) {
  return (
    <div className="p-6 sm:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-xl">
          📚
        </div>
        <div>
          <h3 className="text-lg font-bold text-stone-800">교육학적 설명</h3>
          <p className="text-xs text-stone-400">관련 교육학 이론과 개념의 학술적 배경</p>
        </div>
      </div>
      <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-stone-700">
        {commentary.pedagogicalBackground}
      </div>
    </div>
  );
}

function ReferencesTab({ commentary }: { commentary: Commentary }) {
  return (
    <div className="p-6 sm:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-xl">
          🔗
        </div>
        <div>
          <h3 className="text-lg font-bold text-stone-800">참고문헌</h3>
          <p className="text-xs text-stone-400">
            심화 학습을 위한 참고 자료 링크
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {commentary.references.map((ref, i) => (
          <a
            key={i}
            href={ref.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-3 rounded-lg border border-stone-200 bg-stone-50 p-4 transition hover:border-blue-300 hover:bg-blue-50"
          >
            <span className="mt-0.5 text-blue-500 transition group-hover:text-blue-600">
              ↗
            </span>
            <div>
              <div className="text-sm font-medium text-stone-800 group-hover:text-blue-700">
                {ref.title}
              </div>
              <div className="mt-1 truncate text-xs text-stone-400">
                {ref.url}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function AnnotationsTab({ commentary }: { commentary: Commentary }) {
  return (
    <div className="p-6 sm:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-xl">
          ✏️
        </div>
        <div>
          <h3 className="text-lg font-bold text-stone-800">문장별 첨삭 해설</h3>
          <p className="text-xs text-stone-400">
            모범 답안의 각 부분을 왜 그렇게 작성해야 하는지 꼼꼼한 해설
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        {commentary.sentenceAnnotations.map((item, i) => (
          <div
            key={i}
            className="rounded-lg border border-stone-200 overflow-hidden"
          >
            <div className="border-b border-stone-200 bg-stone-50 px-5 py-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                  {i + 1}
                </span>
                <p className="text-sm font-medium leading-relaxed text-stone-800">
                  {item.sentence}
                </p>
              </div>
            </div>
            <div className="bg-white px-5 py-3">
              <p className="pl-9 text-sm leading-relaxed text-stone-600">
                {item.annotation}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
