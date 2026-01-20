Document 4: Ads & Monetization Strategy (TagArchitect — FINAL & COMPLETE)

## 1. Document Purpose

This document defines:

- Ad placement strategy (Adsterra, not AdSense)
- Who sees ads (free vs. paid users)
- Where ads appear (homepage vs. dashboard)
- How ads are implemented (technical specs)
- Conversion optimization (turning free users into paid)

**Core Principle:** Ads are a **secondary revenue stream**. Primary revenue is subscriptions. Ads should monetize free users without degrading the professional feel of the tool.

---

## 2. Monetization Overview

### 2.1 Revenue Streams (Priority Order)

**Primary Revenue: Subscriptions**

- Starter: €12/month (200 credits)
- Pro: €29/month (1,000 credits)
- Target: 80% of revenue from subscriptions

**Secondary Revenue: Ads (Adsterra)**

- Homepage banner ads
- Dashboard ads for free users only
- Target: 20% of revenue from ads

**Why Adsterra (Not AdSense):**

- AdSense rejected TagArchitect (common for utility sites)
- Adsterra accepts SaaS tools
- Lower CPM than AdSense (~$1-3 per 1000 views) but guaranteed approval
- Supports professional ad formats (not just display banners)

### 2.2 User Tiers & Ad Visibility

| User Tier                          | Homepage Ads   | Dashboard Ads    | Notes                                     |
| ---------------------------------- | -------------- | ---------------- | ----------------------------------------- |
| **Anonymous (Not Logged In)**      | ✅ Yes (2 ads) | N/A              | Visiting marketing page only              |
| **Free (Logged In, 0-10 credits)** | ✅ Yes (1 ad)  | ✅ Yes (1-2 ads) | Ads = monetization + conversion incentive |
| **Starter (€12/month)**            | ✅ Yes (1 ad)  | ❌ No ads        | Dashboard is ad-free                      |
| **Pro (€29/month)**                | ✅ Yes (1 ad)  | ❌ No ads        | Dashboard is ad-free                      |

**Rationale:**

- Homepage ads visible to all (even paid users) = acceptable (they're not using the tool yet)
- Dashboard ads ONLY for free users = conversion incentive ("Upgrade to remove ads")
- Paid users get clean, professional experience in dashboard

---

## 3. Ad Placement Specifications

### 3.1 Homepage (Marketing Page) — All Users

**Ad Unit 1: Hero Banner (Top)**

- **Location:** Below hero section, above "Features" section
- **Format:** Horizontal banner (728×90 leaderboard on desktop, 320×50 on mobile)
- **Adsterra Code:** Social Bar or Banner
- **Styling:**
  - Container: `bg-slate-50 border-y border-slate-200 py-4`
  - Centered: `max-w-7xl mx-auto`
  - Label (optional): Small text "Advertisement" (text-xs text-slate-400 mb-2)
- **CLS Prevention:** `min-h-[90px]` on desktop, `min-h-[50px]` on mobile

**Ad Unit 2: Pre-Footer (Bottom)**

- **Location:** Above footer, below pricing section
- **Format:** Medium rectangle (300×250 on all devices)
- **Adsterra Code:** Banner
- **Styling:**
  - Container: `bg-white rounded-xl p-4 border border-slate-200 mx-auto`
  - Max-width: `max-w-xs mx-auto`
  - Label: "Advertisement" (text-xs text-slate-400 mb-2)
- **CLS Prevention:** `min-h-[250px]`

**Visual Example (Homepage):**

```
┌─────────────────────────────────────────┐
│ Hero Section (Title, CTA)               │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ [  AD UNIT 1: 728×90 Banner  ]          │ ← All users see this
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ Features Section                        │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ Pricing Section                         │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ [  AD UNIT 2: 300×250 Rectangle  ]      │ ← All users see this
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ Footer                                  │
└─────────────────────────────────────────┘
```

### 3.2 Dashboard (Tool Interface) — Free Users Only

**Ad Unit 3: Sidebar Right (Desktop Only)**

- **Visibility:** Free users ONLY (if user.subscription_tier === 'free')
- **Location:** Right sidebar (sticky, follows scroll)
- **Format:** Skyscraper (160×600 or 300×600)
- **Adsterra Code:** Banner
- **Styling:**
  - Position: `sticky top-24 right-8`
  - Container: `bg-white rounded-xl p-4 border border-slate-200 shadow-sm`
  - Label: "Advertisement" (text-xs text-slate-400 mb-2)
- **CLS Prevention:** `min-h-[600px] w-[160px]` or `w-[300px]`
- **Mobile:** Hidden (no space for sidebar)

**Ad Unit 4: In-Content (Mobile Only)**

- **Visibility:** Free users ONLY
- **Location:** Between VerificationGrid and StickyActionBar
- **Format:** Mobile banner (320×100)
- **Adsterra Code:** Banner
- **Styling:**
  - Container: `bg-slate-50 rounded-lg p-4 mb-4`
  - Centered: `mx-auto`
  - Label: "Advertisement" (text-xs text-slate-400 mb-2)
- **CLS Prevention:** `min-h-[100px]`
- **Desktop:** Hidden (sidebar used instead)

**Visual Example (Dashboard — Free User, Desktop):**

```
┌─────────────────────────────────────────────────────────┐
│ Header (Logo, Credits, Avatar)                          │
└─────────────────────────────────────────────────────────┘
┌────────────────────────────┬────────────────────────────┐
│                            │ [  AD UNIT 3:  ]           │
│ Main Content               │ [  160×600     ]           │ ← Sticky
│ (VerificationGrid)         │ [  Skyscraper  ]           │
│                            │                            │
│                            │ (Follows scroll)           │
│                            │                            │
└────────────────────────────┴────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ Sticky Action Bar (Marketplace, Export)                 │
└─────────────────────────────────────────────────────────┘
```

**Visual Example (Dashboard — Paid User):**

```
┌─────────────────────────────────────────────────────────┐
│ Header (Logo, Credits, Avatar)                          │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│                                                          │
│ Main Content (VerificationGrid)                         │
│                                                          │
│ [  NO ADS — Clean, Premium Experience  ]                │
│                                                          │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ Sticky Action Bar (Marketplace, Export)                 │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Technical Implementation

### 4.1 Adsterra Integration

**Step 1: Create Adsterra Account**

- Sign up at https://publishers.adsterra.com/
- Add domain: `tagarchitect.com` (or your domain)
- Verify ownership (add meta tag or DNS record)

**Step 2: Create Ad Zones**
In Adsterra dashboard, create 4 ad zones:

1. **Homepage Banner Top** — 728×90 (or responsive)
2. **Homepage Rectangle Bottom** — 300×250
3. **Dashboard Sidebar** — 160×600 or 300×600
4. **Dashboard Mobile** — 320×100

Each zone gets a unique embed code.

**Step 3: Embed Code Structure**

Adsterra provides code like this:

```html
<script async="async" data-cfasync="false" src="//pl123456.pubtally.com/..."></script>
```

**Implementation in Next.js:**

**Create `/components/ads/AdUnit.tsx`:**

```typescript
'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

interface AdUnitProps {
  zone: 'homepage-banner-top' | 'homepage-rectangle-bottom' | 'dashboard-sidebar' | 'dashboard-mobile';
  className?: string;
}

export function AdUnit({ zone, className = '' }: AdUnitProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore(state => state.user);

  // Configuration per zone
  const adConfig = {
    'homepage-banner-top': {
      script: '//pl123456.pubtally.com/homepage-top.js',
      minHeight: 'min-h-[90px]',
      showToTiers: ['free', 'starter', 'pro', null], // null = not logged in
    },
    'homepage-rectangle-bottom': {
      script: '//pl123456.pubtally.com/homepage-bottom.js',
      minHeight: 'min-h-[250px]',
      showToTiers: ['free', 'starter', 'pro', null],
    },
    'dashboard-sidebar': {
      script: '//pl123456.pubtally.com/dashboard-sidebar.js',
      minHeight: 'min-h-[600px]',
      showToTiers: ['free'], // Only free users
    },
    'dashboard-mobile': {
      script: '//pl123456.pubtally.com/dashboard-mobile.js',
      minHeight: 'min-h-[100px]',
      showToTiers: ['free'], // Only free users
    },
  };

  const config = adConfig[zone];

  // Check if user tier should see this ad
  const userTier = user?.subscription_tier || null;
  const shouldShowAd = config.showToTiers.includes(userTier);

  useEffect(() => {
    if (!shouldShowAd || !adRef.current) return;

    // Load Adsterra script
    const script = document.createElement('script');
    script.src = config.script;
    script.async = true;
    script.setAttribute('data-cfasync', 'false');

    adRef.current.appendChild(script);

    // Cleanup on unmount
    return () => {
      if (adRef.current) {
        adRef.current.innerHTML = '';
      }
    };
  }, [shouldShowAd, config.script]);

  if (!shouldShowAd) return null;

  return (
    <div className={`${config.minHeight} ${className}`}>
      <div ref={adRef} className="flex items-center justify-center" />
    </div>
  );
}
```

**Usage in Pages:**

**Homepage:**

```tsx
// app/page.tsx
import { AdUnit } from "@/components/ads/AdUnit";

export default function HomePage() {
  return (
    <>
      <section>Hero Section</section>

      {/* Ad Unit 1 */}
      <div className="bg-slate-50 border-y border-slate-200 py-4">
        <AdUnit zone="homepage-banner-top" className="max-w-7xl mx-auto" />
      </div>

      <section>Features Section</section>
      <section>Pricing Section</section>

      {/* Ad Unit 2 */}
      <div className="py-8">
        <AdUnit zone="homepage-rectangle-bottom" className="max-w-xs mx-auto" />
      </div>

      <footer>Footer</footer>
    </>
  );
}
```

**Dashboard:**

```tsx
// app/dashboard/page.tsx
import { AdUnit } from "@/components/ads/AdUnit";

export default function DashboardPage() {
  return (
    <div className="flex">
      {/* Main Content */}
      <main className="flex-1">
        <VerificationGrid />
      </main>

      {/* Sidebar Ad (Desktop, Free Users Only) */}
      <aside className="hidden lg:block">
        <AdUnit
          zone="dashboard-sidebar"
          className="sticky top-24 right-8 bg-white rounded-xl p-4 border border-slate-200"
        />
      </aside>

      {/* Mobile Ad (Free Users Only) */}
      <div className="lg:hidden">
        <AdUnit zone="dashboard-mobile" className="bg-slate-50 rounded-lg p-4 mb-4" />
      </div>

      <StickyActionBar />
    </div>
  );
}
```

### 4.2 User Tier Detection

**Zustand Auth Store:**

```typescript
// store/useAuthStore.ts
interface User {
  id: string;
  email: string;
  subscription_tier: "free" | "starter" | "pro";
  credits_remaining: number;
}

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  // ... other auth methods
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  // ... other state
}));
```

**Server-Side User Check (for SSR):**

```typescript
// app/dashboard/page.tsx
import { getServerSession } from '@/lib/auth';

export default async function DashboardPage() {
  const session = await getServerSession();
  const isFreeTier = session?.user?.subscription_tier === 'free';

  return (
    <>
      {/* Pass tier to client */}
      <ClientDashboard isFreeTier={isFreeTier} />
    </>
  );
}
```

### 4.3 CLS Prevention (Critical)

**Problem:** Ads load asynchronously, causing layout shift.

**Solution:** Reserve exact space before ad loads.

**Implementation:**

```tsx
// AdUnit component already includes min-h-[XXpx]
<div className="min-h-[250px] bg-slate-50 rounded-xl">
  {/* Ad loads here, space already reserved */}
  <AdUnit zone="homepage-rectangle-bottom" />
</div>
```

**CSS (if needed):**

```css
.ad-container {
  min-height: 250px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc; /* Slate-50, subtle placeholder */
}
```

### 4.4 Ad Refresh on Navigation

**Problem:** SPAs don't reload ads when user navigates (URL changes via History API).

**Solution:** Destroy and re-create ad script on route change.

**Already Handled:** The `useEffect` cleanup in `AdUnit.tsx` destroys ads on unmount. When user navigates, old ad is destroyed, new ad loads.

**Manual Refresh (if needed):**

```typescript
// If Adsterra doesn't auto-refresh
useEffect(() => {
  const handleRouteChange = () => {
    // Force ad refresh
    if (window.adsterra) {
      window.adsterra.refresh();
    }
  };

  window.addEventListener("popstate", handleRouteChange);
  return () => window.removeEventListener("popstate", handleRouteChange);
}, []);
```

### 4.5 Ad Blocker Detection (Optional)

**Problem:** Users with ad blockers see reserved space but no ad (ugly).

**Solution:** Detect ad blocker, show "Support us by disabling your ad blocker" message.

**Implementation:**

```typescript
// lib/utils/detectAdBlocker.ts
export async function isAdBlockerEnabled(): Promise<boolean> {
  try {
    const response = await fetch("https://pl123456.pubtally.com/test", {
      method: "HEAD",
      mode: "no-cors",
    });
    return false; // No ad blocker
  } catch {
    return true; // Ad blocker detected
  }
}
```

**In AdUnit Component:**

```typescript
const [isBlocked, setIsBlocked] = useState(false);

useEffect(() => {
  isAdBlockerEnabled().then(setIsBlocked);
}, []);

if (isBlocked) {
  return (
    <div className="min-h-[250px] bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
      <p className="text-sm text-blue-700">
        Please disable your ad blocker to support TagArchitect.
      </p>
    </div>
  );
}
```

---

## 5. Conversion Optimization

### 5.1 Core Principle

**Ads are not just revenue — they're a conversion tool.**

Free users see ads → Ads are annoying → "Upgrade to remove ads" → Conversion.

### 5.2 Conversion Triggers

**Trigger 1: In-Dashboard Ad Visibility**

- Free user sees ad in sidebar
- Ad placement is professional but noticeable
- User thinks: "This tool is useful, but ads are distracting"
- CTA: "Upgrade to Starter for ad-free experience + 200 credits/month"

**Trigger 2: Credit Depletion + Ads**

- Free user runs out of 10 credits
- Sees CreditCheckModal: "You need 45 more credits"
- Below: "Starter plan removes ads AND gives you 200 credits/month"
- Conversion psychology: Solve two problems (credits + ads) with one purchase

**Trigger 3: Export Limit (Future Feature)**

- Free user can only export 1 batch per day (artificial limit)
- Upgrade removes limit + ads

### 5.3 Messaging Strategy

**Don't say:**

- ❌ "Remove annoying ads!" (negative framing)
- ❌ "Get rid of distractions" (sounds desperate)

**Do say:**

- ✅ "Upgrade for an ad-free, professional experience"
- ✅ "Starter plan includes: 200 credits + ad-free dashboard"
- ✅ "Go pro: No ads, unlimited exports, priority support"

**Visual Treatment:**

**In StickyActionBar (Free Users Only):**

```
┌────────────────────────────────────────────────┐
│ [Select Marketplace ▼]    [Export ZIP →]      │
│                                                │
│ 💡 Tip: Upgrade to remove ads and get 200     │
│    credits/month → [Upgrade Now]               │
└────────────────────────────────────────────────┘
```

**In CreditCheckModal:**

```
┌────────────────────────────────┐
│ Insufficient Credits           │
│                                │
│ You need 45 more credits.      │
│                                │
│ Starter Plan (€12/month):      │
│ ✓ 200 credits/month            │
│ ✓ Ad-free dashboard            │
│ ✓ Priority support             │
│                                │
│ [Upgrade to Starter]           │
└────────────────────────────────┘
```

### 5.4 A/B Testing (Post-Launch)

**Test 1: Ad Placement**

- Variant A: Sidebar ad (current spec)
- Variant B: Top banner ad (more visible, more annoying)
- Measure: Conversion rate (free → paid)

**Test 2: Conversion Messaging**

- Variant A: "Upgrade for ad-free experience"
- Variant B: "Join 500+ pro users — no ads, unlimited credits"
- Measure: Click-through rate on upgrade CTA

**Test 3: Ad Format**

- Variant A: Display banner (current spec)
- Variant B: Native ads (text-based, less intrusive)
- Measure: User engagement + conversion rate

---

## 6. Revenue Projections

### 6.1 Assumptions

**Traffic:**

- Month 1: 1,000 visitors
- Month 3: 5,000 visitors
- Month 6: 10,000 visitors

**Conversion Rate:**

- Free → Starter: 3%
- Free → Pro: 1%

**Ad Revenue (Adsterra CPM: $2):**

- Homepage: 2 ad units × 5,000 pageviews = 10,000 impressions = $20/month
- Dashboard (free users): 1 ad unit × 3,000 sessions = 3,000 impressions = $6/month
- Total Ad Revenue: ~$26/month (Month 3)

**Subscription Revenue (Month 3):**

- 5,000 visitors × 50% sign up = 2,500 free users
- 2,500 × 3% = 75 Starter subs × €12 = €900/month
- 2,500 × 1% = 25 Pro subs × €29 = €725/month
- Total Subscription Revenue: €1,625/month

**Revenue Split:**

- Subscriptions: €1,625 (98%)
- Ads: €26 (2%)

**Conclusion:** Ads are minor revenue but worth having for free user monetization.

### 6.2 Scaling Strategy

**Phase 1 (Month 1-3):** Focus on subscriptions

- Ads are present but secondary
- Optimize conversion funnels (CreditCheckModal, upgrade CTAs)

**Phase 2 (Month 4-6):** Optimize ad placements

- A/B test ad formats and positions
- Increase homepage traffic (SEO, content marketing)
- Ad revenue grows with traffic

**Phase 3 (Month 6+):** Premium tier expansion

- Add "Enterprise" tier (€99/month, white-label, no ads, priority support)
- Ads remain for free users only

---

## 7. Compliance & Best Practices

### 7.1 GDPR & Cookie Consent (EU Users)

**Requirement:** Must obtain consent before serving ads to EU users.

**Implementation:**

**Step 1: Add Cookie Consent Banner**
Use a library like `react-cookie-consent` or `cookieyes`:

```tsx
// components/CookieConsent.tsx
"use client";

import CookieConsent from "react-cookie-consent";

export function CookieConsentBanner() {
  return (
    <CookieConsent
      location="bottom"
      buttonText="Accept"
      declineButtonText="Decline"
      enableDeclineButton
      onAccept={() => {
        // Load ads
        window.adsAllowed = true;
      }}
      onDecline={() => {
        // Block ads
        window.adsAllowed = false;
      }}
    >
      This site uses cookies for ads and analytics.
      <a href="/privacy" className="underline ml-1">
        Learn more
      </a>
    </CookieConsent>
  );
}
```

**Step 2: Conditional Ad Loading**

```typescript
// In AdUnit.tsx, check consent before loading
useEffect(() => {
  if (!shouldShowAd || !adRef.current) return;

  // Check GDPR consent
  if (typeof window.adsAllowed === "undefined" || !window.adsAllowed) {
    return; // Don't load ads until consent given
  }

  // Load ad script...
}, [shouldShowAd]);
```

**Step 3: Privacy Policy**
Add section in `/privacy` page:

- Explain ads are served by Adsterra
- Explain cookies used for ad targeting
- Provide opt-out instructions

### 7.2 Content Policy (Adsterra)

**Allowed Content:**

- SaaS tools (TagArchitect qualifies)
- Professional software
- Productivity tools

**Forbidden Content:**

- Adult content
- Gambling
- Illegal content
- Misleading claims

**TagArchitect Compliance:** ✅ No issues. Tool is B2B professional software.

### 7.3 Ad Quality

**Adsterra Auto-Moderation:**

- Adsterra filters low-quality ads automatically
- Occasionally check dashboard: "Ad Quality Settings" → Enable "High Quality Only"

**Manual Blocking:**

- If offensive ad appears: Screenshot → Report to Adsterra support
- Add domain to block list in Adsterra dashboard

---

## 8. Monitoring & Analytics

### 8.1 Key Metrics to Track

**Ad Performance:**

- Impressions per day
- Click-through rate (CTR)
- Revenue per 1000 impressions (RPM)
- Ad blocker rate

**Conversion Metrics:**

- Free → Paid conversion rate
- Time from signup to first upgrade
- Upgrade reasons (survey: "Why did you upgrade?")

**Tools:**

- **Adsterra Dashboard:** Revenue, impressions, CTR
- **Google Analytics:** Traffic, user flow, conversion funnels
- **Hotjar (optional):** Heatmaps to see if users interact with ads

### 8.2 Optimization Loop

**Weekly Review:**

1. Check Adsterra revenue (is it growing?)
2. Check conversion rate (free → paid)
3. If conversion rate drops: A/B test messaging
4. If ad revenue drops: Check ad blocker rate, adjust placements

**Monthly Review:**

1. Compare ad revenue vs. subscription revenue
2. If ads generate <5% of revenue: Consider removing dashboard ads (keep homepage only)
3. If ads generate >10% of revenue: Expand ad inventory (add more zones)

---

## 9. Alternative Monetization (Beyond Ads)

### 9.1 Affiliate Marketing (Future)

**Opportunity:** Partner with Etsy seller tool companies.

**Example:**

- Add "Recommended Tools" section on homepage
- Link to Etsy listing software (affiliate link)
- Earn 20-30% commission per sale

**Revenue Potential:** €50-200/month (passive)

### 9.2 White-Label / Enterprise

**Opportunity:** Sell TagArchitect as white-label to agencies.

**Example:**

- Marketing agency manages 50 Etsy shops
- They pay €199/month for white-label version (no "TagArchitect" branding)
- You provide backend, they rebrand frontend

**Revenue Potential:** €199-999/month per enterprise client

---

## 10. Technical Checklist (Pre-Launch)

Before launching with ads, confirm:

- [ ] Adsterra account created and domain verified
- [ ] 4 ad zones created (homepage top, homepage bottom, dashboard sidebar, dashboard mobile)
- [ ] AdUnit component implemented with tier-based visibility
- [ ] CLS prevention (min-height) on all ad containers
- [ ] GDPR cookie consent banner added (EU users)
- [ ] Privacy policy updated to mention ads
- [ ] Ad blocker detection implemented (optional)
- [ ] Analytics tracking configured (Adsterra + Google Analytics)
- [ ] Tested on desktop, tablet, mobile (responsive ad placement)
- [ ] Tested with free user account (ads visible)
- [ ] Tested with paid user account (ads hidden in dashboard)

---

## 11. Summary: Ad Strategy in One Page

| Aspect                         | Decision                                                      |
| ------------------------------ | ------------------------------------------------------------- |
| **Ad Network**                 | Adsterra (AdSense rejected)                                   |
| **Homepage Ads**               | 2 units (banner top, rectangle bottom) — visible to all users |
| **Dashboard Ads (Free Users)** | 1-2 units (sidebar desktop, banner mobile)                    |
| **Dashboard Ads (Paid Users)** | ZERO ads (premium experience)                                 |
| **Primary Revenue**            | Subscriptions (€12-29/month) — 95% of revenue                 |
| **Secondary Revenue**          | Ads (~€25-50/month) — 5% of revenue                           |
| **Conversion Strategy**        | Ads = annoyance → upgrade incentive                           |
| **Compliance**                 | GDPR cookie consent, privacy policy update                    |
| **CLS Prevention**             | min-height on all ad containers                               |
| **Ad Refresh**                 | Auto-handled by component lifecycle (useEffect cleanup)       |

---

## 12. SEO & Indexing Strategy

### 12.1 High-Value Content Rule (Critical for Ad Approval)

**Problem:** Ad networks (including Adsterra) reject "thin content" utility sites.

**Solution:** Homepage must contain **400-500 words of static, helpful text** visible to bots.

**Implementation:**

- Location: Homepage, below hero section
- Component: TextExpander (see UI Spec Section 4.18)
- Content Topics:
  - "How AI Tagging Works for Stock Photos"
  - "Etsy vs. Adobe Stock SEO Best Practices"
  - "Why Batch Processing Saves 3+ Hours Per Upload"
- Bot Visibility: Full text in HTML (not display:none)
- User Experience: Collapsed by default, "Read More" to expand

**Example Content Block:**

```markdown
## How TagArchitect Automates Stock Photo Workflows

Selling on Etsy and Adobe Stock requires precise metadata for every image.
Traditional workflows involve manually writing titles and tags for each photo—
a process that takes 3-5 minutes per image. For sellers uploading 50-500 items
per batch, this becomes a full day of repetitive work.

TagArchitect uses AI vision to analyze your images and generate marketplace-
compliant SEO tags automatically. The clustering algorithm groups visually
similar images, allowing you to tag entire collections in seconds instead of hours.

[... 300 more words about methodology, marketplace rules, etc.]
```

### 12.2 Indexed Pages

**Core Pages (Public, Indexed):**

- `/` — Homepage (SEO title: "TagArchitect | AI Batch Tagging for Etsy & Adobe Stock")
- `/pricing` — Pricing page
- `/faq` — Frequently asked questions
- `/privacy` — Privacy policy
- `/terms` — Terms of service

**Tool Pages (Private, Not Indexed):**

- `/dashboard` — Auth-required, add `<meta name="robots" content="noindex, nofollow">`
- `/api/*` — API routes, blocked in robots.txt

**Total Indexed URLs:** 5

### 12.3 URL Structure

**Pattern:** Static routes (no dynamic slugs needed)

**Canonical URLs:**

- Force HTTPS: `https://tagarchitect.com`
- Consistent WWW handling: Decide on `www` vs. non-`www`, redirect the other
- Example: If `tagarchitect.com` is primary, redirect `www.tagarchitect.com` → `tagarchitect.com`

**Implementation (Next.js):**

```typescript
// next.config.js
module.exports = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.tagarchitect.com" }],
        destination: "https://tagarchitect.com/:path*",
        permanent: true,
      },
    ];
  },
};
```

---

## 13. Technical SEO Requirements

### 13.1 Performance Targets

**Lighthouse Scores (Minimum):**

- Performance: >90
- SEO: >95
- Accessibility: >90
- Best Practices: >90

**Core Web Vitals:**

- LCP (Largest Contentful Paint): <2.5s
- FID (First Input Delay): <100ms
- CLS (Cumulative Layout Shift): <0.1

**Optimizations:**

- All images: WebP format with explicit width/height
- Above-the-fold content: Inline critical CSS
- Fonts: Preload Inter font
- Scripts: Defer non-critical JavaScript

### 13.2 Image SEO

**All Images Must Have:**

- Descriptive `alt` text (not "image1.jpg")
- Explicit dimensions (`width` and `height` attributes)
- Lazy loading for below-the-fold images (`loading="lazy"`)

**Example:**

```html
<!-- Bad -->
<img src="/hero.jpg" alt="image" />

<!-- Good -->
<img
  src="/hero-optimized.webp"
  alt="TagArchitect AI tagging interface showing grouped stock photos"
  width="1200"
  height="800"
  loading="lazy"
/>
```

### 13.3 Mobile Optimization

**Requirements:**

- Mobile-first design (see UI Spec Section 7)
- Responsive images with srcset
- Touch targets ≥48px (buttons, links)
- No horizontal scroll
- Fast mobile load time (<3s on 3G)

---

## 14. Metadata Requirements

### 14.1 Page-Specific Metadata

**Homepage (`/`):**

```html
<title>TagArchitect | AI Batch Tagging for Etsy & Adobe Stock</title>
<meta
  name="description"
  content="Automate your stock photo SEO. Use AI to cluster and tag images for Etsy and Adobe Stock. Download renamed ZIPs and CSVs in seconds."
/>
<meta
  name="keywords"
  content="etsy seo, adobe stock tags, ai tagging, batch image processing, stock photo metadata"
/>
<link rel="canonical" href="https://tagarchitect.com/" />
```

**Pricing (`/pricing`):**

```html
<title>Pricing - TagArchitect</title>
<meta
  name="description"
  content="Flexible pricing for Etsy and Adobe Stock sellers. Start free with 10 credits. Upgrade for unlimited AI tagging and ad-free experience."
/>
<link rel="canonical" href="https://tagarchitect.com/pricing" />
```

**Dashboard (`/dashboard`):**

```html
<title>Dashboard - TagArchitect</title> <meta name="robots" content="noindex, nofollow" />
```

**FAQ (`/faq`):**

```html
<title>FAQ - TagArchitect | Common Questions About AI Tagging</title>
<meta
  name="description"
  content="Frequently asked questions about AI-powered image tagging, credit usage, marketplace compatibility, and batch exports."
/>
<link rel="canonical" href="https://tagarchitect.com/faq" />
```

### 14.2 Open Graph (Social Sharing)

**Homepage:**

```html
<meta property="og:title" content="TagArchitect | AI Batch Tagging for Etsy & Adobe Stock" />
<meta
  property="og:description"
  content="Automate your stock photo SEO with AI-powered clustering and tagging."
/>
<meta property="og:image" content="https://tagarchitect.com/og-image.jpg" />
<meta property="og:url" content="https://tagarchitect.com/" />
<meta property="og:type" content="website" />
```

**Twitter Card:**

```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="TagArchitect | AI Batch Tagging" />
<meta name="twitter:description" content="Automate stock photo SEO with AI." />
<meta name="twitter:image" content="https://tagarchitect.com/twitter-card.jpg" />
```

### 14.3 Next.js Metadata Implementation

**Static Metadata (Homepage):**

```typescript
// app/page.tsx
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "TagArchitect | AI Batch Tagging for Etsy & Adobe Stock",
  description:
    "Automate your stock photo SEO. Use AI to cluster and tag images for Etsy and Adobe Stock. Download renamed ZIPs and CSVs in seconds.",
  keywords: ["etsy seo", "adobe stock tags", "ai tagging", "batch image processing"],
  openGraph: {
    title: "TagArchitect | AI Batch Tagging for Etsy & Adobe Stock",
    description: "Automate your stock photo SEO with AI-powered clustering and tagging.",
    url: "https://tagarchitect.com",
    siteName: "TagArchitect",
    images: [
      {
        url: "https://tagarchitect.com/og-image.jpg",
        width: 1200,
        height: 630,
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TagArchitect | AI Batch Tagging",
    description: "Automate stock photo SEO with AI.",
    images: ["https://tagarchitect.com/twitter-card.jpg"],
  },
};

export default function HomePage() {
  // ...
}
```

---

## 15. Sitemap & Robots.txt

### 15.1 Sitemap Generation

**Tool:** Use `next-sitemap` package

**Installation:**

```bash
pnpm add next-sitemap
```

**Configuration (`next-sitemap.config.js`):**

```javascript
module.exports = {
  siteUrl: "https://tagarchitect.com",
  generateRobotsTxt: true,
  exclude: ["/dashboard", "/api/*"],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/api"],
      },
    ],
  },
};
```

**Generated Sitemap (`/public/sitemap.xml`):**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://tagarchitect.com/</loc>
    <lastmod>2025-01-19</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://tagarchitect.com/pricing</loc>
    <lastmod>2025-01-19</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://tagarchitect.com/faq</loc>
    <lastmod>2025-01-19</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <!-- Privacy and Terms with lower priority -->
</urlset>
```

**Build Script:**

```json
// package.json
{
  "scripts": {
    "postbuild": "next-sitemap"
  }
}
```

### 15.2 Robots.txt

**Location:** `/public/robots.txt`

**Content:**

```txt
User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /api/

Sitemap: https://tagarchitect.com/sitemap.xml
```

**Explanation:**

- `Allow: /` — Crawl all public pages
- `Disallow: /dashboard` — Don't crawl auth-required tool
- `Disallow: /api/` — Don't crawl API endpoints
- `Sitemap:` — Tell Google where to find sitemap

---

## 16. Schema Markup (JSON-LD)

### 16.1 Organization Schema (Homepage)

**Purpose:** Identify TagArchitect as a company/product

**Implementation:**

```typescript
// app/page.tsx
export default function HomePage() {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'TagArchitect',
    url: 'https://tagarchitect.com',
    logo: 'https://tagarchitect.com/logo.png',
    description: 'AI-powered batch tagging for Etsy and Adobe Stock sellers',
    sameAs: [
      'https://twitter.com/tagarchitect',
      'https://github.com/tagarchitect',
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      {/* Rest of page */}
    </>
  );
}
```

### 16.2 SoftwareApplication Schema (Homepage)

**Purpose:** Identify TagArchitect as a web app

**Implementation:**

```typescript
const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "TagArchitect",
  operatingSystem: "Web Browser",
  applicationCategory: "MultimediaApplication",
  offers: {
    "@type": "Offer",
    price: "0.00",
    priceCurrency: "EUR",
    description: "Free to try with 10 credits",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "120",
  },
};
```

### 16.3 FAQPage Schema (FAQ Page)

**Purpose:** Enable rich snippets in Google search results

**Implementation:**

```typescript
// app/faq/page.tsx
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How many credits do I need to tag 50 images?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You need 50 credits (1 credit per image). Free users get 10 credits to start. Starter plan includes 200 credits/month.",
      },
    },
    {
      "@type": "Question",
      name: "Does TagArchitect support Etsy and Adobe Stock?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. TagArchitect generates CSV files formatted specifically for both Etsy (13 tags max) and Adobe Stock (49 tags max).",
      },
    },
    // Add 5-10 more questions
  ],
};
```

### 16.4 BreadcrumbList Schema (Optional)

**Purpose:** Show breadcrumb navigation in search results

**Only needed if you add sub-pages (e.g., `/guides/etsy-seo`). Skip for V1.**

---

## 17. Google Search Console Setup

### 17.1 Post-Launch Checklist

**After deploying to production:**

1. **Verify Domain:**
   - Go to https://search.google.com/search-console
   - Add property: `https://tagarchitect.com`
   - Verify ownership (DNS TXT record or HTML file upload)

2. **Submit Sitemap:**
   - In Search Console: Sitemaps → Add sitemap
   - URL: `https://tagarchitect.com/sitemap.xml`
   - Google will crawl within 24-48 hours

3. **Monitor Indexing:**
   - Check "Coverage" report weekly
   - Fix any "Excluded" pages (should only be /dashboard and /api)

4. **Core Web Vitals:**
   - Monitor "Experience" → "Core Web Vitals"
   - Fix any "Poor" URLs (red)

### 17.2 Expected Indexing Timeline

- **Day 1:** Submit sitemap
- **Day 2-3:** Google crawls homepage
- **Week 1:** All 5 pages indexed
- **Week 2-4:** Pages start ranking for long-tail keywords ("ai batch tagging etsy")

---

## 18. SEO Content Strategy (Post-Launch)

### 18.1 Blog / Knowledge Base (Optional)

**Goal:** Drive organic traffic with educational content

**Topics:**

- "How to Optimize Etsy Listings for SEO (2025 Guide)"
- "Adobe Stock vs. Shutterstock: Which Platform Pays More?"
- "Batch Processing 500 Photos: A Step-by-Step Workflow"

**Benefit:**

- Each article = 1 new indexed URL
- Long-tail keywords = traffic from sellers researching workflows
- Internal links drive users to pricing page

**ROI:** If 1 article brings 500 visitors/month, and 3% convert → 15 new customers

### 18.2 Marketplace Guides (Optional)

**Pages:**

- `/guides/etsy-seo` — Etsy-specific tagging rules
- `/guides/adobe-stock-seo` — Adobe Stock requirements
- `/guides/batch-workflow` — How to use TagArchitect efficiently

**Each guide:**

- 800-1200 words
- Keyword-optimized (e.g., "etsy seo tags")
- CTA: "Try TagArchitect Free"

---

## 19. Final SEO Checklist (Pre-Launch)

Before going live, confirm:

- [ ] Homepage has 400-500 words of static content (TextExpander component)
- [ ] All 5 pages have unique title + meta description
- [ ] Sitemap generated and accessible at `/sitemap.xml`
- [ ] Robots.txt blocks `/dashboard` and `/api`
- [ ] Canonical URLs force HTTPS and consistent WWW/non-WWW
- [ ] All images have `alt` text and explicit dimensions
- [ ] Organization schema added to homepage
- [ ] SoftwareApplication schema added to homepage
- [ ] Open Graph tags present on all pages
- [ ] Google Search Console property created (ready to submit sitemap after launch)

---

**End of Ads & Monetization + SEO Document**

This document is now **100% complete** and follows the ADS_AND_INDEXING_GUIDELINES structure. It covers:

- Ad strategy (Adsterra integration, tier-based visibility)
- High-value content rule (ad network compliance)
- SEO strategy (metadata, sitemap, schema)
- Technical requirements (performance, canonicalization)

Ready to move to **Document 5: Database & Data Schema**.
