import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { Redis } from "@upstash/redis";

const requests = new Map<string, { count: number; resetTime: number }>();

const DEFAULT_WINDOW_MS = 60_000; // 1분
const DEFAULT_MAX_REQUESTS = 10; // 분당 최대 요청
const MAX_ENTRIES = 10_000;

type RateLimitOptions = {
  scope: string;
  windowMs?: number;
  maxRequests?: number;
};

let _redis: Redis | null | undefined;
let _cleanupScheduled = false;
let _lastRedisErrorAt = 0;

function getRedis(): Redis | null {
  if (_redis !== undefined) return _redis;
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  _redis = url && token ? new Redis({ url, token }) : null;
  return _redis;
}

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeIPAddress(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const withoutQuotes = trimmed.replace(/^"|"$/g, "");

  // [addr]:port 형태를 먼저 분리 (IPv6 bracket notation)
  const bracketMatch = withoutQuotes.match(/^\[([^\]]+)\](?::\d+)?$/);
  const withoutBrackets = bracketMatch ? bracketMatch[1] : withoutQuotes;

  const withoutMappedPrefix = withoutBrackets.replace(/^::ffff:/, "");

  // IPv4:port 형태에서 포트 제거 (IPv4 주소에만 적용)
  const withoutPort = withoutMappedPrefix.includes(".") && !withoutMappedPrefix.includes(":")
    ? withoutMappedPrefix
    : withoutMappedPrefix.includes(".") && withoutMappedPrefix.includes(":")
      ? withoutMappedPrefix.replace(/:\d+$/, "")
      : withoutMappedPrefix;

  return isIP(withoutPort) ? withoutPort : null;
}

function readForwardedIP(request: Request): string | null {
  const directHeaders = [
    "cf-connecting-ip",
    "x-vercel-forwarded-for",
    "fly-client-ip",
    "true-client-ip",
    "x-real-ip",
    "x-forwarded-for",
  ];

  for (const header of directHeaders) {
    const value = request.headers.get(header);
    if (!value) continue;
    const first = value.split(",")[0];
    const ip = normalizeIPAddress(first ?? "");
    if (ip) return ip;
  }

  const forwarded = request.headers.get("forwarded");
  if (!forwarded) return null;

  const match = forwarded.match(/for="?([^;,\s"]+)/i);
  return match?.[1] ? normalizeIPAddress(match[1]) : null;
}

function getClientKey(request: Request): string {
  const ip = readForwardedIP(request);
  if (ip) return `ip:${ip}`;

  const userAgent = request.headers.get("user-agent")?.trim().slice(0, 200) ?? "unknown-agent";
  const language = request.headers.get("accept-language")?.split(",")[0]?.trim() ?? "unknown-lang";
  return `anon:${hashValue(`${userAgent}:${language}`)}`;
}

function scheduleCleanup() {
  if (_cleanupScheduled) return;
  _cleanupScheduled = true;
  if (typeof setInterval !== "undefined") {
    const timer = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of requests) {
        if (now > entry.resetTime) requests.delete(key);
      }
    }, 60_000);
    timer.unref?.();
  }
}

function checkMemoryRateLimit(key: string, windowMs: number, maxRequests: number): { ok: boolean; remaining: number } {
  scheduleCleanup();
  const now = Date.now();
  const entry = requests.get(key);

  if (!entry || now > entry.resetTime) {
    for (const [storedKey, storedValue] of requests) {
      if (now > storedValue.resetTime) requests.delete(storedKey);
    }
    if (requests.size >= MAX_ENTRIES) {
      return { ok: false, remaining: 0 };
    }
    requests.set(key, { count: 1, resetTime: now + windowMs });
    return { ok: true, remaining: maxRequests - 1 };
  }

  if (entry.count >= maxRequests) {
    return { ok: false, remaining: 0 };
  }

  entry.count++;
  return { ok: true, remaining: maxRequests - entry.count };
}

async function checkRedisRateLimit(key: string, windowMs: number, maxRequests: number): Promise<{ ok: boolean; remaining: number } | null> {
  const redis = getRedis();
  if (!redis) return null;

  const redisKey = `rate-limit:${key}`;
  const ttlSeconds = Math.ceil(windowMs / 1000);

  try {
    const pipeline = redis.pipeline();
    pipeline.incr(redisKey);
    pipeline.expire(redisKey, ttlSeconds);
    const results = await pipeline.exec();
    const count = results[0] as number;

    return {
      ok: count <= maxRequests,
      remaining: Math.max(0, maxRequests - count),
    };
  } catch (error) {
    const now = Date.now();
    if (now - _lastRedisErrorAt > 60_000) {
      _lastRedisErrorAt = now;
      console.error("[rate-limit] Redis unavailable, falling back to in-memory limiter:", error);
    }
    return null;
  }
}

export async function checkRateLimit(
  request: Request,
  {
    scope,
    windowMs = DEFAULT_WINDOW_MS,
    maxRequests = DEFAULT_MAX_REQUESTS,
  }: RateLimitOptions
): Promise<{ ok: boolean; remaining: number }> {
  const clientKey = getClientKey(request);
  const key = `${scope}:${hashValue(clientKey)}`;

  const redisResult = await checkRedisRateLimit(key, windowMs, maxRequests);
  if (redisResult) return redisResult;

  return checkMemoryRateLimit(key, windowMs, maxRequests);
}

export function getClientIP(request: Request): string {
  return readForwardedIP(request) ?? "anonymous";
}
