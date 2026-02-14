import type { StrategyType, MarketplaceType } from "../types";

const STRATEGY_PERSONAS: Record<StrategyType, string> = {
  standard: "",
  etsy: `PERSONA: Act as an Etsy SEO expert. Use high-conversion, long-tail keywords and describe the mood/aesthetic. Focus on emotional appeal, lifestyle context, and buyer intent. Include trending search terms and gift-related keywords where appropriate.

`,
  stock: `PERSONA: Act as a professional Stock Content Manager. Use objective, technical terms. Do not use subjective language. Focus on literal descriptions, composition details, and universal concepts. Prioritize searchability over creativity.

`,
};

export function getStrategyPersona(strategy: StrategyType): string {
  return STRATEGY_PERSONAS[strategy] || "";
}

export const APPROVED_CATEGORIES = [
  "Gastronomy",
  "Architecture",
  "Interiors",
  "Fashion",
  "Nature",
  "People",
  "Technology",
  "Transportation",
  "Art & Design",
  "Objects",
] as const;

export type ApprovedCategory = (typeof APPROVED_CATEGORIES)[number];

export function buildClusteringPrompt(
  imageIndex: string,
  _marketplace: MarketplaceType,
  maxGroups: number,
  _context?: string
): string {
  return `You are an automated Metadata Engine for Adobe Stock.
Your job is to group images and generate commercial metadata.

STRICT OUTPUT RULES:

1. **TITLE**: Must be EXACTLY one of these (no variations):
   - Gastronomy
   - Architecture
   - Nature
   - People
   - Objects
   - Transportation
   - Urban

2. **TAGS (semanticTags)**:
   - You MUST generate **10 to 20 keywords** per group.
   - Tags must be specific visual elements (objects, colors, textures, materials, actions).
   - **FORBIDDEN:** Do not repeat the category name. Do not use "image", "photo", "picture".
   - Example for a Salad photo: ["lettuce", "tomato", "bowl", "fresh", "healthy", "lunch", "green", "vegetable", "diet", "meal", "fork", "dressing"].

3. **GROUPING**:
   - Combine similar images. Salad + Beer + Steak = ONE group titled "Gastronomy".
   - Maximum ${maxGroups} groups.

IMAGES TO PROCESS:
${imageIndex}

Return ONLY valid JSON (no markdown, no explanation):
{"groups":[{"title":"Gastronomy","semanticTags":["lettuce","tomato","bowl","fresh","healthy","lunch","green","vegetable","diet","meal","fork","dressing"],"imageIds":["id1","id2"],"confidence":0.95}]}`;
}
