"use client";

import { useState } from "react";
import analysisData from "../../data/analysis.json";

const DOMAIN_COLORS: Record<string, { bg: string; text: string; bar: string; light: string; border: string }> = {
  emerald: { bg: "bg-emerald-100", text: "text-emerald-700", bar: "bg-emerald-500", light: "bg-emerald-50", border: "border-emerald-300" },
  blue: { bg: "bg-blue-100", text: "text-blue-700", bar: "bg-blue-500", light: "bg-blue-50", border: "border-blue-300" },
  violet: { bg: "bg-violet-100", text: "text-violet-700", bar: "bg-violet-500", light: "bg-violet-50", border: "border-violet-300" },
  rose: { bg: "bg-rose-100", text: "text-rose-700", bar: "bg-rose-500", light: "bg-rose-50", border: "border-rose-300" },
  amber: { bg: "bg-amber-100", text: "text-amber-700", bar: "bg-amber-500", light: "bg-amber-50", border: "border-amber-300" },
  sky: { bg: "bg-sky-100", text: "text-sky-700", bar: "bg-sky-500", light: "bg-sky-50", border: "border-sky-300" },
};

const YEARS = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];

export default function AnalysisPage() {
  const [expandedYear, setExpandedYear] = useState<number | null>(null);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);

  const { domains, yearlyAnalysis, statistics } = analysisData;

  // 영역별 출제 횟수 계산 (주 영역 기준)
  const domainCounts = domains.map((d) => {
    const count = yearlyAnalysis.filter((y) => y.domainId === d.id).length;
    return { ...d, count };
  }).sort((a, b) => b.count - a.count);

  const maxCount = Math.max(...domainCounts.map((d) => d.count));

  return (
    <div className="flex flex-col gap-12 pb-16">
      {/* 페이지 헤더 */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-stone-800">
          출제 패턴 분석
        </h1>
        <p className="mt-2 text-sm text-stone-500">
          2015~2026학년도 12개년 기출문제를 교육학 전공 영역별·이론별로 종합 분석합니다.
        </p>
      </div>

      {/* 섹션 1: 영역별 출제 빈도 */}
      <section>
        <h2 className="mb-6 text-xl font-bold text-stone-800">영역별 출제 빈도</h2>
        <div className="flex flex-col gap-3">
          {domainCounts.map((d) => {
            const colors = DOMAIN_COLORS[d.color];
            const pct = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
            return (
              <button
                key={d.id}
                onClick={() => {
                  setExpandedDomain(d.id === expandedDomain ? null : d.id);
                  document.getElementById(`domain-${d.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="group flex items-center gap-4 text-left"
              >
                <span className={`w-28 shrink-0 text-sm font-medium ${colors.text}`}>
                  {d.name}
                </span>
                <div className="relative h-8 flex-1 overflow-hidden rounded-lg bg-stone-100">
                  <div
                    className={`h-full rounded-lg ${colors.bar} transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                  <span className="absolute inset-y-0 left-3 flex items-center text-xs font-semibold text-white drop-shadow">
                    {d.count > 0 ? `${d.count}회` : ""}
                  </span>
                </div>
                <span className="w-8 text-right text-sm font-bold text-stone-600">
                  {d.count}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-stone-400">
          * 각 연도의 주 출제 영역 기준. 하나의 시험에 여러 영역이 복합 출제될 수 있습니다.
        </p>
      </section>

      {/* 섹션 2: 연도별 출제 맵 */}
      <section>
        <h2 className="mb-6 text-xl font-bold text-stone-800">연도별 출제 맵</h2>
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50">
                <th className="sticky left-0 z-10 bg-stone-50 px-4 py-3 text-left font-semibold text-stone-600">
                  영역
                </th>
                {YEARS.map((year) => (
                  <th
                    key={year}
                    className="cursor-pointer px-2 py-3 text-center font-medium text-stone-500 transition hover:text-emerald-600"
                    onClick={() => setExpandedYear(expandedYear === year ? null : year)}
                  >
                    <span className="text-xs">{String(year).slice(2)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {domains.map((domain) => {
                const colors = DOMAIN_COLORS[domain.color];
                return (
                  <tr key={domain.id} className="border-b border-stone-100 last:border-0">
                    <td className={`sticky left-0 z-10 bg-white px-4 py-3 font-medium ${colors.text}`}>
                      {domain.name}
                    </td>
                    {YEARS.map((year) => {
                      const yearData = yearlyAnalysis.find((y) => y.year === year);
                      const isMainDomain = yearData?.domainId === domain.id;
                      const hasTheory = domain.years.includes(year);
                      return (
                        <td key={year} className="px-2 py-3 text-center">
                          {isMainDomain ? (
                            <span
                              className={`inline-block h-5 w-5 rounded-full ${colors.bar} cursor-pointer shadow-sm`}
                              title={`${year}: ${yearData?.topic}`}
                              onClick={() => setExpandedYear(expandedYear === year ? null : year)}
                            />
                          ) : hasTheory ? (
                            <span
                              className={`inline-block h-3 w-3 rounded-full ${colors.bg} cursor-pointer`}
                              title={`${year}: 관련 이론 출제`}
                              onClick={() => setExpandedYear(expandedYear === year ? null : year)}
                            />
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-stone-400">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-4 w-4 rounded-full bg-stone-400" /> 주 출제 영역
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-stone-200" /> 관련 이론 포함
          </span>
          <span>| 연도 또는 ● 클릭 시 상세 펼침</span>
        </div>
      </section>

      {/* 섹션 3: 연도별 상세 분석 (아코디언) */}
      <section>
        <h2 className="mb-6 text-xl font-bold text-stone-800">연도별 상세 분석</h2>
        <div className="flex flex-col gap-3">
          {yearlyAnalysis.map((item) => {
            const isOpen = expandedYear === item.year;
            const domain = domains.find((d) => d.id === item.domainId);
            const colors = domain ? DOMAIN_COLORS[domain.color] : DOMAIN_COLORS.emerald;
            return (
              <div
                key={item.year}
                id={`year-${item.year}`}
                className={`rounded-xl border bg-white transition ${isOpen ? `${colors.border} shadow-md` : "border-stone-200"}`}
              >
                <button
                  onClick={() => setExpandedYear(isOpen ? null : item.year)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left"
                >
                  <span className="text-lg font-bold text-stone-700">{item.year}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}>
                    {item.domain}
                  </span>
                  <span className="flex-1 truncate text-sm text-stone-500">
                    {item.topic}
                  </span>
                  <span className="text-sm text-stone-400">
                    {isOpen ? "▲" : "▼"}
                  </span>
                </button>
                {isOpen && (
                  <div className={`border-t px-5 py-5 ${colors.light} ${colors.border}`}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">주제</p>
                        <p className="mt-1 text-sm font-medium text-stone-700">{item.topic}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">출제 형식</p>
                        <p className="mt-1 text-sm text-stone-700">
                          {item.format} · 하위 {item.subQuestions}문항 · 내용 {item.scoring.content}점 + 체계 {item.scoring.structure}점
                        </p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">핵심 이론</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {item.keyTheories.map((t) => (
                          <span key={t} className={`rounded-full px-3 py-1 text-xs font-medium ${colors.bg} ${colors.text}`}>
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">키워드</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {item.keywords.map((k) => (
                          <span key={k} className="rounded-full bg-white px-3 py-1 text-xs text-stone-600 shadow-sm ring-1 ring-stone-200">
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-stone-600">
                      {item.detail}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 섹션 4: 주요 교육학 이론 해설 */}
      <section>
        <h2 className="mb-6 text-xl font-bold text-stone-800">주요 교육학 이론 해설</h2>
        <div className="flex flex-col gap-4">
          {domains.map((domain) => {
            const colors = DOMAIN_COLORS[domain.color];
            const isOpen = expandedDomain === domain.id;
            return (
              <div
                key={domain.id}
                id={`domain-${domain.id}`}
                className={`rounded-xl border bg-white transition ${isOpen ? `${colors.border} shadow-md` : "border-stone-200"}`}
              >
                <button
                  onClick={() => setExpandedDomain(isOpen ? null : domain.id)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left"
                >
                  <span className={`rounded-full px-3 py-1 text-sm font-bold ${colors.bg} ${colors.text}`}>
                    {domain.name}
                  </span>
                  <span className="text-sm text-stone-400">
                    {domain.theories.length}개 이론
                  </span>
                  <span className="flex-1" />
                  <span className="text-sm text-stone-400">{isOpen ? "▲" : "▼"}</span>
                </button>
                {isOpen && (
                  <div className={`border-t px-5 py-5 ${colors.light} ${colors.border}`}>
                    <div className="flex flex-col gap-5">
                      {domain.theories.map((theory) => (
                        <div key={theory.name} className="rounded-lg border border-white bg-white p-4 shadow-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-semibold text-stone-800">{theory.name}</h4>
                            {theory.years.map((y) => (
                              <span
                                key={y}
                                className={`rounded px-1.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}
                              >
                                {y}
                              </span>
                            ))}
                          </div>
                          <p className="mt-2 text-sm leading-relaxed text-stone-600">
                            {theory.description}
                          </p>
                          {theory.references.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-3">
                              {theory.references.map((ref) => (
                                <a
                                  key={ref.url}
                                  href={ref.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`text-xs font-medium ${colors.text} underline decoration-dotted underline-offset-2 transition hover:opacity-70`}
                                >
                                  {ref.title} ↗
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 섹션 5: 출제 트렌드 요약 */}
      <section>
        <h2 className="mb-6 text-xl font-bold text-stone-800">출제 트렌드 요약</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {/* 배점 체계 변화 */}
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <h3 className="mb-4 font-semibold text-stone-700">배점 체계 변화</h3>
            <div className="flex flex-col gap-3">
              {statistics.scoringChanges.map((sc) => (
                <div key={sc.period} className="rounded-lg bg-stone-50 px-4 py-3">
                  <p className="text-sm font-semibold text-stone-700">{sc.period}</p>
                  <p className="mt-1 text-xs text-stone-500">
                    {sc.format} · 내용 {sc.content}점 + 체계 {sc.structure}점
                  </p>
                  <p className="mt-0.5 text-xs text-stone-400">{sc.note}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 출제 형식 분포 */}
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <h3 className="mb-4 font-semibold text-stone-700">출제 형식 분포</h3>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="w-16 text-sm text-stone-500">대화형</span>
                <div className="relative h-7 flex-1 overflow-hidden rounded-lg bg-stone-100">
                  <div
                    className="h-full rounded-lg bg-emerald-500"
                    style={{ width: `${statistics.formatDistribution.dialogue.percentage}%` }}
                  />
                </div>
                <span className="w-16 text-right text-sm font-medium text-stone-600">
                  {statistics.formatDistribution.dialogue.count}회 ({statistics.formatDistribution.dialogue.percentage}%)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-16 text-sm text-stone-500">보고서형</span>
                <div className="relative h-7 flex-1 overflow-hidden rounded-lg bg-stone-100">
                  <div
                    className="h-full rounded-lg bg-amber-500"
                    style={{ width: `${statistics.formatDistribution.report.percentage}%` }}
                  />
                </div>
                <span className="w-16 text-right text-sm font-medium text-stone-600">
                  {statistics.formatDistribution.report.count}회 ({statistics.formatDistribution.report.percentage}%)
                </span>
              </div>
            </div>
          </div>

          {/* 최근 3개년 강조 영역 */}
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <h3 className="mb-4 font-semibold text-stone-700">최근 3개년 강조 영역</h3>
            <div className="flex flex-wrap gap-2">
              {statistics.recentEmphasis.map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700"
                >
                  {item}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs text-stone-400">
              2024~2026학년도 기출문제에서 공통적으로 강조된 핵심 주제
            </p>
          </div>

          {/* 자주 함께 출제되는 이론 조합 */}
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <h3 className="mb-4 font-semibold text-stone-700">자주 함께 출제되는 이론 조합</h3>
            <div className="flex flex-col gap-3">
              {statistics.frequentCombinations.map((combo, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-xs font-bold text-stone-400">{i + 1}</span>
                  <div>
                    <p className="text-sm text-stone-700">
                      {combo.theories.join(" + ")}
                    </p>
                    <p className="text-xs text-stone-400">
                      {combo.years.join(", ")}학년도
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
