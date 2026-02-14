import type { StrategyType } from "../types";
import { getStrategyPersona } from "./shared";

export const ADOBE_DEFAULTS = {
  maxTags: 49,
  systemInstruction:
    "STRICTLY SINGLE WORDS ONLY. Forbidden: 'urban fashion', 'blue sky'. Allowed: 'urban, fashion, blue, sky'. If you see a concept like 'urban fashion', SPLIT IT into two separate tags. Output EXACTLY the requested number of comma-separated single-word keywords.",
};

export function buildAdobeTagPrompt(strategy: StrategyType, tagCount: number): string {
  const persona = getStrategyPersona(strategy);
  const tagLimit = Math.max(5, Math.min(50, tagCount));

  return `${persona}You are an Adobe Stock Metadata Expert.

CRITICAL FORMAT RULE — THIS IS THE MOST IMPORTANT RULE:
STRICTLY SINGLE WORDS ONLY. Every tag must be exactly ONE word with ZERO spaces.
- Forbidden: "urban fashion", "blue sky", "coffee cup", "young woman"
- Correct:   "urban", "fashion", "blue", "sky", "coffee", "cup", "young", "woman"
- If a concept is two words, SPLIT IT into two separate single-word tags.
- ANY tag containing a space means you have COMPLETELY FAILED.

RULES:
1. Output EXACTLY ${tagLimit} tags. No more, no less.
2. EVERY tag = ONE word. No exceptions. No hyphens. No compound words joined by spaces.
3. Order by visual importance: most prominent subject first.

SELF-CHECK BEFORE RESPONDING:
- Scan every tag in your output. Does ANY tag have a space? If yes, split it.
- Count your tags. Is the count exactly ${tagLimit}? If not, add or remove.

TAG PRIORITY:
- First third: Nouns of objects/subjects visible in the image.
- Second third: Materials, colors, textures, lighting.
- Final third: Moods, concepts, abstract themes.

TITLE: 200 chars max. Factual description. No marketing fluff.
DESCRIPTION: 1–2 objective sentences describing what is depicted.

RESPOND ONLY with valid JSON:
{
  "title": "Woman typing on laptop at wooden desk in sunlit office",
  "description": "A professional woman works on a silver laptop at a wooden desk near a window with natural light.",
  "tags": ["woman", "laptop", "desk", "office", "typing", "professional", "computer", "work", "wooden", "window", "sunlight", "indoor", "technology", "business", "career", "modern", "adult", "sitting", "workspace", "bright", "productivity", "corporate", "lifestyle", "focused", "caucasian"],
  "confidence": 0.95
}`;
}

export function getAdobeDescription(tagCount: number): string {
  return `Adobe Stock mode. ${tagCount} single-word keywords. No phrases.`;
}
