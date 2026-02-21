import { Ratelimit } from "@upstash/ratelimit";
import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

// ---------------------------------------------------------------------------
// AI-route rate limiter — keyed by userId, FAIL-OPEN (infra outage ≠ user block)
// ---------------------------------------------------------------------------
let ratelimit: Ratelimit | null = null;

// ---------------------------------------------------------------------------
// Auth-route rate limiter — keyed by IP, FAIL-CLOSED (outage ≠ bypass window)
// ---------------------------------------------------------------------------
let authRatelimit: Ratelimit | null = null;

if (redis) {
  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    analytics: true,
    prefix: "visionbatch:ratelimit",
  });

  // Tighter window for sign-in / sign-up: 10 attempts per 10 minutes per IP.
  authRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "10 m"),
    analytics: true,
    prefix: "visionbatch:authratelimit",
  });
}

/**
 * Check rate limit for a user (AI routes). FAIL-OPEN: if Redis is unavailable,
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

/**
 * Check rate limit for auth routes (sign-in / sign-up). Keyed by IP address.
 *
 * FAIL-CLOSED: returns false (blocked) when Redis is unavailable to prevent
 * the fail-open loophole from being exploited during infrastructure outages.
 * Returns true if the request is within limits.
 */
export async function checkAuthRateLimit(ip: string): Promise<boolean> {
  if (!authRatelimit) {
    // Redis not configured — fail closed for auth routes
    console.warn(
      "[RateLimit] Auth rate limiter: Redis not configured — denying request (fail-closed)"
    );
    return false;
  }

  try {
    const { success } = await authRatelimit.limit(`auth:${ip}`);
    return success;
  } catch (error) {
    console.error("[RateLimit] Auth Redis error, failing closed:", error);
    return false; // Fail closed — deny on error to prevent bypass during outages
  }
}
