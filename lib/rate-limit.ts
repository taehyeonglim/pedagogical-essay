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
    setInterval(() => {
      const now = Date.now();
      for (const [ip, entry] of requests) {
        if (now > entry.resetTime) requests.delete(ip);
      }
    }, WINDOW_MS);
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
  // Vercel 환경에서는 x-real-ip가 가장 신뢰할 수 있음
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  // IP를 알 수 없는 경우 요청별 고유 식별 불가 — 제한 적용하지 않도록 고유 키 생성
  return `anon_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
