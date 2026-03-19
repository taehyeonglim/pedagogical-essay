"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { QUESTION_DURATION_MS, normalizeGeneratedQuestion } from "@/lib/generated-question";
import type { GeneratedQuestion, GradeResult, ScoreItem } from "@/lib/types";
import ExamPaperView from "@/components/ExamPaperView";

const DURATION_SECONDS = QUESTION_DURATION_MS / 1000;
const STORAGE_KEY = "practice-draft";
const HISTORY_KEY = "practice-history";
const AUTOSAVE_INTERVAL = 10_000;
const MAX_HISTORY = 20;

interface DraftData {
  essay: string;
  question: GeneratedQuestion;
  endTime: number;
}

function loadDraft(): DraftData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftData;
    const question = normalizeGeneratedQuestion(parsed.question);
    const endTime = typeof parsed.endTime === "number" ? parsed.endTime : question.auth.expiresAt;
    if (typeof parsed.essay !== "string") return null;
    if (Date.now() - endTime > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return { essay: parsed.essay, question, endTime };
  } catch {
    clearDraft();
    return null;
  }
}

function saveDraft(essay: string, question: GeneratedQuestion, endTime: number) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ essay, question, endTime }));
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      console.warn("[practice] localStorage 용량 초과 — 자동저장 실패");
    }
  }
}

function clearDraft() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeScoreItem(
  value: unknown,
  expectedMaxScore: number,
  fallbackFeedback: string
): ScoreItem {
  const item = isRecord(value) ? value : {};
  const score = typeof item.score === "number" && Number.isFinite(item.score)
    ? Math.max(0, Math.min(expectedMaxScore, Math.trunc(item.score)))
    : 0;
  const feedback = typeof item.feedback === "string" && item.feedback.trim()
    ? item.feedback.trim().slice(0, 1_500)
    : fallbackFeedback;

  return {
    score,
    maxScore: expectedMaxScore,
    feedback,
  };
}

function normalizeClientGradeResult(value: unknown): GradeResult {
  const result = isRecord(value) ? value : {};
  const breakdown = isRecord(result.breakdown) ? result.breakdown : {};
  const content = normalizeScoreItem(breakdown.content, 15, "내용 피드백을 불러오지 못했습니다.");
  const logic = normalizeScoreItem(breakdown.logic, 3, "논리 피드백을 불러오지 못했습니다.");
  const expression = normalizeScoreItem(breakdown.expression, 2, "표현 피드백을 불러오지 못했습니다.");

  const spellingIssues = Array.isArray(result.spellingIssues)
    ? result.spellingIssues
        .filter(isRecord)
        .slice(0, 20)
        .map((item) => ({
          original: typeof item.original === "string" ? item.original.trim().slice(0, 200) : "",
          suggestion: typeof item.suggestion === "string" ? item.suggestion.trim().slice(0, 200) : "",
          context: typeof item.context === "string" ? item.context.trim().slice(0, 500) : "",
        }))
        .filter((item) => item.original || item.suggestion || item.context)
    : [];

  const normalizeTextList = (input: unknown, fallback: string[]) =>
    Array.isArray(input)
      ? input
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 10)
      : fallback;

  const strengths = normalizeTextList(result.strengths, ["채점 결과를 참고하세요."]);
  const improvements = normalizeTextList(result.improvements, ["채점 결과를 참고하세요."]);

  return {
    overallScore: content.score + logic.score + expression.score,
    breakdown: { content, logic, expression },
    spellingIssues,
    strengths: strengths.length > 0 ? strengths : ["채점 결과를 참고하세요."],
    improvements: improvements.length > 0 ? improvements : ["채점 결과를 참고하세요."],
  };
}

interface HistoryEntry {
  id: string;
  date: string;
  difficulty: string;
  domain: string;
  score: number;
  essay: string;
  question: GeneratedQuestion;
  result: GradeResult;
}

function normalizeHistoryEntry(value: unknown): HistoryEntry | null {
  if (!isRecord(value) || typeof value.essay !== "string") return null;

  try {
    const question = normalizeGeneratedQuestion(value.question);
    const result = normalizeClientGradeResult(value.result);
    const date =
      typeof value.date === "string" && !Number.isNaN(Date.parse(value.date))
        ? value.date
        : new Date().toISOString();

    return {
      id: typeof value.id === "string" && value.id ? value.id : question.id,
      date,
      difficulty: typeof value.difficulty === "string" ? value.difficulty : question.difficulty,
      domain: typeof value.domain === "string" ? value.domain : question.targetDomain ?? "",
      score: result.overallScore,
      essay: value.essay,
      question,
      result,
    };
  } catch {
    return null;
  }
}

function saveHistory(entry: HistoryEntry) {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(parsed)
      ? parsed.map(normalizeHistoryEntry).filter((item): item is HistoryEntry => item !== null)
      : [];
    list.unshift(entry);
    if (list.length > MAX_HISTORY) list.length = MAX_HISTORY;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      console.warn("[practice] localStorage 용량 초과 — 이력 저장 실패");
    }
  }
}

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeHistoryEntry).filter((item): item is HistoryEntry => item !== null);
  } catch {
    return [];
  }
}

function getScoreColor(score: number): string {
  if (score >= 16) return "text-emerald-600";
  if (score >= 12) return "text-amber-600";
  return "text-red-600";
}

const GRADING_MESSAGES = [
  "논술 구조를 분석하고 있습니다...",
  "교육학 이론 적용도를 평가하고 있습니다...",
  "채점 기준에 따라 점수를 산정하고 있습니다...",
  "피드백을 생성하고 있습니다...",
];

export default function PracticePage() {
  const [step, setStep] = useState<"setup" | "writing" | "grading" | "result">("setup");
  const [difficulty, setDifficulty] = useState<"basic" | "standard" | "advanced">("standard");
  const [question, setQuestion] = useState<GeneratedQuestion | null>(null);
  const [essay, setEssay] = useState("");
  const [result, setResult] = useState<GradeResult | null>(null);
  const [submittedEssay, setSubmittedEssay] = useState("");
  const [timeLeft, setTimeLeft] = useState(DURATION_SECONDS);
  const [loading, setLoading] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [viewingEntry, setViewingEntry] = useState<HistoryEntry | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmingGiveUp, setConfirmingGiveUp] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [gradingMsgIndex, setGradingMsgIndex] = useState(0);
  const [lockedEssay, setLockedEssay] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endTimeRef = useRef<number>(0);
  const autoSubmittedRef = useRef(false);

  useEffect(() => {
    const draft = loadDraft();
    if (draft) setHasDraft(true);
  }, []);

  // 에러 메시지 자동 해제
  useEffect(() => {
    if (!errorMessage) return;
    const t = setTimeout(() => setErrorMessage(null), 5000);
    return () => clearTimeout(t);
  }, [errorMessage]);

  // 채점 중 메시지 순환
  useEffect(() => {
    if (step !== "grading") return;
    setGradingMsgIndex(0);
    const id = setInterval(() => {
      setGradingMsgIndex((prev) => (prev + 1) % GRADING_MESSAGES.length);
    }, 4000);
    return () => clearInterval(id);
  }, [step]);

  const startTimer = useCallback((endTime?: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    endTimeRef.current = endTime ?? Date.now() + DURATION_SECONDS * 1000;
    setTimeLeft(Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000)));
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

  // 자동 저장 (ref 기반)
  const essayRef = useRef(essay);
  const questionRef = useRef(question);
  essayRef.current = essay;
  questionRef.current = question;

  useEffect(() => {
    if (step !== "writing" || !questionRef.current) return;
    const id = setInterval(() => {
      if (questionRef.current) {
        saveDraft(essayRef.current, questionRef.current, endTimeRef.current);
      }
    }, AUTOSAVE_INTERVAL);
    return () => clearInterval(id);
  }, [step]);

  useEffect(() => {
    if (step !== "writing" || !questionRef.current) return;

    const persistDraft = () => {
      if (questionRef.current) {
        saveDraft(essayRef.current, questionRef.current, endTimeRef.current);
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!essayRef.current.trim()) return;
      persistDraft();
      e.preventDefault();
      e.returnValue = "";
    };

    const handlePageHide = () => {
      persistDraft();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        persistDraft();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [step]);

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
    setLockedEssay(null);
    const remaining = Math.max(0, Math.round((draft.endTime - Date.now()) / 1000));
    setTimeLeft(remaining);
    setStep("writing");
    setHasDraft(false);
    endTimeRef.current = draft.endTime;
    if (remaining > 0) {
      autoSubmittedRef.current = false;
      startTimer(draft.endTime);
    } else {
      autoSubmittedRef.current = false;
      setLockedEssay(draft.essay);
      setErrorMessage("시간이 종료된 답안입니다. 추가 작성 없이 제출만 재시도할 수 있습니다.");
    }
  };

  const handleDismissDraft = () => {
    clearDraft();
    setHasDraft(false);
  };

  const handleGenerate = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/questions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => null);
        throw new Error(typeof error?.error === "string" ? error.error : "문제 생성 요청 실패");
      }
      const data = normalizeGeneratedQuestion(await res.json());
      setQuestion(data);
      setEssay("");
      setResult(null);
      setSubmittedEssay("");
      setStep("writing");
      setConfirmingGiveUp(false);
      setLockedEssay(null);
      autoSubmittedRef.current = false;
      startTimer(data.auth.expiresAt);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "문제 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const submitForGrading = useCallback(
    async (essayText: string, q: GeneratedQuestion, isAutoSubmit = false) => {
      if (timerRef.current) clearInterval(timerRef.current);
      setStep("grading");
      setLoading(true);
      setErrorMessage(null);
      try {
        const res = await fetch("/api/grade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ essay: essayText, question: q }),
        });
        if (!res.ok) {
          const error = await res.json().catch(() => null);
          throw new Error(typeof error?.error === "string" ? error.error : "채점 요청 실패");
        }
        const data = normalizeClientGradeResult(await res.json());
        clearDraft();
        setResult(data);
        setSubmittedEssay(essayText);
        setLockedEssay(null);
        saveHistory({
          id: q.id,
          date: new Date().toISOString(),
          difficulty: q.difficulty,
          domain: q.targetDomain ?? "",
          score: data.overallScore,
          essay: essayText,
          question: q,
          result: data,
        });
        setStep("result");
      } catch (e) {
        setErrorMessage(e instanceof Error ? e.message : "채점에 실패했습니다.");
        setStep("writing");
        if (Date.now() < endTimeRef.current && !isAutoSubmit) {
          startTimer(endTimeRef.current);
        } else {
          setTimeLeft(0);
          setLockedEssay(essayText);
        }
      } finally {
        setLoading(false);
      }
    },
    [startTimer]
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleOcrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    const maxFiles = 2;
    const maxSizePerFile = 5 * 1024 * 1024;

    const selected = Array.from(files).slice(0, maxFiles);

    for (const file of selected) {
      if (!allowedTypes.includes(file.type)) {
        setErrorMessage("JPEG, PNG, WebP 형식의 이미지만 지원합니다.");
        return;
      }
      if (file.size > maxSizePerFile) {
        setErrorMessage(`${file.name}: 5MB를 초과합니다.`);
        return;
      }
    }

    setOcrLoading(true);
    setErrorMessage(null);

    try {
      const images = await Promise.all(
        selected.map(
          (file) =>
            new Promise<{ data: string; mimeType: string }>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                const result = reader.result as string;
                const base64 = result.split(",")[1];
                resolve({ data: base64, mimeType: file.type });
              };
              reader.onerror = () => reject(new Error("파일 읽기 실패"));
              reader.readAsDataURL(file);
            })
        )
      );

      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => null);
        throw new Error(typeof error?.error === "string" ? error.error : "손글씨 인식 실패");
      }

      const { text } = await res.json();
      if (typeof text === "string" && text.trim()) {
        setEssay((prev) => (prev ? prev + "\n\n" + text : text));
      } else {
        setErrorMessage("이미지에서 텍스트를 인식하지 못했습니다.");
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "손글씨 인식에 실패했습니다.");
    } finally {
      setOcrLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = () => {
    if (!question || loading) return;
    const essayToSubmit = lockedEssay ?? essay;
    if (essayToSubmit.trim().length < 100) {
      setErrorMessage("최소 100자 이상 작성해주세요.");
      return;
    }
    submitForGrading(essayToSubmit, question, timeLeft <= 0);
  };

  // 타이머 만료 시 자동 제출 (ref 기반으로 stale closure 방지)
  useEffect(() => {
    if (timeLeft > 0 || step !== "writing" || autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    const currentEssay = essayRef.current;
    const currentQuestion = questionRef.current;
    setLockedEssay(currentEssay);
    if (currentQuestion && currentEssay.trim().length >= 100) {
      submitForGrading(currentEssay, currentQuestion, true);
    } else {
      setErrorMessage("시간이 종료되었습니다. 추가 작성은 잠겼습니다.");
    }
  }, [timeLeft, step, submitForGrading]);

  if (step === "setup") {
    return (
      <div className="flex flex-col items-center gap-8 py-16">
        <h1 className="text-2xl font-bold text-stone-800">모의 논술 연습</h1>
        <p className="text-stone-500">난이도를 선택하고 모의 문제를 생성하세요.</p>

        {errorMessage && (
          <div className="w-full max-w-md rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700" role="alert">
            {errorMessage}
          </div>
        )}

        {hasDraft && (
          <div className="w-full max-w-md rounded-xl border border-amber-300 bg-amber-50 p-5">
            <p className="text-sm font-medium text-amber-800">이전에 작성 중이던 답안이 있습니다.</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleRecover}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
              >
                이어서 작성
              </button>
              <button
                onClick={handleDismissDraft}
                className="rounded-lg border border-amber-300 px-4 py-2 text-sm text-amber-700 transition hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
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
              className={`rounded-lg border-2 px-6 py-4 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
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
          className="rounded-lg bg-emerald-600 px-8 py-4 font-medium text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:opacity-50"
        >
          {loading ? "문제 생성 중..." : "문제 생성하기"}
        </button>

        <button
          onClick={() => { setHistory(loadHistory()); setShowHistory(!showHistory); }}
          className="text-sm text-stone-400 underline underline-offset-2 transition hover:text-stone-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-400"
        >
          {showHistory ? "연습 이력 닫기" : "연습 이력 보기"}
        </button>

        {showHistory && (
          <div className="w-full max-w-2xl">
            {history.length === 0 ? (
              <p className="text-center text-sm text-stone-400">아직 연습 이력이 없습니다.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {history.map((entry) => (
                  <button
                    key={entry.id + entry.date}
                    onClick={() => setViewingEntry(viewingEntry?.date === entry.date ? null : entry)}
                    className="flex items-center gap-4 rounded-lg border border-stone-200 bg-white px-5 py-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                  >
                    <span className={`text-2xl font-bold ${getScoreColor(entry.score)}`}>{entry.score}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-stone-700">{entry.domain || "미분류"}</p>
                      <p className="text-xs text-stone-400">
                        {new Date(entry.date).toLocaleDateString("ko-KR")} · {entry.difficulty === "basic" ? "기본" : entry.difficulty === "standard" ? "표준" : "심화"} · {entry.essay.length}자
                      </p>
                    </div>
                    <span className="text-xs text-stone-400">{viewingEntry?.date === entry.date ? "▲" : "▼"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {viewingEntry && (
          <HistoryDetail entry={viewingEntry} onClose={() => setViewingEntry(null)} />
        )}
      </div>
    );
  }

  if (step === "writing" && question) {
    const isLocked = loading || lockedEssay !== null || timeLeft <= 0;
    const charLabel = essay.length < 1000 ? "부족" : essay.length > 1800 ? "초과" : "적정";
    const charColor = essay.length < 1000 ? "text-stone-400" : essay.length > 1800 ? "text-amber-600" : "text-emerald-600";
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-bold text-stone-800">모의 논술 작성</h1>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className={`text-sm ${charColor}`}>
              {essay.length}자 ({charLabel})
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

        {errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700" role="alert">
            {errorMessage}
          </div>
        )}

        {lockedEssay !== null && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
            시간이 종료되어 답안 수정이 잠겼습니다. 현재 내용으로 제출만 재시도할 수 있습니다.
          </div>
        )}

        <div className="flex justify-end" data-print-hide>
          <button
            onClick={() => window.print()}
            className="rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-600 transition hover:bg-stone-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-400"
          >
            PDF로 저장
          </button>
        </div>

        <ExamPaperView
          examFormat={question.examFormat}
          fallbackText={question.promptText}
          difficulty={question.difficulty}
        />

        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleOcrUpload}
            disabled={isLocked || ocrLoading}
            className="hidden"
            id="ocr-upload"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLocked || ocrLoading}
            className="rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-600 transition hover:border-emerald-300 hover:bg-emerald-50/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:opacity-50"
          >
            {ocrLoading ? "손글씨 인식 중..." : "사진으로 답안 입력"}
          </button>
          <span className="text-xs text-stone-400">
            손글씨 답안지 사진을 업로드하면 AI가 텍스트로 변환합니다 (최대 2장)
          </span>
        </div>

        <textarea
          value={essay}
          onChange={(e) => setEssay(e.target.value)}
          placeholder="여기에 논술을 작성하거나, 위 버튼으로 손글씨 사진을 업로드하세요..."
          disabled={isLocked}
          className="min-h-[60vh] w-full rounded-xl border border-stone-200 bg-white p-6 text-sm leading-relaxed focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
        />

        <div className="flex justify-end gap-3">
          {confirmingGiveUp ? (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2">
              <span className="text-sm text-red-700">정말 포기하시겠습니까?</span>
              <button
                onClick={() => {
                  if (timerRef.current) clearInterval(timerRef.current);
                  clearDraft();
                  setStep("setup");
                  setEssay("");
                  setQuestion(null);
                  setLockedEssay(null);
                  setConfirmingGiveUp(false);
                }}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
              >
                확인
              </button>
              <button
                onClick={() => setConfirmingGiveUp(false)}
                className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-600 transition hover:bg-stone-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-400"
              >
                취소
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingGiveUp(true)}
              className="rounded-lg border border-stone-200 px-6 py-4 text-sm text-stone-600 transition hover:bg-stone-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-400"
            >
              포기하기
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-lg bg-amber-600 px-8 py-4 text-sm font-medium text-white shadow-sm transition hover:bg-amber-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 disabled:opacity-50"
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
        <p className="text-sm text-stone-400">{GRADING_MESSAGES[gradingMsgIndex]}</p>
      </div>
    );
  }

  if (step === "result" && result) {
    const scoreColor = getScoreColor(result.overallScore);
    return (
      <div className="flex flex-col gap-8">
        <h1 className="text-2xl font-bold text-stone-800">채점 결과</h1>

        <div className="rounded-xl border border-stone-200 bg-white p-8 shadow-sm">
          <div className="text-center">
            <div className={`text-5xl font-bold ${scoreColor}`}>{result.overallScore}</div>
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

        {submittedEssay && (
          <details className="rounded-xl border border-stone-200 bg-white shadow-sm">
            <summary className="cursor-pointer px-6 py-4 font-semibold text-stone-700 hover:text-stone-900">
              내가 작성한 답안 보기
            </summary>
            <div className="border-t border-stone-100 px-6 py-4">
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
                {submittedEssay}
              </div>
              <p className="mt-3 text-xs text-stone-400">{submittedEssay.length}자</p>
            </div>
          </details>
        )}

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

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => {
              setStep("setup");
              setEssay("");
              setQuestion(null);
              setResult(null);
              setSubmittedEssay("");
              setTimeLeft(DURATION_SECONDS);
              setLockedEssay(null);
            }}
            className="rounded-lg bg-emerald-600 px-8 py-4 font-medium text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
          >
            다시 연습하기
          </button>
          <Link
            href="/analysis"
            className="rounded-lg border border-stone-300 px-8 py-4 font-medium text-stone-700 transition hover:bg-stone-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-400"
          >
            출제 패턴 분석 보기
          </Link>
        </div>
      </div>
    );
  }

  return null;
}

/* ---------- 이력 상세 보기 ---------- */

function HistoryDetail({ entry, onClose }: { entry: HistoryEntry; onClose: () => void }) {
  const { result, essay, question } = entry;
  return (
    <div className="w-full max-w-4xl rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
        <div>
          <h3 className="font-semibold text-stone-800">
            {new Date(entry.date).toLocaleDateString("ko-KR")} 연습 결과
          </h3>
          <p className="text-xs text-stone-400">
            {entry.domain} · {entry.difficulty === "basic" ? "기본" : entry.difficulty === "standard" ? "표준" : "심화"} · {entry.score}/20점
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="이력 상세 닫기"
          className="text-sm text-stone-400 hover:text-stone-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-400"
        >
          닫기
        </button>
      </div>
      <div className="flex flex-col gap-6 p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "내용", data: result.breakdown.content },
            { label: "논리", data: result.breakdown.logic },
            { label: "표현", data: result.breakdown.expression },
          ].map(({ label, data }) => (
            <div key={label} className="rounded-lg bg-stone-50 p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-medium text-stone-500">{label}</span>
                <span className="text-sm font-bold text-stone-700">{data.score}/{data.maxScore}</span>
              </div>
              <p className="mt-1 text-xs text-stone-500">{data.feedback}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-emerald-50 p-4">
            <h4 className="text-sm font-semibold text-emerald-800">잘한 점</h4>
            <ul className="mt-2 space-y-1 text-xs text-emerald-700">
              {result.strengths.map((s, i) => <li key={i}>• {s}</li>)}
            </ul>
          </div>
          <div className="rounded-lg bg-amber-50 p-4">
            <h4 className="text-sm font-semibold text-amber-800">개선할 점</h4>
            <ul className="mt-2 space-y-1 text-xs text-amber-700">
              {result.improvements.map((s, i) => <li key={i}>• {s}</li>)}
            </ul>
          </div>
        </div>

        <details className="rounded-lg border border-stone-200">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-stone-600 hover:text-stone-800">
            작성 답안 ({essay.length}자)
          </summary>
          <div className="border-t border-stone-100 px-4 py-3">
            <div className="whitespace-pre-wrap text-xs leading-relaxed text-stone-600">{essay}</div>
          </div>
        </details>

        <details className="rounded-lg border border-stone-200">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-stone-600 hover:text-stone-800">
            출제 문제
          </summary>
          <div className="border-t border-stone-100 px-4 py-3">
            <ExamPaperView
              examFormat={question.examFormat}
              fallbackText={question.promptText}
              difficulty={question.difficulty}
            />
          </div>
        </details>
      </div>
    </div>
  );
}
