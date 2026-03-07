"use client";

import { useEffect, useState } from "react";

export default function VisitorCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const counted = sessionStorage.getItem("visitor_counted");

    if (counted) {
      fetch("/api/visitors")
        .then((res) => res.json())
        .then((data) => setCount(data.count))
        .catch(() => {});
    } else {
      fetch("/api/visitors", { method: "POST" })
        .then((res) => res.json())
        .then((data) => {
          setCount(data.count);
          sessionStorage.setItem("visitor_counted", "1");
        })
        .catch(() => {});
    }
  }, []);

  if (count === null) return null;

  return (
    <div className="bg-emerald-900 py-1 text-center text-xs text-emerald-300">
      총 방문 <span className="font-semibold text-white">{count.toLocaleString()}</span>회
    </div>
  );
}
