"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface ExamSummary {
  year: number;
  topic: string;
}

import type { ExamCommentary as Commentary } from "@/lib/types";

type TabKey =
  | "pdf"
  | "modelAnswer"
  | "explanation"
  | "pedagogy"
  | "references"
  | "annotations";

const TABS: { key: TabKey; label: string; shortLabel: string; icon: string }[] = [
  { key: "pdf", label: "원본 시험지", shortLabel: "시험지", icon: "📄" },
  { key: "modelAnswer", label: "모범 답안", shortLabel: "모범답안", icon: "📝" },
  { key: "explanation", label: "문제 해설", shortLabel: "해설", icon: "💡" },
  { key: "pedagogy", label: "교육학적 설명", shortLabel: "이론", icon: "📚" },
  { key: "references", label: "참고문헌", shortLabel: "참고", icon: "🔗" },
  { key: "annotations", label: "첨삭 해설", shortLabel: "첨삭", icon: "✏️" },
];

export default function ExamsPage() {
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [commentary, setCommentary] = useState<Commentary | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("pdf");
  const [loading, setLoading] = useState(true);
  const [commentaryLoading, setCommentaryLoading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const cacheRef = useRef<Record<number, Commentary>>({});
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch("/api/exams")
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      })
      .then((data) => {
        setExams(data.map((e: ExamSummary) => ({ year: e.year, topic: e.topic })));
      })
      .catch(() => {
        setExams([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const fetchCommentary = useCallback(async (year: number) => {
    if (cacheRef.current[year]) {
      setCommentary(cacheRef.current[year]);
      return;
    }
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setCommentaryLoading(true);
    try {
      const r = await fetch(`/api/exams?commentary=${year}`, { signal: controller.signal });
      if (!r.ok) throw new Error("fetch failed");
      const data: Commentary = await r.json();
      if (!data.modelAnswer) throw new Error("invalid data");
      cacheRef.current[year] = data;
      setCommentary(data);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setCommentary(null);
    } finally {
      if (!controller.signal.aborted) {
        setCommentaryLoading(false);
      }
    }
  }, []);

  function selectYear(year: number) {
    if (abortRef.current) abortRef.current.abort();
    setSelectedYear(year);
    // 탭이 pdf가 아닌 경우 현재 탭 유지, pdf면 유지
    if (activeTab !== "pdf") {
      // 해설 데이터가 캐시에 있으면 바로 설정, 없으면 fetch
      if (cacheRef.current[year]) {
        setCommentary(cacheRef.current[year]);
      } else {
        setCommentary(null);
        fetchCommentary(year);
      }
    } else {
      setCommentary(cacheRef.current[year] ?? null);
    }
    setCommentaryLoading(false);
  }

  // 연도 선택 시 스크롤
  useEffect(() => {
    if (selectedYear) {
      contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedYear]);

  function handleTabClick(key: TabKey) {
    setActiveTab(key);
    if (key !== "pdf" && selectedYear && (!commentary || commentary.year !== selectedYear) && !commentaryLoading) {
      fetchCommentary(selectedYear);
    }
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

      {exams.length === 0 && (
        <div className="py-8 text-center text-stone-400">
          기출문제 데이터를 불러올 수 없습니다. 페이지를 새로고침해 주세요.
        </div>
      )}

      {/* 연도 선택 그리드 */}
      <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4">
        {exams.map((exam) => (
          <button
            key={exam.year}
            onClick={() => selectYear(exam.year)}
            className={`rounded-lg border-2 p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
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
                  ? "text-white"
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
        <div ref={contentRef} className="flex flex-col gap-4 scroll-mt-4">
          {/* 헤더 */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-bold text-stone-800">
              {selectedYear}학년도 교직논술
            </h2>
            <a
              href={`/exams/${selectedYear}.pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700 sm:px-4 sm:py-2 sm:text-sm"
            >
              PDF 새 탭에서 열기
            </a>
          </div>

          {/* 탭 네비게이션 */}
          <div
            role="tablist"
            className="flex flex-wrap gap-1 rounded-xl border border-stone-200 bg-stone-100 p-1"
          >
            {TABS.map((tab) => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={activeTab === tab.key}
                aria-label={tab.label}
                onClick={() => handleTabClick(tab.key)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 sm:px-3 ${
                  activeTab === tab.key
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-stone-600 hover:bg-white/50 hover:text-stone-700"
                }`}
              >
                <span className="text-base">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="text-xs sm:hidden">{tab.shortLabel}</span>
              </button>
            ))}
          </div>

          {/* 탭 콘텐츠 */}
          <div role="tabpanel" className="rounded-xl border border-stone-200 bg-white shadow-sm">
            {activeTab === "pdf" && (
              <div className="relative">
                <iframe
                  key={selectedYear}
                  src={`/exams/${selectedYear}.pdf`}
                  className="h-[75vh] w-full rounded-xl"
                  title={`${selectedYear}학년도 교직논술`}
                />
                <div className="absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-white/80 to-transparent p-4">
                  <a
                    href={`/exams/${selectedYear}.pdf`}
                    download
                    className="rounded-lg bg-stone-700 px-4 py-2 text-xs font-medium text-white transition hover:bg-stone-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-500"
                  >
                    PDF가 표시되지 않으면 다운로드
                  </a>
                </div>
              </div>
            )}

            {activeTab !== "pdf" && commentaryLoading && (
              <div className="flex h-64 items-center justify-center text-stone-400">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-200 border-t-emerald-600" />
                  <span>해설을 불러오는 중...</span>
                </div>
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

/* ---------- 헬퍼 ---------- */

/** 텍스트를 문단으로 분리하고, "첫째", "둘째" 등 논점 마커를 강조 */
function FormattedText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  let paragraphs = text.split("\n\n").filter(Boolean);
  if (paragraphs.length <= 1) {
    paragraphs = text.split("\n").filter(Boolean);
  }
  const markerRe = /^(첫째|둘째|셋째|넷째|다섯째|여섯째|마지막으로)(,|\.|\s)/;

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {paragraphs.map((p, i) => {
        const match = p.match(markerRe);
        if (match) {
          return (
            <p key={i} className="text-sm leading-loose text-stone-800">
              <strong className="text-emerald-700">{match[1]}</strong>
              {p.slice(match[1].length)}
            </p>
          );
        }
        return (
          <p key={i} className="text-sm leading-loose text-stone-800">
            {p}
          </p>
        );
      })}
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
        <FormattedText text={commentary.modelAnswer} />
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
      <FormattedText
        text={commentary.problemExplanation}
        className="text-stone-700"
      />
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
          <p className="text-xs text-stone-400">
            관련 교육학 이론과 개념의 학술적 배경
          </p>
        </div>
      </div>
      <FormattedText
        text={commentary.pedagogicalBackground}
        className="text-stone-700"
      />
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
            className="overflow-hidden rounded-lg border border-stone-200"
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
