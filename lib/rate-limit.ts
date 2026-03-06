const requests = new Map<string, { count: number; resetTime: number }>();

const WINDOW_MS = 60_000; // 1분
const MAX_REQUESTS = 10; // 분당 최대 요청
const MAX_ENTRIES = 10_000;

// 만료 항목 주기적 정리 (메모리 누수 방지)
let _cleanupScheduled = false;
function scheduleCleanup() {
  if (_cleanupScheduled) return;
  _cleanupScheduled = true;
  if (typeof setInterval !== "undefined") {
    const timer = setInterval(() => {
      const now = Date.now();
      for (const [ip, entry] of requests) {
        if (now > entry.resetTime) requests.delete(ip);
      }
    }, WINDOW_MS);
    timer.unref?.();
  }
}

export function checkRateLimit(ip: string): { ok: boolean; remaining: number } {
  scheduleCleanup();
  const now = Date.now();
  const entry = requests.get(ip);

  if (!entry || now > entry.resetTime) {
    // 최대 항목 수 초과 시 만료 항목 일괄 정리
    if (requests.size >= MAX_ENTRIES) {
      for (const [k, v] of requests) {
        if (now > v.resetTime) requests.delete(k);
      }
    }
    requests.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return { ok: true, remaining: MAX_REQUESTS - 1 };
  }

  if (entry.count >= MAX_REQUESTS) {
    return { ok: false, remaining: 0 };
  }

  entry.count++;
  return { ok: true, remaining: MAX_REQUESTS - entry.count };
}

export function getClientIP(request: Request): string {
  const directHeaders = [
    "x-real-ip",
    "x-forwarded-for",
    "cf-connecting-ip",
    "x-vercel-forwarded-for",
    "fly-client-ip",
    "true-client-ip",
    "x-client-ip",
  ];

  for (const header of directHeaders) {
    const value = request.headers.get(header);
    if (!value) continue;
    const first = value.split(",")[0]?.trim();
    if (first) return first;
  }

  const forwarded = request.headers.get("forwarded");
  if (forwarded) {
    const match = forwarded.match(/for="?([^;,\s"]+)/i);
    if (match?.[1]) return match[1];
  }

  const userAgent = request.headers.get("user-agent")?.trim().slice(0, 120) ?? "unknown-agent";
  const language = request.headers.get("accept-language")?.split(",")[0]?.trim() ?? "unknown-lang";
  return `anon:${userAgent}:${language}`;
}
