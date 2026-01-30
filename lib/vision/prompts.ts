import type { MarketplaceType, StrategyType } from "./types";

// Strategy-based personas for AI prompting
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

// Approved category list - these are the ONLY titles the AI should use
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
  return `You are an Image Classifier. Sort images into SHARED categories to minimize groups.

CLASSIFICATION MENU (Pick ONE for each group):
- Gastronomy (Food, drink, dining, meals, desserts)
- Architecture (Buildings, cities, exteriors, urban)
- Interiors (Rooms, furniture, decor, homes)
- Nature (Plants, landscapes, animals, wildlife)
- People (Portraits, fashion, lifestyle, business)
- Objects (Tech, products, devices, miscellaneous)

CRITICAL RULES:
1. **REUSE CATEGORIES:** If Image 1 is Salad and Image 2 is Beer, BOTH go in ONE group titled "Gastronomy".
2. **FORBIDDEN WORDS:** NEVER use "Group", "Batch", "Set", "Untitled", or numbers as titles.
3. **MINIMIZE GROUPS:** Create the FEWEST groups possible. Maximum ${maxGroups} groups.

IMAGES:
${imageIndex}

Return ONLY valid JSON (no markdown, no code blocks, no explanation):
{"groups":[{"groupId":"group-1","imageIds":["id1","id2"],"title":"Gastronomy","semanticTags":["Gastronomy","Salad","Beer"],"confidence":0.9}]}`;
}

export interface TagPromptOptions {
  marketplace: MarketplaceType;
  strategy?: StrategyType;
  maxTags?: number;
}

export function buildTagPrompt(options: TagPromptOptions): string;
export function buildTagPrompt(
  marketplace: MarketplaceType,
  strategy?: StrategyType,
  maxTags?: number
): string;
export function buildTagPrompt(
  marketplaceOrOptions: MarketplaceType | TagPromptOptions,
  strategyArg?: StrategyType,
  maxTagsArg?: number
): string {
  // Handle both old and new signatures
  let marketplace: MarketplaceType;
  let strategy: StrategyType;
  let maxTags: number;

  if (typeof marketplaceOrOptions === "object") {
    marketplace = marketplaceOrOptions.marketplace;
    strategy = marketplaceOrOptions.strategy || "standard";
    maxTags = marketplaceOrOptions.maxTags || 25;
  } else {
    marketplace = marketplaceOrOptions;
    strategy = strategyArg || "standard";
    maxTags = maxTagsArg || 25;
  }

  const persona = getStrategyPersona(strategy);

  // Clamp maxTags to valid range
  const tagLimit = Math.max(5, Math.min(50, maxTags));

  // --- ETSY MODE (Strict Rules) ---
  if (marketplace === "ETSY") {
    const etsyLimit = Math.min(tagLimit, 13); // Etsy max is 13
    return `${persona}Generate Etsy metadata for this product image.

RULES:
- Title: 140 chars max, front-load keywords.
- Tags: Generate exactly ${etsyLimit} tags. Max 20 chars per tag. Lowercase. Never exceed ${etsyLimit} tags.
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

  // --- ADOBE STOCK MODE (Volume Rules) ---
  if (marketplace === "ADOBE_STOCK") {
    return `${persona}Generate Adobe Stock metadata for this image.

RULES:
- Title: 200 chars max, descriptive, literal.
- Tags: Generate exactly ${tagLimit} keywords. Order by importance. Never exceed ${tagLimit} tags.
- Description: Literal description of the scene and subject.

STRATEGY:
- Start with literal subjects (what is seen).
- Add conceptual tags (emotions, themes).
- Stop when you reach ${tagLimit} tags.

SAFETY FOR UNKNOWN ITEMS:
- If the subject is ambiguous, focus on: Lighting, Composition, Texture, Colors, and Vibe/Mood.

RESPOND ONLY with valid JSON:
{
  "title": "Portrait of smiling woman working on laptop in modern office",
  "description": "A professional woman sitting at a desk typing on a laptop...",
  "tags": ["business", "woman", "laptop", "office", "work", "professional", "corporate", "technology", "computer", "desk", "workspace", "career", "adult", "employee", "confident", "success", "modern", "indoor", "caucasian", "30s", "sitting", "typing", "focused", "concentration", "productivity"],
  "confidence": 0.95
}`;
  }

  // --- GENERAL / UNIVERSAL MODE (New Fallback) ---
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
