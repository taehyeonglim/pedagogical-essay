"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { GeneratedQuestion, GradeResult } from "@/lib/types";
import ExamPaperView from "@/components/ExamPaperView";

export default function PracticePage() {
  const [step, setStep] = useState<"setup" | "writing" | "grading" | "result">("setup");
  const [difficulty, setDifficulty] = useState<"basic" | "standard" | "advanced">("standard");
  const [question, setQuestion] = useState<GeneratedQuestion | null>(null);
  const [essay, setEssay] = useState("");
  const [result, setResult] = useState<GradeResult | null>(null);
  const [timeLeft, setTimeLeft] = useState(90 * 60);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
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
      setTimeLeft(90 * 60);
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
        if (isAutoSubmit) {
          setStep("setup");
          setEssay("");
          setQuestion(null);
        } else {
          setStep("writing");
          startTimer();
        }
      } finally {
        setLoading(false);
      }
    },
    [startTimer]
  );

  const handleSubmit = () => {
    if (!question) return;
    if (essay.length < 100) {
      alert("최소 100자 이상 작성해주세요.");
      return;
    }
    submitForGrading(essay, question);
  };

  // 타이머 만료 시 자동 제출
  useEffect(() => {
    if (timeLeft > 0 || step !== "writing") return;
    if (question && essay.length >= 100) {
      submitForGrading(essay, question, true);
    } else {
      alert("시간이 종료되었습니다.");
      setStep("setup");
      setEssay("");
      setQuestion(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  if (step === "setup") {
    return (
      <div className="flex flex-col items-center gap-8 py-16">
        <h1 className="text-2xl font-bold text-stone-800">✍️ 모의 논술 연습</h1>
        <p className="text-stone-500">난이도를 선택하고 모의 문제를 생성하세요.</p>

        <div className="flex gap-3">
          {(["basic", "standard", "advanced"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
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
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-stone-800">모의 논술 작성</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-stone-500">{essay.length}자</span>
            <span
              className={`rounded-lg px-4 py-2 font-mono text-lg font-bold ${
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
            className="rounded-lg bg-amber-600 px-8 py-4 text-sm font-medium text-white shadow-sm transition hover:bg-amber-700"
          >
            제출 및 채점
          </button>
        </div>
      </div>
    );
  }

  if (step === "grading") {
    return (
      <div className="flex flex-col items-center gap-4 py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
        <p className="text-stone-500">AI가 논술을 채점하고 있습니다...</p>
      </div>
    );
  }

  if (step === "result" && result) {
    return (
      <div className="flex flex-col gap-8">
        <h1 className="text-2xl font-bold text-stone-800">📊 채점 결과</h1>

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

        <button
          onClick={() => {
            setStep("setup");
            setEssay("");
            setQuestion(null);
            setResult(null);
            setTimeLeft(90 * 60);
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
