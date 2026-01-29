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

export function buildClusteringPrompt(
  imageIndex: string,
  marketplace: MarketplaceType,
  maxGroups: number
): string {
  const marketplaceContext =
    marketplace === "ETSY"
      ? "Focus on product categories: jewelry, clothing, home decor, art prints, crafts, etc."
      : "Focus on content categories: portraits, landscapes, architecture, food, lifestyle, business, etc.";

  return `You are an expert image curator. Group these images STRICTLY by semantic category (what the image depicts).

CRITICAL INSTRUCTIONS:
- IGNORE color palettes, lighting, or visual aesthetics
- Group images ONLY by their semantic content/subject matter
- If a batch contains multiple unrelated subjects (e.g., food AND buildings), they MUST be in separate groups
- Each group should contain images of the SAME subject type

${marketplaceContext}

SEMANTIC CATEGORIES TO CONSIDER:
- Food & Beverages (meals, ingredients, drinks)
- People & Portraits (faces, lifestyle, business)
- Architecture & Buildings (interiors, exteriors, cityscapes)
- Nature & Landscapes (plants, animals, scenery)
- Products & Objects (items, tools, accessories)
- Art & Abstract (illustrations, patterns, designs)

IMAGES:
${imageIndex}

RULES:
1. Create up to ${maxGroups} groups maximum
2. Each image belongs to exactly ONE group
3. Single-image groups are acceptable for unique subjects
4. NEVER mix unrelated subjects in the same group

LABELING:
- Each group MUST have a 2-3 word descriptive label
- Labels should describe the semantic category (e.g., "Modern Architecture", "Street Food", "Business Portraits")
- Do NOT use generic labels like "Group 1" or "Miscellaneous"

RESPOND ONLY with valid JSON:
{
  "groups": [
    {
      "groupId": "group-1",
      "imageIds": ["id1", "id2"],
      "suggestedLabel": "Category Label",
      "confidence": 0.9
    }
  ]
}`;
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
