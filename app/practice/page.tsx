"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { GeneratedQuestion, GradeResult } from "@/lib/types";

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

  const handleSubmit = async () => {
    if (!question) return;
    if (essay.length < 100) {
      alert("최소 100자 이상 작성해주세요.");
      return;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setStep("grading");
    setLoading(true);

    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ essay, question }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
      setStep("result");
    } catch (e) {
      alert(e instanceof Error ? e.message : "채점에 실패했습니다.");
      setStep("writing");
    } finally {
      setLoading(false);
    }
  };

  if (step === "setup") {
    return (
      <div className="flex flex-col items-center gap-8 py-16">
        <h1 className="text-2xl font-bold">모의 논술 연습</h1>
        <p className="text-gray-500">난이도를 선택하고 모의 문제를 생성하세요.</p>

        <div className="flex gap-3">
          {(["basic", "standard", "advanced"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`rounded-lg border px-6 py-3 text-sm font-medium transition ${
                difficulty === d
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              {d === "basic" ? "기본" : d === "standard" ? "표준" : "심화"}
            </button>
          ))}
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="rounded-lg bg-blue-600 px-8 py-3 text-white transition hover:bg-blue-700 disabled:opacity-50"
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
          <h1 className="text-xl font-bold">모의 논술 작성</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{essay.length}자</span>
            <span
              className={`rounded-lg px-4 py-2 font-mono text-lg font-bold ${
                timeLeft < 600 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
              }`}
            >
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 font-semibold text-gray-900">문제</h2>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
            {question.promptText}
          </div>
        </div>

        <textarea
          value={essay}
          onChange={(e) => setEssay(e.target.value)}
          placeholder="여기에 논술을 작성하세요..."
          className="min-h-[500px] w-full rounded-xl border border-gray-200 bg-white p-6 text-sm leading-relaxed focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />

        <div className="flex justify-end gap-3">
          <button
            onClick={() => {
              if (timerRef.current) clearInterval(timerRef.current);
              setStep("setup");
              setEssay("");
              setQuestion(null);
            }}
            className="rounded-lg border border-gray-200 px-6 py-3 text-sm text-gray-600 transition hover:bg-gray-50"
          >
            포기하기
          </button>
          <button
            onClick={handleSubmit}
            className="rounded-lg bg-blue-600 px-8 py-3 text-sm text-white transition hover:bg-blue-700"
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        <p className="text-gray-500">AI가 논술을 채점하고 있습니다...</p>
      </div>
    );
  }

  if (step === "result" && result) {
    return (
      <div className="flex flex-col gap-8">
        <h1 className="text-2xl font-bold">채점 결과</h1>

        <div className="rounded-xl border border-gray-200 bg-white p-8">
          <div className="text-center">
            <div className="text-5xl font-bold text-blue-700">{result.overallScore}</div>
            <div className="mt-1 text-gray-500">/ 20점</div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { label: "내용", data: result.breakdown.content },
              { label: "논리", data: result.breakdown.logic },
              { label: "표현", data: result.breakdown.expression },
            ].map(({ label, data }) => (
              <div key={label} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium text-gray-600">{label}</span>
                  <span className="text-lg font-bold text-gray-900">
                    {data.score}/{data.maxScore}
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-500">{data.feedback}</p>
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
                  <span className="font-medium text-green-700">{issue.suggestion}</span>
                  <span className="ml-2 text-xs text-gray-500">({issue.context})</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-green-200 bg-green-50 p-6">
            <h3 className="font-semibold text-green-800">잘한 점</h3>
            <ul className="mt-3 space-y-1 text-sm text-green-700">
              {result.strengths.map((s, i) => (
                <li key={i}>• {s}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-6">
            <h3 className="font-semibold text-orange-800">개선할 점</h3>
            <ul className="mt-3 space-y-1 text-sm text-orange-700">
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
          className="self-center rounded-lg bg-blue-600 px-8 py-3 text-white transition hover:bg-blue-700"
        >
          다시 연습하기
        </button>
      </div>
    );
  }

  return null;
}
