import type { MarketplaceType, StrategyType } from "./types";
import type { PlatformType } from "@/types";

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

// ============================================
// PLATFORM OPTIMIZER (Agency Mode)
// ============================================

interface PlatformConfig {
  maxTags: number;
  systemInstruction: string;
}

const PLATFORM_CONFIGS: Record<PlatformType, PlatformConfig> = {
  ADOBE: {
    maxTags: 49,
    systemInstruction:
      "Order by visual importance. Most relevant tags first. Use objective, literal descriptors.",
  },
  SHUTTERSTOCK: {
    maxTags: 50,
    systemInstruction:
      "Strictly avoid duplicate concepts. No spamming. Each keyword must represent a unique concept.",
  },
  ETSY: {
    maxTags: 13,
    systemInstruction:
      "Focus on multi-word long-tail phrases describing aesthetic and use-case. Prioritize buyer intent and emotional appeal.",
  },
  GENERIC: {
    maxTags: 40,
    systemInstruction: "",
  },
};

/**
 * Get platform-specific tag limit and system instruction overlay.
 * When a platform is specified, it overrides the marketplace-based defaults.
 */
export function getPlatformConfig(platform: PlatformType): PlatformConfig {
  return PLATFORM_CONFIGS[platform] || PLATFORM_CONFIGS.GENERIC;
}

/**
 * Build a platform-aware tag prompt by injecting platform rules into the base prompt.
 */
export function buildPlatformTagPrompt(
  options: TagPromptOptions & { platform?: PlatformType }
): string {
  const basePrompt = buildTagPrompt(options);

  if (!options.platform || options.platform === "GENERIC") {
    return basePrompt;
  }

  const config = getPlatformConfig(options.platform);

  // Inject platform-specific instruction at the top of the prompt
  return `PLATFORM OPTIMIZATION (${options.platform}): ${config.systemInstruction}
Tag limit for this platform: ${config.maxTags} keywords maximum.

${basePrompt}`;
}
