"use client";

import { useParams } from "next/navigation";

export default function ResultPage() {
  const { id } = useParams();

  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-bold">채점 결과 #{id}</h1>
      <p className="mt-4 text-gray-500">
        이 페이지는 DB 연동 후 저장된 결과를 표시합니다.
      </p>
      <a href="/practice" className="mt-8 inline-block text-blue-600 hover:underline">
        모의 연습으로 돌아가기
      </a>
    </div>
  );
}
