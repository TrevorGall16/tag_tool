import type { StrategyType } from "../types";
import { getStrategyPersona } from "./shared";

export const ETSY_DEFAULTS = {
  maxTags: 13,
  systemInstruction:
    "Generate 13 highly descriptive, long-tail phrases (3-5 words each). Do NOT use single words. Example: 'rustic wooden table decor', not 'table'. Prioritize buyer intent and emotional appeal.",
};

export function buildEtsyTagPrompt(strategy: StrategyType, tagCount: number): string {
  const persona = getStrategyPersona(strategy);
  const tagLimit = Math.max(5, Math.min(13, tagCount));

  return `${persona}Generate Etsy metadata for this product image.

RULES:
- Title: 140 chars max, front-load keywords.
- Tags: Generate exactly ${tagLimit} tags. Max 20 chars per tag. Lowercase. Never exceed ${tagLimit} tags.
- Description: Sales-focused, inviting, mentions materials/dimensions.

SAFETY FOR UNKNOWN ITEMS:
- If the object is niche or unclear, describe its visual attributes: Material (wood, metal), Era (vintage, modern), Style (rustic, industrial), and Function. Do not hallucinate specific model names.

RESPOND ONLY with valid JSON:
{
  "title": "Handmade ceramic coffee mug blue pottery gift",
  "description": "Enjoy your morning coffee in this handcrafted ceramic mug...",
  "tags": ["ceramic mug", "coffee cup", "handmade gift", "blue pottery", "tea lover", "kitchen decor", "stoneware mug", "unique gift", "office mug", "pottery art", "housewarming", "artisan mug", "drinkware"],
  "confidence": 0.95
}`;
}

export function getEtsyDescription(tagCount: number): string {
  return `Optimized for Etsy Search. ${tagCount} long-tail descriptive phrases.`;
}
