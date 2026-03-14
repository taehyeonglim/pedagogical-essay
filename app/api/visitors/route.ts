import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const VISITOR_KEY = "visitor_count";
const VISITOR_COOKIE = "visitor_counted";
const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24;

function getRedis() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function buildCountResponse(count: number) {
  return NextResponse.json(
    { count },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

function hasVisitorCookie(request: Request): boolean {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return false;

  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .some((part) => part === `${VISITOR_COOKIE}=1`);
}

export async function GET() {
  const redis = getRedis();
  if (!redis) return buildCountResponse(0);

  const count = (await redis.get<number>(VISITOR_KEY)) ?? 0;
  return buildCountResponse(count);
}

export async function POST(request: Request) {
  const { ok } = await checkRateLimit(request, {
    scope: "visitors:increment",
    windowMs: 60_000,
    maxRequests: 30,
  });
  if (!ok) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Cache-Control": "no-store" } }
    );
  }

  const redis = getRedis();
  if (!redis) return buildCountResponse(0);

  if (hasVisitorCookie(request)) {
    const count = (await redis.get<number>(VISITOR_KEY)) ?? 0;
    return buildCountResponse(count);
  }

  const count = await redis.incr(VISITOR_KEY);
  const response = buildCountResponse(count);
  response.cookies.set({
    name: VISITOR_COOKIE,
    value: "1",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: VISITOR_COOKIE_MAX_AGE,
  });

  return response;
}
