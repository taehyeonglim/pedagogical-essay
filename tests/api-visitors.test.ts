import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  redisGetMock,
  redisIncrMock,
  redisCtorMock,
  checkRateLimitMock,
} = vi.hoisted(() => {
  const redisGetMock = vi.fn();
  const redisIncrMock = vi.fn();
  const redisCtorMock = vi.fn(function RedisMock() {
    return {
      get: redisGetMock,
      incr: redisIncrMock,
    };
  });
  const checkRateLimitMock = vi.fn();

  return {
    redisGetMock,
    redisIncrMock,
    redisCtorMock,
    checkRateLimitMock,
  };
});

vi.mock("@upstash/redis", () => ({
  Redis: redisCtorMock,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: checkRateLimitMock,
}));

import { GET, POST } from "@/app/api/visitors/route";

describe("visitor counter route", () => {
  beforeEach(() => {
    process.env.KV_REST_API_URL = "https://example-kv.test";
    process.env.KV_REST_API_TOKEN = "test-token";
    checkRateLimitMock.mockResolvedValue({ ok: true, remaining: 29 });
    redisGetMock.mockResolvedValue(41);
    redisIncrMock.mockResolvedValue(42);
  });

  afterEach(() => {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
  });

  it("increments visitors once and sets a cookie", async () => {
    const response = await POST(
      new Request("http://localhost/api/visitors", {
        method: "POST",
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ count: 42 });
    expect(redisIncrMock).toHaveBeenCalledWith("visitor_count");
    expect(response.headers.get("set-cookie")).toContain("visitor_counted=1");
  });

  it("does not increment again when the visitor cookie already exists", async () => {
    const response = await POST(
      new Request("http://localhost/api/visitors", {
        method: "POST",
        headers: {
          cookie: "visitor_counted=1",
        },
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ count: 41 });
    expect(redisGetMock).toHaveBeenCalledWith("visitor_count");
    expect(redisIncrMock).not.toHaveBeenCalled();
  });

  it("returns 429 when increment requests are rate limited", async () => {
    checkRateLimitMock.mockResolvedValueOnce({ ok: false, remaining: 0 });

    const response = await POST(
      new Request("http://localhost/api/visitors", {
        method: "POST",
      })
    );

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
    });
    expect(redisIncrMock).not.toHaveBeenCalled();
  });

  it("returns the current visitor count on GET", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ count: 41 });
    expect(redisGetMock).toHaveBeenCalledWith("visitor_count");
  });
});
