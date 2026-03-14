"use client";

import { useEffect, useState } from "react";

function getSessionFlag(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function setSessionFlag(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Safari private mode and locked-down browsers can throw here.
  }
}

export default function VisitorCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const counted = getSessionFlag("visitor_counted");

    const loadCount = async () => {
      const res = await fetch("/api/visitors", { cache: "no-store" });
      if (!res.ok) throw new Error("count fetch failed");
      const data = await res.json();
      if (!cancelled) setCount(data.count);
    };

    const incrementCount = async () => {
      const res = await fetch("/api/visitors", { method: "POST", cache: "no-store" });
      if (!res.ok) throw new Error("count increment failed");
      const data = await res.json();
      if (!cancelled) {
        setCount(data.count);
        setSessionFlag("visitor_counted", "1");
      }
    };

    if (counted) {
      void loadCount().catch(() => {});
    } else {
      void incrementCount().catch(() => {
        void loadCount().catch(() => {});
      });
    }

    return () => {
      cancelled = true;
    };
  }, []);

  if (count === null) return null;

  return (
    <div className="bg-emerald-900 py-1 text-center text-xs text-emerald-300">
      총 방문 <span className="font-semibold text-white">{count.toLocaleString()}</span>회
    </div>
  );
}
