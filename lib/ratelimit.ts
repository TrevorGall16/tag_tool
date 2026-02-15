import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

let ratelimit: Ratelimit | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    analytics: true,
    prefix: "tagarchitect:ratelimit",
  });
}

/**
 * Check rate limit for a user. Fail-open: if Redis is unavailable,
 * the request is allowed through so users aren't blocked by infra issues.
 *
 * Returns a 429 NextResponse if rate-limited, or null if allowed.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function checkRateLimit(userId: string): Promise<NextResponse<any> | null> {
  if (!ratelimit) {
    return null; // Redis not configured — fail open
  }

  try {
    const { success, limit, remaining, reset } = await ratelimit.limit(userId);

    if (!success) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please wait before trying again." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": reset.toString(),
          },
        }
      );
    }

    return null; // Allowed
  } catch (error) {
    console.error("[RateLimit] Redis error, failing open:", error);
    return null; // Fail open — don't block users if Redis is down
  }
}
