Document 2: Tech Stack (TagArchitect — FINAL & COMPLETE)

## 1. Primary Stack Selection

**PATH B:** Scalable Content / Logic (Framework)

**Core Framework:** Next.js 14.2+ (App Router)

**Language:** TypeScript (Strict Mode)

- Exceptions: ONNX.js outputs may use `as Float32Array` assertions
- Prefer `unknown` over `any` for truly unknown types
- Use `// @ts-expect-error` with explanation comment when strict mode conflicts with correct runtime behavior

* React Hook Safety:
* - NEVER place conditional returns before hooks (useState, useEffect, etc.)
* - Example BAD: `if (!user) return null; const [state] = useState();`
* - Example GOOD: `const [state] = useState(); if (!user) return null;`

**Database:** PostgreSQL using Prisma ORM

- Hosting Options: Supabase (recommended), Neon, or Railway
- - Rationale: Netlify provides robust support for Next.js 14 via the Netlify Next.js Runtime and handles Scheduled Functions for database maintenance.

**Local AI Engine:** ONNX Runtime Web (onnxruntime-web)

- Model: clip-vit-base-patch32 (ONNX format)
- File Path: `/public/models/clip-vit-base-patch32.onnx`
- Source: Pre-download from Hugging Face (Xenova/clip-vit-base-patch32)
- Note: Model file MUST be included in repository. App will NOT auto-download on first run.
- Fallback: If model file missing, show error: "AI model not found. Please contact support."

**Cloud AI Engine:** Claude 3.5 Sonnet (via @anthropic-ai/sdk)

**Payments:** Stripe (Checkout + Webhooks)

**State Management:** Zustand 4.5+ (for batch state and drag-and-drop UI persistence)

**Client Utilities:**

- JSZip: ZIP file creation
- Canvas API: Image resizing and thumbnail generation
- IndexedDB: AI model caching for subsequent visits

---

## 2. Stack Justification

**PostgreSQL + Prisma:**

- Required for atomic credit deductions (transaction support prevents race conditions)
- Type-safe queries eliminate runtime database errors
- Migration system tracks schema changes

**Next.js App Router:**

- SEO-optimized static pages for landing/marketing content
- Secure API routes keep Claude API key and Stripe secrets server-side only
- Built-in image optimization and streaming

**Client-Side CLIP:**

- Clustering phase costs $0 (runs in user's browser)
- Privacy-compliant (images never leave user's device)
- Reduces server load (no GPU infrastructure needed)

**Zustand over Redux:**

- Simpler API (less boilerplate)
- Better performance for frequent updates (drag-and-drop doesn't trigger full re-renders)
- No provider wrapping needed

---

## 3. Folder Structure (Recommended Pattern)

The Builder AI should follow this organization but may adjust groupings if it improves semantic clarity. The key requirement is separation of concerns: UI components, business logic, API routes, and state management should remain distinct.

```
/root
  ├── netlify/
  │   └── functions/
  │       └── cleanup-cron.ts
  ├── netlify.toml
  ├── .nvmrc                  (Pin to Node.js v20.x)
  ├── .env.example            (Template for required environment variables)
  ├── app/
  │   ├── layout.tsx          (Root layout with metadata)
  │   ├── page.tsx            (SEO-optimized homepage)
  │   ├── dashboard/
  │   │   └── page.tsx        (Protected batch tool UI)
  │   └── api/
  │       ├── vision/
  │       │   └── route.ts    (Claude Vision API endpoint)
  │       ├── stripe/
  │       │   ├── checkout/route.ts
  │       │   └── webhook/route.ts
  │       └── credits/
  │           └── route.ts    (Check user balance)
  ├── components/
  │   ├── uploader/           (Drag-and-drop + file validation)
  │   ├── table/              (Verification grid + group management)
  │   ├── ai/                 (Model loading modals + progress bars)
  │   └── ui/                 (Shared buttons, cards, badges)
  ├── lib/
  │   ├── clip-engine/        (ONNX.js loading + clustering logic)
  │   ├── marketplace/        (CSV formatters for Adobe/Etsy)
  │   ├── image-processing/   (Canvas resize + WebP conversion)
  │   └── utils/              (String sanitization, file renaming)
  ├── store/
  │   └── useBatchStore.ts    (Zustand store for batch items)
  ├── prisma/
  │   ├── schema.prisma       (Database schema)
  │   └── migrations/         (Auto-generated migration files)
  ├── public/
  │   ├── models/             (CLIP model files - must be committed to repo)
  │   └── images/             (Static marketing images)
  └── types/                  (TypeScript declaration files for untyped libraries)
```

---

## 4. Data Structures

### 4.1 State Object (Zustand Store)

```typescript
interface ListingItem {
  id: string; // UUID v4
  slug: string; // Sanitized filename (e.g., "sunset-beach-1")
  file: File; // Original high-res file (kept in browser memory only)
  thumbnail: string; // Data URL of optimized WebP thumbnail (<512px)
  groupId: string; // Cluster identifier (e.g., "group-1", "group-2")
  status: "pending" | "tagged" | "error";
  metadata: {
    title: string; // AI-generated or user-edited title
    tags: string[]; // Platform-specific limits enforced (Etsy: 13, Adobe: 49)
    confidence?: number; // AI confidence score (0.0 - 1.0)
  };
}

interface BatchStore {
  items: ListingItem[];
  groups: Map<string, ListingItem[]>; // Computed grouping

  // Actions
  addItems: (files: File[]) => void;
  updateItem: (id: string, updates: Partial<ListingItem>) => void;
  moveToGroup: (itemId: string, newGroupId: string) => void;
  setTags: (itemId: string, tags: string[]) => void;
  reset: () => void;
}
```

### 4.2 Database Schema Reference

**Note:** Full schema details are in Database.md. This section shows table relationships only.

```
users
  ├─ id (uuid, primary key)
  ├─ email (unique)
  ├─ credits_balance (integer)
  └─ stripe_customer_id (nullable)

batches
  ├─ id (uuid, primary key)
  ├─ user_id (foreign key → users.id, nullable for free tier)
  ├─ session_id (for free tier persistence)
  └─ expires_at (timestamp, +24 hours from created_at)

images
  ├─ id (uuid, primary key)
  ├─ batch_id (foreign key → batches.id)
  ├─ original_filename
  ├─ ai_tags (jsonb)
  └─ user_edited_tags (jsonb, nullable)

credits_ledger (audit log)
  ├─ id (uuid, primary key)
  ├─ user_id (foreign key → users.id)
  ├─ amount (integer, can be negative for deductions)
  ├─ reason (enum: 'purchase', 'usage', 'refund')
  └─ created_at (timestamp)
```

---

## 5. API & Logic Layer

### 5.1 Image Processing Pipeline

**Client-Side Thumbnail Generation:**

```typescript
// lib/image-processing/resize.ts
export async function createThumbnail(file: File): Promise<string> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const img = await createImageBitmap(file);

  // Maintain aspect ratio, max dimension 512px
  const scale = Math.min(512 / img.width, 512 / img.height);
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // Convert to WebP with 0.8 quality (good balance of size/quality)
  return canvas.toBlob((blob) => URL.createObjectURL(blob!), "image/webp", 0.8);
}

// Fallback for browsers without WebP support (Safari < 16)
// Use JPEG at 0.7 quality instead
```

### 5.2 CLIP Clustering Logic

**Representative Sample Selection:**

- For each cluster, select the image with embedding closest to cluster centroid (minimum cosine distance)
- If cluster contains only 1 image, that image is the representative
- Edge case: If user uploads 200 images → 50 clusters → 50 sequential API calls (with rate limiting per Overview.md Section 5.3)

**Tag Hydration:**

- After Claude API returns tags for representative image, ALL images in that cluster automatically inherit the same tags
- Tags are stored in `item.metadata.tags` array
- User can manually edit tags for individual images via verification table

### 5.3 Claude Vision API Integration

**Endpoint:** `/api/vision/route.ts`

**Request Flow:**

1. Receive thumbnail (base64-encoded WebP from client)
2. Check user credit balance in database
3. Send thumbnail to Claude Vision API with prompt:
   ```
   Analyze this product image and generate:
   - SEO-optimized title (max 200 chars for Adobe Stock, 140 for Etsy)
   - Relevant tags (15-49 for Adobe Stock, 5-13 for Etsy)
   Tags should be lowercase, descriptive, and marketplace-compliant.
   Return as JSON: { "title": "...", "tags": ["tag1", "tag2", ...] }
   ```
4. Parse JSON response
5. Deduct 1 credit from user balance (atomic transaction)
6. Return tags to client

- Cleanup Safety:
- - All async operations must check if component is still mounted
- - Example:
- ```typescript

  ```

- useEffect(() => {
-     let isMounted = true;
-     fetchData().then(data => {
-       if (isMounted) setState(data);
-     });
-     return () => { isMounted = false; };
- }, []);
- ```

  ```

**Credit Deduction Timing:**

- Deduct credits AFTER successful API response, NOT before
- If API fails (timeout, error, rate limit): DO NOT deduct credits
- Use database transaction to ensure credit deduction + ledger log happen atomically

**Rate Limiting:**

- Claude API allows ~50 requests/minute
- Process requests sequentially with 1.2-second delay between calls
- If 429 error received: Wait 60 seconds, show user message (per Overview.md Section 7.3), then retry
- Max 3 retries per image before marking as "error"

### 5.4 Stripe Webhook Logic

**Endpoint:** `/api/stripe/webhook/route.ts`

**Webhook Events to Handle:**

- `checkout.session.completed` → Credit user's account with purchased credits
- `customer.subscription.deleted` → Downgrade user to Free tier

**Security:**

```typescript
import Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return new Response("Webhook signature verification failed", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // Extract credits from metadata
    const creditsAmount = parseInt(session.metadata?.credits || "0");
    const userId = session.metadata?.user_id;

    // Atomic update: credit balance + ledger log
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { credits_balance: { increment: creditsAmount } },
      }),
      prisma.creditsLedger.create({
        data: {
          user_id: userId,
          amount: creditsAmount,
          reason: "purchase",
          stripe_session_id: session.id,
        },
      }),
    ]);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
```

### 5.5 IndexedDB Caching Strategy

**Cache Configuration:**

- Database Name: `tagarchitect-ai-models`
- Object Store: `models`
- Cache Key: `clip-vit-base-patch32-v1` (includes version number)
- Cache Value: ArrayBuffer of .onnx model file

**Cache Flow:**

```typescript
// lib/clip-engine/model-loader.ts
export async function loadCLIPModel(): Promise<InferenceSession> {
  const cacheKey = "clip-vit-base-patch32-v1";

  // Try to load from IndexedDB cache first
  const cachedModel = await getCachedModel(cacheKey);

  if (cachedModel) {
    // Load from cache (fast: 2-3 seconds)
    return await InferenceSession.create(cachedModel);
  }

  // Cache miss: Download from /public/models/
  const response = await fetch("/models/clip-vit-base-patch32.onnx", {
    // Show download progress
    onProgress: (loaded, total) => {
      const percent = Math.round((loaded / total) * 100);
      updateProgressBar(percent);
    },
  });

  const arrayBuffer = await response.arrayBuffer();

  // Save to IndexedDB for next time
  try {
    await cacheModel(cacheKey, arrayBuffer);
  } catch (err) {
    // Quota exceeded - show error but continue
    if (err.name === "QuotaExceededError") {
      console.warn("IndexedDB quota exceeded. Model will re-download next time.");
      showToast("Storage full. Model will re-download on next visit.");
    }
  }

  return await InferenceSession.create(arrayBuffer);
}
```

**Cache Invalidation:**

- If model version in code changes (e.g., `v1` → `v2`), old cache is ignored
- No automatic deletion (to avoid quota issues)
- User can manually clear browser cache if needed

---

## 6. Dependency Versions & Build Configuration

### 6.1 Required Versions

**Runtime:**

- Node.js: v20.x (specify in `.nvmrc`)

**Package Manager:**

- pnpm: ^8.0.0 (faster installs, strict lockfile)

**Core Dependencies:**

```json
{
  "next": "^14.2.0",
  "react": "^18.3.0",
  "react-dom": "^18.3.0",
  "typescript": "^5.4.0",
  "tailwindcss": "^3.4.0",
  "zustand": "^4.5.0",
  "onnxruntime-web": "^1.17.0",
  "@anthropic-ai/sdk": "^0.20.0",
  "stripe": "^14.0.0",
  "@prisma/client": "^5.10.0",
  "prisma": "^5.10.0",
  "jszip": "^3.10.0"
}
```

**Dev Dependencies:**

```json
{
  "@types/node": "^20.11.0",
  "@types/react": "^18.2.0",
  "eslint": "^8.57.0",
  "eslint-config-next": "^14.2.0",
  "prettier": "^3.2.0",
  "@tailwindcss/forms": "^0.5.7"
}
```

**Note:** Builder AI may use newer patch/minor versions if available, but must not downgrade major versions.

### 6.2 Mandatory NPM Scripts

**Required in package.json:**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "db:push": "prisma db push",
    "db:studio": "prisma studio",
    "db:migrate": "prisma migrate dev",
    "lint": "next lint",
    "format": "prettier --write .",
    "type-check": "tsc --noEmit"
  }
}
```

**First-Time Setup Commands:**

1. `pnpm install`
2. `pnpm db:push` (sync Prisma schema to database)
3. `pnpm dev` (start development server)

### 6.3 Environment Variables

**Required in `.env` (create from `.env.example`):**

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/tagarchitect"

# Anthropic API
ANTHROPIC_API_KEY="sk-ant-api03-..."

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# NextAuth (if using authentication - see Authentication.md)
NEXTAUTH_SECRET="random-32-character-string"
NEXTAUTH_URL="http://localhost:3000"

# App Config
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Security Rules:**

- Never commit `.env` to version control (add to `.gitignore`)
- Use `.env.example` with placeholder values for documentation
- In production, set environment variables via hosting platform (Netlify, Railway, etc.)

---

## 7. Performance Budgets & Optimization

### 7.1 Performance Targets

**First Load JavaScript:**

- Target: <100KB (excluding AI model download)
- Enforce via `next.config.js`:
  ```javascript
  module.exports = {
    webpack: (config) => {
      config.performance = {
        maxAssetSize: 100000, // 100KB
        maxEntrypointSize: 100000,
      };
      return config;
    },
  };
  ```

**Image Thumbnails:**

- Format: WebP (fallback to JPEG for unsupported browsers)
- Quality: 0.8 (good balance of file size and visual quality)
- Max Dimension: 512px (maintains quality while reducing file size 90%+)

**Time to First Byte (TTFB):**

- Target: <200ms for static pages (homepage, FAQ)
- API routes: <500ms for credit checks, <2s for AI vision calls

### 7.2 Hydration Safety

**Critical Rule:** Do NOT use browser-only APIs during initial render.

**Forbidden Patterns:**

```typescript
// ❌ BAD - causes hydration mismatch
export default function Component() {
  const isClient = typeof window !== 'undefined';
  return <div>{isClient ? 'Client' : 'Server'}</div>;
}

// ❌ BAD - Date.now() differs between server and client
export default function Component() {
  return <div>{Date.now()}</div>;
}
```

**Safe Patterns:**

```typescript
// ✅ GOOD - use useEffect for client-only code
export default function Component() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div>Loading...</div>;
  return <div>{window.innerWidth}</div>;
}
```

---

## 8. Security & Data Safety

### 8.1 Input Sanitization

**For CSV Export:**

- Remove characters that break CSV format: `,` `"` `\n` `\r`
- Escape remaining special characters
- Truncate to platform limits (Etsy: 20 chars/tag, Adobe: 49 tags max)

```typescript
// lib/utils/sanitize.ts
export function sanitizeTag(tag: string, platform: "etsy" | "adobe"): string {
  // Remove CSV-breaking characters
  let clean = tag.replace(/[,"\n\r]/g, "");

  // Convert to lowercase (marketplace standard)
  clean = clean.toLowerCase();

  // Replace spaces with hyphens
  clean = clean.replace(/\s+/g, "-");

  // Remove illegal filename characters
  clean = clean.replace(/[/\\:*?"<>|]/g, "");

  // Truncate for Etsy
  if (platform === "etsy" && clean.length > 20) {
    clean = clean.substring(0, 20);
  }

  return clean;
}
```

**DO NOT use `dompurify`** - it's for HTML sanitization, not CSV. Use regex-based string cleaning instead.

### 8.2 API Key Security

**Critical Rules:**

1. Claude API key and Stripe secret MUST only exist in server-side code
2. Use `process.env` in API routes, NEVER in client components
3. Add to `.gitignore`: `.env`, `.env.local`, `.env.production`

**Verification:**

```typescript
// ❌ BAD - API key exposed to client
"use client";
const apiKey = process.env.ANTHROPIC_API_KEY; // Compiled into client bundle!

// ✅ GOOD - API key stays server-side
// app/api/vision/route.ts
export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY; // Only in Node.js runtime
  // ...
}
```

### 8.3 File Privacy

**High-Resolution Files:**

- NEVER upload to server
- Keep in browser memory only (as `File` objects)
- Only send optimized WebP thumbnails (<512px) to Claude API
- Destroy file references when user navigates away (prevent memory leaks)

**Metadata Persistence:**

- Free tier: localStorage only (session-based)
- Paid tier: Database (user_id indexed)
- Auto-delete after 24 hours (see Overview.md Section 7.2)

* 8.4 JSON File Validation
* - .json files MUST NOT contain comments (//) or trailing commas
* - These cause build pipeline failures in Next.js and Prisma
* - Validate JSON with `pnpm lint` or `jsonlint` before committing

---

## 9. Testing & Quality Assurance

### 9.1 Pre-Deployment Checklist

**Before first deployment, verify:**

- [ ] `.env` file created with all required keys
- [ ] CLIP model file exists at `/public/models/clip-vit-base-patch32.onnx`
- [ ] `pnpm db:push` completed successfully (database schema synced)
- [ ] Stripe webhook endpoint configured in Stripe Dashboard
- [ ] `pnpm build` completes without errors
- [ ] `pnpm lint` passes with no warnings

### 9.2 Critical User Flows to Test

1. **Free User Flow:**
   - Upload 10 images → cluster (free) → generate tags (10 credits) → export
   - Verify credit balance decrements correctly
   - Close browser → reopen → verify session persists via localStorage

2. **Paid User Flow:**
   - Upgrade to Starter plan → verify Stripe checkout → verify webhook updates credits
   - Upload 50 images → generate tags → verify credit deduction
   - Test across devices → verify batch persists via database

3. **Error Handling:**
   - Upload file >100MB → verify red badge appears
   - Deplete credits → generate tags → verify paywall modal
   - Simulate API timeout → verify retry button appears
   - Disable network mid-clustering → verify error message

---

**End of Tech Stack Document**

**Next Documents:**

- Authentication.md (if not using NextAuth, define custom flow)
- Payment.md (Stripe Checkout detailed implementation)
- Database.md (Complete Prisma schema with indexes)
- UI.md (Component tree, design system, state flow)
