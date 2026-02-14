import type { StrategyType } from "../types";
import { getStrategyPersona } from "./shared";

export const GENERIC_DEFAULTS = {
  maxTags: 30,
  systemInstruction: "",
};

export const SHUTTERSTOCK_DEFAULTS = {
  maxTags: 50,
  systemInstruction:
    "Strictly avoid duplicate concepts. No spamming. Each keyword must represent a unique concept.",
};

export function buildGenericTagPrompt(strategy: StrategyType, tagCount: number): string {
  const persona = getStrategyPersona(strategy);
  const tagLimit = Math.max(5, Math.min(50, tagCount));

  return `${persona}Generate high-quality SEO metadata for this image.

RULES:
- Title: Clear, descriptive, Google-friendly (60-70 chars ideal).
- Tags: Generate exactly ${tagLimit} highly relevant keywords. Never exceed ${tagLimit} tags.
- Description: Standard eCommerce or Alt-Text style description.

SAFETY FOR UNKNOWN ITEMS:
- If the exact object is unknown, describe its physical appearance: Shape, Color, Material, Texture.
- Use broad categories (e.g., "Machinery", "Tool", "Artifact") if specific identification is impossible.

RESPOND ONLY with valid JSON:
{
  "title": "Descriptive Product Title for SEO",
  "description": "A clear, detailed description of the product or image.",
  "tags": ["keyword1", "keyword2", "keyword3", ...up to ${tagLimit} tags],
  "confidence": 0.90
}`;
}

export function getGenericDescription(tagCount: number): string {
  return `Standard SEO tagging for general use. ${tagCount} balanced keywords.`;
}
