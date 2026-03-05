"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { GeneratedQuestion, GradeResult } from "@/lib/types";
import ExamPaperView from "@/components/ExamPaperView";

const DURATION_SECONDS = 60 * 60;
const STORAGE_KEY = "practice-draft";
const AUTOSAVE_INTERVAL = 10_000;

interface DraftData {
  essay: string;
  question: GeneratedQuestion;
  endTime: number;
}

function loadDraft(): DraftData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as DraftData;
    if (!data.essay || !data.question || !data.endTime) return null;
    if (Date.now() - data.endTime > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function saveDraft(essay: string, question: GeneratedQuestion, endTime: number) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ essay, question, endTime }));
  } catch { /* ignore */ }
}

function clearDraft() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

export default function PracticePage() {
  const [step, setStep] = useState<"setup" | "writing" | "grading" | "result">("setup");
  const [difficulty, setDifficulty] = useState<"basic" | "standard" | "advanced">("standard");
  const [question, setQuestion] = useState<GeneratedQuestion | null>(null);
  const [essay, setEssay] = useState("");
  const [result, setResult] = useState<GradeResult | null>(null);
  const [timeLeft, setTimeLeft] = useState(DURATION_SECONDS);
  const [loading, setLoading] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endTimeRef = useRef<number>(0);
  const autoSubmittedRef = useRef(false);

  useEffect(() => {
    const draft = loadDraft();
    if (draft) setHasDraft(true);
  }, []);

  const startTimer = useCallback((endTime?: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    endTimeRef.current = endTime ?? Date.now() + DURATION_SECONDS * 1000;
    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0 && timerRef.current) {
        clearInterval(timerRef.current);
      }
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // beforeunload 보호
  useEffect(() => {
    if (step !== "writing" || !essay) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [step, essay]);

  // 자동 저장
  useEffect(() => {
    if (step !== "writing" || !question) return;
    const id = setInterval(() => {
      saveDraft(essay, question, endTimeRef.current);
    }, AUTOSAVE_INTERVAL);
    return () => clearInterval(id);
  }, [step, essay, question]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleRecover = () => {
    const draft = loadDraft();
    if (!draft) return;
    setQuestion(draft.question);
    setEssay(draft.essay);
    const remaining = Math.max(0, Math.round((draft.endTime - Date.now()) / 1000));
    setTimeLeft(remaining);
    setStep("writing");
    setHasDraft(false);
    if (remaining > 0) {
      autoSubmittedRef.current = false;
      startTimer(draft.endTime);
    } else {
      autoSubmittedRef.current = true;
    }
  };

  const handleDismissDraft = () => {
    clearDraft();
    setHasDraft(false);
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/questions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty }),
      });
      if (!res.ok) throw new Error("문제 생성 요청 실패");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setQuestion(data);
      setStep("writing");
      setTimeLeft(DURATION_SECONDS);
      autoSubmittedRef.current = false;
      startTimer();
    } catch (e) {
      alert(e instanceof Error ? e.message : "문제 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const submitForGrading = useCallback(
    async (essayText: string, q: GeneratedQuestion, isAutoSubmit = false) => {
      if (timerRef.current) clearInterval(timerRef.current);
      clearDraft();
      setStep("grading");
      setLoading(true);
      try {
        const res = await fetch("/api/grade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ essay: essayText, question: q }),
        });
        if (!res.ok) throw new Error("채점 요청 실패");
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setResult(data);
        setStep("result");
      } catch (e) {
        alert(e instanceof Error ? e.message : "채점에 실패했습니다.");
        setStep("writing");
        if (!isAutoSubmit) {
          startTimer(endTimeRef.current);
        }
      } finally {
        setLoading(false);
      }
    },
    [startTimer]
  );

  const handleSubmit = () => {
    if (!question || loading) return;
    if (essay.length < 100) {
      alert("최소 100자 이상 작성해주세요.");
      return;
    }
    submitForGrading(essay, question);
  };

  // 타이머 만료 시 자동 제출
  useEffect(() => {
    if (timeLeft > 0 || step !== "writing" || autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    if (question && essay.length >= 100) {
      submitForGrading(essay, question, true);
    } else {
      alert("시간이 종료되었습니다. 제출 및 채점 버튼을 눌러 수동 제출해 주세요.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  if (step === "setup") {
    return (
      <div className="flex flex-col items-center gap-8 py-16">
        <h1 className="text-2xl font-bold text-stone-800">모의 논술 연습</h1>
        <p className="text-stone-500">난이도를 선택하고 모의 문제를 생성하세요.</p>

        {hasDraft && (
          <div className="w-full max-w-md rounded-xl border border-amber-300 bg-amber-50 p-5">
            <p className="text-sm font-medium text-amber-800">이전에 작성 중이던 답안이 있습니다.</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleRecover}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700"
              >
                이어서 작성
              </button>
              <button
                onClick={handleDismissDraft}
                className="rounded-lg border border-amber-300 px-4 py-2 text-sm text-amber-700 transition hover:bg-amber-100"
              >
                삭제
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-3" role="radiogroup" aria-label="난이도 선택">
          {(["basic", "standard", "advanced"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              role="radio"
              aria-checked={difficulty === d}
              className={`rounded-lg border-2 px-6 py-4 text-sm font-medium transition ${
                difficulty === d
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm"
                  : "border-stone-200 bg-white text-stone-600 hover:border-emerald-300 hover:bg-emerald-50/50"
              }`}
            >
              {d === "basic" ? "기본" : d === "standard" ? "표준" : "심화"}
            </button>
          ))}
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="rounded-lg bg-emerald-600 px-8 py-4 font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? "문제 생성 중..." : "문제 생성하기"}
        </button>
      </div>
    );
  }

  if (step === "writing" && question) {
    const charColor = essay.length < 1000 ? "text-stone-400" : essay.length > 1800 ? "text-amber-600" : "text-emerald-600";
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-bold text-stone-800">모의 논술 작성</h1>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className={`text-sm ${charColor}`}>
              {essay.length}자
              <span className="ml-1 hidden text-xs text-stone-400 sm:inline">(권장 1,000~1,800자)</span>
            </span>
            <span
              role="timer"
              aria-label={`남은 시간 ${formatTime(timeLeft)}`}
              className={`rounded-lg px-3 py-1.5 font-mono text-base font-bold sm:px-4 sm:py-2 sm:text-lg ${
                timeLeft < 600
                  ? "bg-red-100 text-red-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>

        <div className="flex justify-end" data-print-hide>
          <button
            onClick={() => window.print()}
            className="rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-600 transition hover:bg-stone-50"
          >
            PDF로 저장
          </button>
        </div>

        <ExamPaperView
          examFormat={question.examFormat}
          fallbackText={question.promptText}
          difficulty={question.difficulty}
        />

        <textarea
          value={essay}
          onChange={(e) => setEssay(e.target.value)}
          placeholder="여기에 논술을 작성하세요..."
          className="min-h-[60vh] w-full rounded-xl border border-stone-200 bg-white p-6 text-sm leading-relaxed focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
        />

        <div className="flex justify-end gap-3">
          <button
            onClick={() => {
              if (!confirm("정말 포기하시겠습니까? 작성 중인 답안이 삭제됩니다.")) return;
              if (timerRef.current) clearInterval(timerRef.current);
              clearDraft();
              setStep("setup");
              setEssay("");
              setQuestion(null);
            }}
            className="rounded-lg border border-stone-200 px-6 py-4 text-sm text-stone-600 transition hover:bg-stone-50"
          >
            포기하기
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-lg bg-amber-600 px-8 py-4 text-sm font-medium text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-50"
          >
            제출 및 채점
          </button>
        </div>
      </div>
    );
  }

  if (step === "grading") {
    return (
      <div className="flex flex-col items-center gap-4 py-32" role="status" aria-label="채점 중">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
        <p className="text-stone-500">AI가 논술을 채점하고 있습니다...</p>
      </div>
    );
  }

  if (step === "result" && result) {
    return (
      <div className="flex flex-col gap-8">
        <h1 className="text-2xl font-bold text-stone-800">채점 결과</h1>

        <div className="rounded-xl border border-stone-200 bg-white p-8 shadow-sm">
          <div className="text-center">
            <div className="text-5xl font-bold text-emerald-600">{result.overallScore}</div>
            <div className="mt-1 text-stone-500">/ 20점</div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { label: "내용", data: result.breakdown.content },
              { label: "논리", data: result.breakdown.logic },
              { label: "표현", data: result.breakdown.expression },
            ].map(({ label, data }) => (
              <div key={label} className="rounded-lg border border-stone-100 bg-stone-50 p-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium text-stone-600">{label}</span>
                  <span className="text-lg font-bold text-stone-800">
                    {data.score}/{data.maxScore}
                  </span>
                </div>
                <p className="mt-2 text-xs text-stone-500">{data.feedback}</p>
              </div>
            ))}
          </div>
        </div>

        {result.spellingIssues.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
            <h3 className="font-semibold text-amber-800">맞춤법 교정</h3>
            <ul className="mt-3 space-y-2">
              {result.spellingIssues.map((issue, i) => (
                <li key={i} className="text-sm">
                  <span className="text-red-600 line-through">{issue.original}</span>
                  {" → "}
                  <span className="font-medium text-emerald-700">{issue.suggestion}</span>
                  <span className="ml-2 text-xs text-stone-500">({issue.context})</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
            <h3 className="font-semibold text-emerald-800">잘한 점</h3>
            <ul className="mt-3 space-y-1 text-sm text-emerald-700">
              {result.strengths.map((s, i) => (
                <li key={i}>• {s}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
            <h3 className="font-semibold text-amber-800">개선할 점</h3>
            <ul className="mt-3 space-y-1 text-sm text-amber-700">
              {result.improvements.map((s, i) => (
                <li key={i}>• {s}</li>
              ))}
            </ul>
          </div>
        </div>

        {question && (
          <details className="rounded-xl border border-stone-200 bg-white shadow-sm">
            <summary className="cursor-pointer px-6 py-4 font-semibold text-stone-700 hover:text-stone-900">
              출제 문제 다시 보기
            </summary>
            <div className="border-t border-stone-100 px-6 py-4">
              <ExamPaperView
                examFormat={question.examFormat}
                fallbackText={question.promptText}
                difficulty={question.difficulty}
              />
            </div>
          </details>
        )}

        <button
          onClick={() => {
            setStep("setup");
            setEssay("");
            setQuestion(null);
            setResult(null);
            setTimeLeft(DURATION_SECONDS);
          }}
          className="self-center rounded-lg bg-emerald-600 px-8 py-4 font-medium text-white shadow-sm transition hover:bg-emerald-700"
        >
          다시 연습하기
        </button>
      </div>
    );
  }

  return null;
}
