import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center gap-12 py-16">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          초등 임용 교직논술 연습
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          2015~2026학년도 기출 분석 기반 모의 논술 연습 플랫폼
        </p>
      </div>

      <div className="grid w-full max-w-3xl gap-6 sm:grid-cols-2">
        <Link
          href="/exams"
          className="group rounded-xl border border-gray-200 bg-white p-8 shadow-sm transition hover:border-blue-300 hover:shadow-md"
        >
          <h2 className="text-xl font-semibold text-gray-900 group-hover:text-blue-700">
            기출 열람
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            12년간(2015~2026) 기출문제를 확인하고 출제 패턴을 분석합니다.
          </p>
        </Link>

        <Link
          href="/practice"
          className="group rounded-xl border border-gray-200 bg-white p-8 shadow-sm transition hover:border-blue-300 hover:shadow-md"
        >
          <h2 className="text-xl font-semibold text-gray-900 group-hover:text-blue-700">
            모의 연습
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            AI가 출제한 모의 문제로 논술을 작성하고 즉시 채점받습니다.
          </p>
        </Link>
      </div>

      <div className="w-full max-w-3xl rounded-xl border border-gray-200 bg-white p-8">
        <h3 className="text-lg font-semibold text-gray-900">출제 패턴 요약</h3>
        <ul className="mt-4 space-y-2 text-sm text-gray-600">
          <li>- 총점 20점: 내용 15점 + 체계 5점</li>
          <li>- 주요 주제: 수업·교수학습(33%), 교육과정·평가(33%)</li>
          <li>- 대화형 제시문 출제가 83.3%로 주류</li>
          <li>- 평균 하위 문항 수: 3개</li>
          <li>- 2021학년도부터 답안지 2매 형식으로 변경</li>
        </ul>
      </div>
    </div>
  );
}
