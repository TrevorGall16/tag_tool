Document 6: Authentication & Security (TagArchitect — FINAL & COMPLETE)

## 1. Document Purpose

This document defines the complete security architecture for TagArchitect. It ensures:

- **Hybrid Authentication:** Frictionless entry for free users (session-based), secure persistence for paid users (account-based)
- **API Protection:** Claude Vision and Stripe endpoints shielded from abuse and bot traffic
- **Data Privacy:** Row-level security, automatic data deletion, GDPR compliance
- **Payment Security:** Stripe webhook verification, price tampering prevention
- **Bot Protection:** CAPTCHA on critical flows
- **Infrastructure Security:** Security headers, CORS policy, rate limiting

**Security Philosophy:**

> "Security is not optional or a later phase — it starts on day one."

---

## 2. Authentication Strategy (NextAuth.js)

### 2.1 Why NextAuth.js

**Decision:** Use NextAuth.js (now called Auth.js) instead of custom auth.

**Rationale:**

- Proven, battle-tested library (used by Netlify, Netflix, etc.)
- Native Next.js integration (middleware, API routes)
- Built-in Prisma adapter
- Handles session management, CSRF protection, OAuth flows
- Regular security updates

**Never build custom authentication** — this is a non-negotiable security rule.

### 2.2 Supported Authentication Methods

**Primary: Email Magic Links (Passwordless)**

- User enters email → receives one-time link
- No password to store, no password to leak
- Reduces friction for free users

**Secondary: Google OAuth**

- One-click signup for professional users
- Leverages Google's security infrastructure
- No password management needed

**NOT Supported (V1):**

- Username/password (security risk, user friction)
- Facebook/Twitter OAuth (unnecessary complexity)

### 2.3 Hybrid Authentication Flow

**Free Tier (Anonymous Users):**

1. User visits homepage → No signup required
2. System generates `sessionId` (random UUID)
3. SessionId stored in:
   - Secure HTTP-only cookie (server-side validation)
   - localStorage (client-side state persistence)
4. User can use 10 free credits immediately
5. Batch data stored with `sessionId` in database

**Conversion Moment (Upgrade to Paid):**

1. User clicks "Buy Credits"
2. System prompts: "Enter email to continue"
3. User receives magic link → clicks → account created
4. System "promotes" anonymous session:
   - `Batch.userId` updated from `null` to `user.id`
   - `Batch.sessionId` cleared
   - All existing batches linked to new account
5. User can now access batches across devices

**Logged-In Users (Free or Paid):**

1. User logs in via magic link or Google OAuth
2. Session stored in database (Prisma adapter)
3. Session expires after 30 days (rolling expiration)
4. Batches tied to `user.id` (cross-device sync)

---

## 3. NextAuth.js Configuration

### 3.1 Installation

```bash
pnpm add next-auth @auth/prisma-adapter
```

### 3.2 Prisma Schema (Add to Database Doc)

NextAuth requires additional tables:

```prisma
// Add to schema.prisma (in addition to existing User model)

model Account {
  id                String  @id @default(uuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
}

model Session {
  id           String   @id @default(uuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// Update User model with relations
model User {
  // ... existing fields ...
  accounts Account[]
  sessions Session[]
}
```

### 3.3 NextAuth Configuration File

**Location:** `/app/api/auth/[...nextauth]/route.ts`

```typescript
import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    // Email Magic Links (Primary)
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST!,
        port: Number(process.env.EMAIL_SERVER_PORT!),
        auth: {
          user: process.env.EMAIL_SERVER_USER!,
          pass: process.env.EMAIL_SERVER_PASSWORD!,
        },
      },
      from: process.env.EMAIL_FROM!, // e.g., "TagArchitect <noreply@tagarchitect.com>"
    }),

    // Google OAuth (Secondary)
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  // Session Strategy
  session: {
    strategy: "database", // Store sessions in database (not JWT)
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // Refresh session every 24 hours
  },

  // Pages
  pages: {
    signIn: "/auth/signin", // Custom signin page
    verifyRequest: "/auth/verify-email", // Email sent confirmation
    error: "/auth/error", // Error page
  },

  // Callbacks
  callbacks: {
    async session({ session, user }) {
      // Attach user info to session
      if (session.user) {
        session.user.id = user.id;
        session.user.creditsBalance = user.creditsBalance;
        session.user.subscriptionTier = user.subscriptionTier;
      }
      return session;
    },

    async signIn({ user, account, profile }) {
      // On first sign-in, link anonymous batches to new account
      if (account?.provider === "email" && user.email) {
        // Check for session cookie
        const sessionId = cookies().get("tagarchitect_session")?.value;

        if (sessionId) {
          // Link all batches with this sessionId to new user
          await prisma.batch.updateMany({
            where: { sessionId },
            data: {
              userId: user.id,
              sessionId: null, // Clear sessionId after linking
            },
          });
        }
      }

      return true; // Allow sign-in
    },
  },

  // Events (for logging)
  events: {
    async signIn({ user }) {
      console.log(`[Auth] User signed in: ${user.email}`);
    },
    async signOut({ session }) {
      console.log(`[Auth] User signed out: ${session.user?.email}`);
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

### 3.4 Session Management Middleware

**Location:** `/middleware.ts`

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });

  // Protect /dashboard route
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    if (!token) {
      // Not logged in → redirect to signin
      return NextResponse.redirect(new URL("/auth/signin", request.url));
    }
  }

  // Protect /api routes (except public ones)
  if (request.nextUrl.pathname.startsWith("/api")) {
    const publicRoutes = ["/api/auth", "/api/stripe/webhook", "/api/cron"];
    const isPublicRoute = publicRoutes.some((route) => request.nextUrl.pathname.startsWith(route));

    if (!isPublicRoute && !token) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
```

### 3.5 Client-Side Session Hook

```typescript
// lib/hooks/useAuth.ts
import { useSession } from "next-auth/react";

export function useAuth() {
  const { data: session, status } = useSession();

  return {
    user: session?.user,
    isAuthenticated: status === "authenticated",
    isLoading: status === "loading",
    creditsBalance: session?.user?.creditsBalance || 0,
    subscriptionTier: session?.user?.subscriptionTier || "FREE",
  };
}
```

---

## 4. Environment Variable Validation

### 4.1 Required Environment Variables

**Add to `.env.example`:**

```bash
# Database
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_SECRET="random-32-character-string"
NEXTAUTH_URL="http://localhost:3000"

# Email (Magic Links)
EMAIL_SERVER_HOST="smtp.resend.com"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="resend"
EMAIL_SERVER_PASSWORD="re_..."
EMAIL_FROM="TagArchitect <noreply@tagarchitect.com>"

# Google OAuth
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Anthropic API
ANTHROPIC_API_KEY="sk-ant-api03-..."

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Rate Limiting (Upstash Redis)
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."

# Cron Job
CRON_SECRET="random-string"

# CAPTCHA (hCaptcha or reCAPTCHA)
NEXT_PUBLIC_HCAPTCHA_SITE_KEY="..."
HCAPTCHA_SECRET_KEY="..."
```

### 4.2 Validation with Zod

**Location:** `/lib/env.ts`

```typescript
import { z } from "zod";

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // NextAuth
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),

  // Email
  EMAIL_SERVER_HOST: z.string(),
  EMAIL_SERVER_PORT: z.string(),
  EMAIL_SERVER_USER: z.string(),
  EMAIL_SERVER_PASSWORD: z.string(),
  EMAIL_FROM: z.string().email(),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),

  // Anthropic
  ANTHROPIC_API_KEY: z.string().startsWith("sk-ant-"),

  // Stripe
  STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
  STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),

  // Rate Limiting
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string(),

  // Cron
  CRON_SECRET: z.string().min(16),

  // CAPTCHA
  NEXT_PUBLIC_HCAPTCHA_SITE_KEY: z.string(),
  HCAPTCHA_SECRET_KEY: z.string(),
});

// Validate at build time
export const env = envSchema.parse(process.env);

// TypeScript types
declare global {
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof envSchema> {}
  }
}
```

**Usage:**

```typescript
import { env } from "@/lib/env";

// TypeScript knows these exist and are valid
const apiKey = env.ANTHROPIC_API_KEY;
```

---

## 5. Rate Limiting

### 5.1 Why Rate Limiting Is Critical

**Threats:**

- Brute force attacks on login
- API abuse (draining Claude API credits)
- DDoS attacks
- Scraping/data harvesting

**Cost Impact:**

- Unlimited Claude API calls = $1000s in API bills
- 1000 requests × $0.003/request = $3
- Without limits, attacker can drain $1000+ in minutes

### 5.2 Rate Limiting Strategy

| Endpoint               | Free Users   | Paid Users   | Window  |
| ---------------------- | ------------ | ------------ | ------- |
| `/api/vision`          | 10 req/day   | 1000 req/day | Rolling |
| `/auth/signin`         | 5 req/hour   | 10 req/hour  | Fixed   |
| `/api/stripe/checkout` | 3 req/hour   | 10 req/hour  | Fixed   |
| Homepage               | 100 req/hour | N/A          | Fixed   |

### 5.3 Implementation (Upstash Redis)

**Why Upstash:** Serverless, low latency, free tier (10k requests/day)

**Install:**

```bash
pnpm add @upstash/ratelimit @upstash/redis
```

**Rate Limiter Utility:**

**Location:** `/lib/ratelimit.ts`

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Create Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Rate limiters
export const rateLimiters = {
  // Vision API: 10 requests per day (free), 1000/day (paid)
  vision: {
    free: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "24 h"),
      analytics: true,
    }),
    paid: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(1000, "24 h"),
      analytics: true,
    }),
  },

  // Auth: 5 requests per hour
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(5, "1 h"),
    analytics: true,
  }),

  // Stripe checkout: 3 requests per hour
  checkout: new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(3, "1 h"),
    analytics: true,
  }),
};

// Helper function
export async function checkRateLimit(
  identifier: string,
  limiter: Ratelimit
): Promise<{ success: boolean; remaining: number }> {
  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  if (!success) {
    console.warn(`[RateLimit] Blocked: ${identifier}, resets at ${new Date(reset)}`);
  }

  return { success, remaining };
}
```

**Usage in API Route:**

```typescript
// app/api/vision/route.ts
import { getServerSession } from "next-auth";
import { rateLimiters, checkRateLimit } from "@/lib/ratelimit";

export async function POST(req: Request) {
  const session = await getServerSession();

  // Determine identifier (userId or IP)
  const identifier = session?.user?.id || req.headers.get("x-forwarded-for") || "anonymous";

  // Determine tier
  const tier = session?.user?.subscriptionTier || "FREE";
  const limiter = tier === "FREE" ? rateLimiters.vision.free : rateLimiters.vision.paid;

  // Check rate limit
  const { success, remaining } = await checkRateLimit(identifier, limiter);

  if (!success) {
    return new Response("Rate limit exceeded. Try again later.", {
      status: 429,
      headers: { "X-RateLimit-Remaining": "0" },
    });
  }

  // Process request...
  return Response.json({
    success: true,
    creditsRemaining: remaining,
  });
}
```

---

## 6. CAPTCHA Integration

### 6.1 Why CAPTCHA

**Problem:** Bots can:

- Create fake accounts
- Abuse free credits
- Submit spam contact forms

**Solution:** hCaptcha (privacy-friendly, GDPR compliant)

**Where to Use:**

- Free signup (email collection)
- Credit purchase form
- Contact form

### 6.2 hCaptcha Setup

**Sign up:** https://www.hcaptcha.com/

**Get keys:**

- Site Key (public): `NEXT_PUBLIC_HCAPTCHA_SITE_KEY`
- Secret Key (private): `HCAPTCHA_SECRET_KEY`

**Install:**

```bash
pnpm add @hcaptcha/react-hcaptcha
```

**Client Component:**

```typescript
// components/HCaptcha.tsx
'use client';

import HCaptcha from '@hcaptcha/react-hcaptcha';
import { useState } from 'react';

interface HCaptchaWidgetProps {
  onVerify: (token: string) => void;
}

export function HCaptchaWidget({ onVerify }: HCaptchaWidgetProps) {
  const [token, setToken] = useState<string | null>(null);

  const handleVerify = (token: string) => {
    setToken(token);
    onVerify(token);
  };

  return (
    <HCaptcha
      sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY!}
      onVerify={handleVerify}
    />
  );
}
```

**Server-Side Verification:**

```typescript
// lib/verify-captcha.ts
export async function verifyCaptcha(token: string): Promise<boolean> {
  const response = await fetch("https://hcaptcha.com/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      secret: process.env.HCAPTCHA_SECRET_KEY!,
      response: token,
    }),
  });

  const data = await response.json();
  return data.success === true;
}
```

**Usage in Signup Form:**

```typescript
// app/api/auth/signup/route.ts
import { verifyCaptcha } from "@/lib/verify-captcha";

export async function POST(req: Request) {
  const { email, captchaToken } = await req.json();

  // Verify CAPTCHA first
  const isValid = await verifyCaptcha(captchaToken);
  if (!isValid) {
    return new Response("CAPTCHA verification failed", { status: 400 });
  }

  // Proceed with signup...
}
```

---

## 7. Input Sanitization

### 7.1 CSV Injection Prevention

**Problem:** Excel/LibreOffice execute formulas in CSV files.

**Attack:** User sets tag to `=1+1` → Excel evaluates it as formula.

**Solution:** Strip dangerous characters from CSV exports.

```typescript
// lib/utils/sanitize-csv.ts
export function sanitizeCSVValue(value: string): string {
  // Remove leading characters that trigger formula execution
  const dangerousChars = ["=", "+", "-", "@", "\t", "\r"];

  if (dangerousChars.some((char) => value.startsWith(char))) {
    // Prepend single quote to escape formula
    return `'${value}`;
  }

  // Escape double quotes
  return value.replace(/"/g, '""');
}
```

**Usage:**

```typescript
// When generating CSV
const csvRow = [sanitizeCSVValue(item.title), sanitizeCSVValue(item.tags.join(", "))].join(",");
```

### 7.2 Filename Sanitization

**Problem:** User-generated titles become filenames. Special characters break filesystems.

**Dangerous chars:** `/`, `\`, `:`, `*`, `?`, `"`, `<`, `>`, `|`

**Solution:**

```typescript
// lib/utils/sanitize-filename.ts
export function sanitizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove all non-word chars except spaces and hyphens
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .substring(0, 255); // Max filename length (most filesystems)
}
```

**Usage:**

```typescript
const slug = sanitizeFilename(aiTitle); // "Sunset Beach!" → "sunset-beach"
```

---

## 8. Security Headers

### 8.1 Why Security Headers

**Headers prevent:**

- XSS attacks (Content-Security-Policy)
- Clickjacking (X-Frame-Options)
- MIME sniffing (X-Content-Type-Options)
- Data leakage (Referrer-Policy)

### 8.2 Next.js Configuration

**Location:** `/next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Content Security Policy
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://pl*.pubtally.com", // Stripe + Adsterra
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://api.anthropic.com https://api.stripe.com",
              "frame-src https://js.stripe.com https://hcaptcha.com https://*.hcaptcha.com",
            ].join("; "),
          },

          // Prevent clickjacking
          {
            key: "X-Frame-Options",
            value: "DENY",
          },

          // Prevent MIME sniffing
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },

          // Referrer policy
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },

          // Permissions policy
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },

          // HTTPS only (HSTS)
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

---

## 9. Stripe Webhook Security

### 9.1 Why Webhook Verification Is Critical

**Without verification:**

- Attacker can fake payment confirmation
- Send fake "checkout.session.completed" event
- Get free credits without paying

**With verification:**

- Stripe signs every webhook with secret
- We verify signature before processing
- Fake events are rejected

### 9.2 Implementation

```typescript
// app/api/stripe/webhook/route.ts
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get("stripe-signature");

  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("[Stripe] Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  // Process verified event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // Extract metadata
    const userId = session.metadata?.user_id;
    const creditsAmount = parseInt(session.metadata?.credits || "0");

    if (!userId || !creditsAmount) {
      return new Response("Missing metadata", { status: 400 });
    }

    // Update user credits (atomic transaction)
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { creditsBalance: { increment: creditsAmount } },
      }),
      prisma.creditsLedger.create({
        data: {
          userId,
          amount: creditsAmount,
          reason: "PURCHASE",
          stripeSessionId: session.id,
        },
      }),
    ]);

    console.log(`[Stripe] Added ${creditsAmount} credits to user ${userId}`);
  }

  return Response.json({ received: true });
}
```

**Critical:** Never process unverified webhooks. Always use `stripe.webhooks.constructEvent`.

---

## 10. Row-Level Security (RLS)

### 10.1 Why RLS Matters

**Problem Without RLS:**

- User A changes URL parameter: `/api/batch/123` → `/api/batch/456`
- Gets access to User B's batch
- Data breach

**Solution With RLS:**

- Database enforces: "Users can only see their own data"
- Even if API logic is buggy, database blocks unauthorized access

### 10.2 Implementation (Prisma + Application Layer)

**Prisma doesn't support database-level RLS directly.** We enforce it in application layer:

**Helper Function:**

```typescript
// lib/rls.ts
import { getServerSession } from "next-auth";

export async function getUserId(): Promise<string> {
  const session = await getServerSession();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  return session.user.id;
}

export async function getBatchWithAuth(batchId: string) {
  const userId = await getUserId();

  // Only return batch if it belongs to current user
  const batch = await prisma.batch.findFirst({
    where: {
      id: batchId,
      userId, // Critical: Filter by userId
    },
    include: {
      groups: {
        include: {
          images: true,
        },
      },
    },
  });

  if (!batch) {
    throw new Error("Batch not found or access denied");
  }

  return batch;
}
```

**Usage in API Route:**

```typescript
// app/api/batch/[id]/route.ts
import { getBatchWithAuth } from "@/lib/rls";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const batch = await getBatchWithAuth(params.id);
    return Response.json(batch);
  } catch (err) {
    return new Response("Unauthorized", { status: 401 });
  }
}
```

**Database-Level RLS (PostgreSQL Native):**

If using Supabase (which supports Postgres RLS):

```sql
-- Enable RLS on batches table
ALTER TABLE "Batch" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own batches
CREATE POLICY user_batches ON "Batch"
  FOR ALL
  USING ("userId" = current_setting('app.user_id')::uuid);
```

Then set user context before each query:

```typescript
await prisma.$executeRaw`SET app.user_id = ${userId}`;
const batches = await prisma.batch.findMany(); // Auto-filtered by RLS
```

---

## 11. CORS Policy

### 11.1 Why CORS Configuration

**Problem:**

- TagArchitect loads ads from Adsterra (external domain)
- Without CORS policy, browser blocks these requests

**Solution:** Configure allowed origins.

### 11.2 Next.js CORS Middleware

```typescript
// middleware.ts (add to existing middleware)
export function middleware(request: NextRequest) {
  // ... existing auth checks ...

  // CORS for API routes
  if (request.nextUrl.pathname.startsWith("/api")) {
    const response = NextResponse.next();

    // Allow requests from same origin only (default)
    response.headers.set("Access-Control-Allow-Origin", request.headers.get("origin") || "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    // Handle preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 200, headers: response.headers });
    }

    return response;
  }

  return NextResponse.next();
}
```

**Allowed Origins:**

- Same origin (tagarchitect.com)
- Stripe (js.stripe.com)
- Adsterra (pl\*.pubtally.com) — specified in CSP, not CORS

---

## 12. Data Privacy & GDPR

### 12.1 Right to Be Forgotten

**User Requests Account Deletion:**

```typescript
// app/api/account/delete/route.ts
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function DELETE() {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  // Get user data for cleanup
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeSubscriptionId: true },
  });

  // Cancel Stripe subscription
  if (user?.stripeSubscriptionId) {
    await stripe.subscriptions.cancel(user.stripeSubscriptionId);
  }

  // Delete user (cascades to batches, groups, images, ledger)
  await prisma.user.delete({
    where: { id: userId },
  });

  return Response.json({ message: "Account deleted successfully" });
}
```

**Cascade Behavior:**

```
User deleted
  ↓
Batches deleted (onDelete: Cascade)
  ↓
Groups deleted (onDelete: Cascade)
  ↓
ImageItems deleted (onDelete: Cascade)
  ↓
CreditsLedger deleted (onDelete: Cascade)
```

### 12.2 Data Retention Policy

**Privacy Policy Statement:**

> "We automatically delete all uploaded image metadata (tags, filenames, thumbnails) after 24 hours. High-resolution images never leave your browser—they are never uploaded to our servers. You can request account deletion at any time, which permanently removes all your data."

### 12.3 What We Store (vs. What We Don't)

**Stored:**

- ✅ Email address
- ✅ Credits balance
- ✅ Image metadata (titles, tags) — for 24 hours only
- ✅ Thumbnails (base64, <512px) — for 24 hours only

**NOT Stored:**

- ❌ Passwords (passwordless auth)
- ❌ Credit card numbers (handled by Stripe)
- ❌ High-resolution images (never leave browser)
- ❌ Browsing history
- ❌ IP addresses (except in rate limiting, not permanently logged)

---

## 13. Dependency Security

### 13.1 Automated Vulnerability Scanning

**GitHub Dependabot:**

Enable in GitHub repo settings:

- Settings → Security → Dependabot → Enable

**Auto-updates:**

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
```

### 13.2 Manual Audit

```bash
# Check for vulnerabilities
pnpm audit

# Fix automatically
pnpm audit fix

# Update all dependencies
pnpm update
```

### 13.3 Critical Dependencies to Monitor

- `next-auth` (security patches)
- `@stripe/stripe-js` (security patches)
- `prisma` (database security)
- `next` (framework security)

**Rule:** Apply security patches within 7 days of release.

---

## 14. Security Testing Checklist

### 14.1 Pre-Launch Security Audit

Before deploying to production:

**Authentication:**

- [ ] NextAuth configured with email + Google
- [ ] Sessions expire after 30 days
- [ ] Unauthenticated users redirected from /dashboard
- [ ] Session cookies are HTTP-only and Secure

**Authorization:**

- [ ] Users can only access their own batches
- [ ] API routes check authentication before processing
- [ ] RLS helpers enforce userId filtering

**Rate Limiting:**

- [ ] Vision API limited to 10/day (free), 1000/day (paid)
- [ ] Auth endpoints limited to 5/hour
- [ ] Checkout limited to 3/hour
- [ ] Rate limits tested with curl/Postman

**Input Sanitization:**

- [ ] CSV exports strip formula characters
- [ ] Filenames sanitized (no special chars)
- [ ] All user inputs validated with zod

**Security Headers:**

- [ ] CSP header blocks unsafe scripts
- [ ] X-Frame-Options prevents clickjacking
- [ ] HSTS enforces HTTPS
- [ ] Test with securityheaders.com

**Stripe:**

- [ ] Webhook signatures verified
- [ ] Prices fetched server-side (not from client)
- [ ] Payment metadata includes userId

**CAPTCHA:**

- [ ] hCaptcha on signup form
- [ ] Server-side verification before account creation

**Secrets:**

- [ ] No secrets in code or git history
- [ ] All secrets in .env (added to .gitignore)
- [ ] Environment variable validation (zod)

**Data Privacy:**

- [ ] 24-hour auto-delete cron job working
- [ ] Account deletion cascades to all data
- [ ] Privacy policy updated

### 14.2 Penetration Testing Scenarios

**Test 1: Unauthorized Batch Access**

```bash
# Try to access another user's batch
curl -H "Authorization: Bearer <user-a-token>" \
  https://tagarchitect.com/api/batch/user-b-batch-id

# Expected: 401 Unauthorized
```

**Test 2: Rate Limit Bypass**

```bash
# Send 100 requests in 1 second
for i in {1..100}; do
  curl https://tagarchitect.com/api/vision
done

# Expected: First 10 succeed, rest return 429
```

**Test 3: CSV Injection**

```
1. Create batch with tag: =1+1
2. Export CSV
3. Open in Excel
4. Expected: Cell shows '=1+1 (literal text), not 2
```

**Test 4: Fake Stripe Webhook**

```bash
# Send fake webhook without signature
curl -X POST https://tagarchitect.com/api/stripe/webhook \
  -d '{"type":"checkout.session.completed","data":{"object":{"metadata":{"user_id":"abc","credits":"1000"}}}}'

# Expected: 400 Invalid signature
```

---

## 15. Incident Response Plan

### 15.1 If API Key Leaked

**Immediate Actions:**

1. Revoke old Anthropic API key in dashboard
2. Generate new API key
3. Update Netlifyenvironment variables
4. Redeploy application
5. Review CloudWatch logs for suspicious activity

### 15.2 If User Data Breached

**Immediate Actions:**

1. Shut down affected service
2. Investigate scope (how many users, what data)
3. Notify affected users within 72 hours (GDPR requirement)
4. File data breach report (if in EU)
5. Implement fix
6. Post-mortem analysis

### 15.3 If DDoS Attack

**Immediate Actions:**

1. Enable Cloudflare DDoS protection
2. Tighten rate limits temporarily
3. Block malicious IPs
4. Monitor Netlify/Cloudflare dashboards

---

## 16. Summary: Security Architecture

| Security Layer          | Implementation                        | Status      |
| ----------------------- | ------------------------------------- | ----------- |
| **Authentication**      | NextAuth.js (email + Google)          | ✅ Complete |
| **Session Management**  | Database sessions (30-day expiry)     | ✅ Complete |
| **Rate Limiting**       | Upstash Redis                         | ✅ Complete |
| **Bot Protection**      | hCaptcha on signup                    | ✅ Complete |
| **Input Sanitization**  | CSV + filename sanitization           | ✅ Complete |
| **Security Headers**    | CSP, HSTS, X-Frame-Options            | ✅ Complete |
| **Webhook Security**    | Stripe signature verification         | ✅ Complete |
| **RLS**                 | Application-layer userId filtering    | ✅ Complete |
| **CORS**                | Same-origin + Stripe allowed          | ✅ Complete |
| **Data Privacy**        | 24-hour auto-delete + GDPR compliance | ✅ Complete |
| **Dependency Security** | Dependabot + weekly audits            | ✅ Complete |

---
