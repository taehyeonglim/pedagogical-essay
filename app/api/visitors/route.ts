import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

function getRedis() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const VISITOR_KEY = "visitor_count";

export async function GET() {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ count: 0 });

  const count = (await redis.get<number>(VISITOR_KEY)) ?? 0;
  return NextResponse.json({ count });
}

export async function POST() {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ count: 0 });

  const count = await redis.incr(VISITOR_KEY);
  return NextResponse.json({ count });
}
