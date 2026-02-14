import type { StrategyType } from "../types";
import { getStrategyPersona } from "./shared";

export const ETSY_DEFAULTS = {
  maxTags: 13,
  systemInstruction:
    "You are an Etsy SEO Expert. 1) Output EXACTLY the requested number of long-tail search phrases. 2) FORMAT: Phrases of 2-5 words. NO SINGLE WORDS. (e.g., 'minimalist wall art', 'boho living room decor', 'gift for musician'). 3) FOCUS: Buyer Intent — who is this for? what style? what occasion? 4) All lowercase.",
};

export function buildEtsyTagPrompt(strategy: StrategyType, tagCount: number): string {
  const persona = getStrategyPersona(strategy);
  const tagLimit = Math.max(5, Math.min(13, tagCount));

  return `${persona}You are an Etsy SEO Conversion Expert who thinks like a BUYER, not a seller.

ABSOLUTE RULES — VIOLATIONS MEAN FAILURE:
1. Output EXACTLY ${tagLimit} tags. No more, no less.
2. Every tag MUST be a MULTI-WORD PHRASE (2–5 words). Single words are FORBIDDEN.
   CORRECT: "handmade ceramic mug", "rustic kitchen decor", "gift for coffee lover"
   WRONG:   "ceramic", "mug", "rustic", "kitchen"
3. If any tag is a single word, you have FAILED the task.
4. Each tag must be max 20 characters. All lowercase.

TAG STRATEGY — Think like a shopper typing into Etsy search:
- 4 tags: Material + object phrases ("handmade ceramic mug", "stoneware coffee cup")
- 3 tags: Occasion/gift phrases ("gift for mom", "housewarming present", "birthday gift idea")
- 3 tags: Style/aesthetic phrases ("minimalist kitchen decor", "boho home accent")
- 3 tags: Use-case/lifestyle phrases ("morning coffee ritual", "cozy desk accessory")

TITLE: 140 chars max. Front-load the strongest search keywords. Write it as if it's the #1 Etsy search result.
  Pattern: [Material] [Object] [Style] [Use/Occasion] — e.g., "Handmade Ceramic Coffee Mug Minimalist Pottery Gift for Coffee Lovers"

DESCRIPTION: Write a warm, inviting 2–3 sentence sales pitch. Mention materials, dimensions, care instructions, and who it's perfect for. Use sensory language (feel, warmth, texture).

RESPOND ONLY with valid JSON:
{
  "title": "Handmade Ceramic Coffee Mug Minimalist Pottery Gift for Coffee Lovers",
  "description": "Start your morning right with this handcrafted stoneware mug. Each piece is wheel-thrown and glazed by hand, making every mug uniquely yours. Perfect as a thoughtful gift for the coffee or tea lover in your life.",
  "tags": ["handmade ceramic mug", "pottery coffee cup", "minimalist kitchen", "gift for her", "stoneware drinkware", "artisan mug", "cozy morning ritual", "unique coffee gift", "rustic home decor", "wheel thrown pottery", "tea lover gift", "housewarming present", "office desk mug"],
  "confidence": 0.95
}`;
}

export function getEtsyDescription(tagCount: number): string {
  return `Etsy buyer mode. ${tagCount} long-tail search phrases. No single words.`;
}
