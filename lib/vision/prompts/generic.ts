import type { StrategyType } from "../types";
import { getStrategyPersona } from "./shared";

export const GENERIC_DEFAULTS = {
  maxTags: 30,
  systemInstruction: "",
};

export const SHUTTERSTOCK_DEFAULTS = {
  maxTags: 50,
  systemInstruction:
    "You are a General Stock Photography Expert. 1) Output EXACTLY the requested number of keywords. 2) FORMAT: Mix of single words and 2-word phrases. 3) CONTENT: Standard descriptive tags (e.g., 'guitar', 'acoustic guitar', 'music', 'concert', 'live performance'). Each keyword must represent a unique concept.",
};

export function buildGenericTagPrompt(strategy: StrategyType, tagCount: number): string {
  const persona = getStrategyPersona(strategy);
  const tagLimit = Math.max(5, Math.min(50, tagCount));

  return `${persona}You are a versatile SEO metadata specialist for web, social media, and general e-commerce.

RULES:
1. Output EXACTLY ${tagLimit} tags. No more, no less.
2. Tags can be single words OR short phrases (1–3 words). Mix both freely.
   Example mix: ["sunset", "beach vacation", "ocean", "tropical paradise", "sand", "golden hour", "waves"]
3. Aim for a balanced mix: ~60% single keywords + ~40% two-word phrases.

TAG STRATEGY — Optimize for Google Image Search and social media discovery:
- Primary (40%): Specific objects, subjects, and scenes visible in the image.
- Secondary (30%): Context, setting, mood, season, time of day.
- Tertiary (30%): Related search terms a user might type to find this image (think Google, Pinterest, Instagram).

TITLE: 60–70 characters. Google-friendly, descriptive. Write it like an image alt-text that ranks.
  Pattern: [Subject] [Action/State] [Setting] — e.g., "Golden retriever running on sandy beach at sunset"

DESCRIPTION: 1–2 sentences. Describe the image for someone who cannot see it (accessibility-grade alt-text). Include colors, composition, and emotional tone.

RESPOND ONLY with valid JSON:
{
  "title": "Golden retriever running on sandy beach at sunset",
  "description": "A happy golden retriever sprints along a sandy shoreline as warm golden light from the setting sun reflects off the ocean waves behind it.",
  "tags": ["golden retriever", "dog", "beach", "sunset", "running", "ocean", "sand", "pet", "animal", "golden hour", "waves", "shore", "happy", "playful", "summer", "outdoors", "nature", "warm light", "water", "coastal", "companion", "freedom", "joy", "tropical", "vacation", "lifestyle", "active", "beautiful", "scenic", "horizon"],
  "confidence": 0.90
}`;
}

export function getGenericDescription(tagCount: number): string {
  return `General SEO mode. ${tagCount} mixed keywords and short phrases.`;
}
