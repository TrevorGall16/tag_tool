/**
 * NextAuth route handler with a mandatory IP guard.
 *
 * Sign-in and OAuth callback paths are checked before NextAuth runs:
 *   - Unknown IP  → 401 (fail-closed, no bypass)
 *   - Rate limited → 429
 *   - Redis error  → 503 (fail-closed, no bypass)
 *
 * All other NextAuth paths (session, csrf, providers, signout) are
 * passed through without IP gating — blocking those would break the UI.
 */

import { NextRequest, NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { checkAuthRateLimit } from "@/lib/ratelimit";

// Paths where a real end-user identity is being established.
// These are the only ones that need the IP guard.
const GUARDED_PREFIXES = ["/api/auth/signin", "/api/auth/callback"];

function extractIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Returns a blocking response if the request should be denied,
 * or null if it should proceed to NextAuth.
 */
async function ipGuard(req: NextRequest): Promise<NextResponse | null> {
  const { pathname } = req.nextUrl;
  if (!GUARDED_PREFIXES.some((p) => pathname.startsWith(p))) {
    return null; // unguarded path — allow through
  }

  const ip = extractIp(req);

  if (ip === "unknown") {
    console.warn("[SECURITY] Blocking auth request: could not determine client IP");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const allowed = await checkAuthRateLimit(ip);
    if (!allowed) {
      console.warn("[SECURITY] Auth rate limit hit from IP:", ip);
      return NextResponse.json({ error: "Too many requests. Please wait." }, { status: 429 });
    }
    return null; // allowed
  } catch (err) {
    console.error("[SECURITY] Auth rate limit check threw — blocking (fail-closed):", err);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
  }
}

// NextAuth's handler is compatible with Next.js route handler signatures.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nextAuth = NextAuth(authOptions) as (req: NextRequest, ctx?: any) => Promise<Response>;

export async function GET(req: NextRequest, ctx: { params: { nextauth: string[] } }) {
  const block = await ipGuard(req);
  if (block) return block;
  return nextAuth(req, ctx);
}

export async function POST(req: NextRequest, ctx: { params: { nextauth: string[] } }) {
  const block = await ipGuard(req);
  if (block) return block;
  return nextAuth(req, ctx);
}
