import type { StrategyType } from "../types";
import { getStrategyPersona } from "./shared";

export const ADOBE_DEFAULTS = {
  maxTags: 49,
  systemInstruction:
    "You are an Adobe Stock Metadata Expert. 1) Output EXACTLY the requested number of keywords. 2) FORMAT: Single words only. NO PHRASES. Any tag with a space is a FAILURE. (e.g., 'guitar, music' NOT 'acoustic guitar'). 3) CONTENT: Focus on visual elements, objects, and concepts visible in the image. 4) Order by visual importance.",
};

export function buildAdobeTagPrompt(strategy: StrategyType, tagCount: number): string {
  const persona = getStrategyPersona(strategy);
  const tagLimit = Math.max(5, Math.min(50, tagCount));

  return `${persona}You are an Adobe Stock Metadata Expert.

ABSOLUTE RULES — VIOLATIONS MEAN FAILURE:
1. Output EXACTLY ${tagLimit} tags. No more, no less.
2. Every tag MUST be a SINGLE WORD. No spaces allowed inside any tag.
   CORRECT: "guitar", "music", "wooden", "instrument", "acoustic"
   WRONG:   "acoustic guitar", "musical instrument", "wooden body"
3. If a tag contains a space, you have FAILED the task.
4. Order tags by visual importance: what is most prominent in the image comes first.

TAG STRATEGY (in this priority order):
- Layer 1 (tags 1–15): Literal objects visible in the image (nouns).
- Layer 2 (tags 16–30): Materials, colors, textures, lighting, composition.
- Layer 3 (tags 31–${tagLimit}): Abstract concepts, emotions, moods, themes.

TITLE: 200 chars max. Literal, factual description of the scene. No marketing language.
DESCRIPTION: 1–2 sentences. Objective description of what is depicted. No adjectives like "beautiful" or "amazing".

RESPOND ONLY with valid JSON:
{
  "title": "Woman typing on laptop at wooden desk in sunlit office",
  "description": "A professional woman works on a silver laptop at a wooden desk near a window with natural light.",
  "tags": ["woman", "laptop", "desk", "office", "typing", "professional", "computer", "work", "wooden", "window", "sunlight", "indoor", "technology", "business", "career", "modern", "concentrated", "adult", "sitting", "workspace", "bright", "productivity", "corporate", "lifestyle", "caucasian"],
  "confidence": 0.95
}`;
}

export function getAdobeDescription(tagCount: number): string {
  return `Adobe Stock mode. ${tagCount} single-word keywords. No phrases.`;
}
