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

// Context-specific instructions for clustering
const CONTEXT_INSTRUCTIONS: Record<string, string> = {
  general: "Use standard industry categories suitable for any purpose.",
  stock:
    "Use professional stock photography categories. Focus on commercial licensing terms like 'Business', 'Lifestyle', 'Technology', 'Nature'.",
  ecommerce:
    "Use e-commerce product categories. Focus on product types like 'Apparel', 'Home & Garden', 'Electronics', 'Beauty'.",
};

export function buildClusteringPrompt(
  imageIndex: string,
  marketplace: MarketplaceType,
  maxGroups: number,
  context?: string
): string {
  const marketplaceContext =
    marketplace === "ETSY"
      ? "CONTEXT: You are organizing a boutique shop. Buyers search for specific items like 'Ceramic Mug', 'Linen Dress', or 'Nursery Art'."
      : "CONTEXT: You are organizing a professional stock portfolio. Buyers search for concrete subjects like 'Business Meeting', 'Fresh Pasta', or 'Modern Architecture'.";

  const contextInstruction = context
    ? `\nCATEGORIZATION STYLE: ${CONTEXT_INSTRUCTIONS[context] || CONTEXT_INSTRUCTIONS.general}`
    : "";

  return `You are a Senior Digital Archivist organizing images by BROAD INDUSTRY CATEGORY.
Your goal is to create the FEWEST groups possible while keeping unrelated subjects separate.

${marketplaceContext}${contextInstruction}

### ABSOLUTELY FORBIDDEN LABELS (NEVER USE THESE):
- "Objects", "Items", "Things", "Stuff", "Elements", "Entities"
- "Products", "Goods", "Merchandise", "Assets"
- "General", "Mixed", "Miscellaneous", "Various", "Random", "Assorted"
- "Stock Image", "Photo", "Picture", "Content", "Media"
- "Collection", "Set", "Group", "Batch"

### CRITICAL RULE #1: MINIMIZE GROUP COUNT
**Create the FEWEST groups possible. Merge aggressively within industries.**
- If you see Salad, Burger, Cake, Coffee, and Wine → Put them ALL in ONE group called "Gastronomy"
- If you see Office, Living Room, Kitchen → Put them ALL in ONE group called "Interiors"
- If you see Portrait, Team Photo, Family → Put them ALL in ONE group called "People"
- Do NOT create sub-categories like "Desserts", "Beverages", "Breakfast" - use the BROAD industry term.

### CRITICAL RULE #2: ONLY SPLIT FOR DIFFERENT INDUSTRIES
**Only create separate groups when subjects are from DIFFERENT industries.**
- Food + Buildings = 2 groups (different industries)
- Salad + Cake + Coffee = 1 group "Gastronomy" (same industry: Food & Drink)
- Portrait + Team Photo = 1 group "People" (same industry: Human subjects)
- Office + Home = 1 group "Interiors" (same industry: Interior spaces)

### CRITICAL RULE #3: IGNORE CONTEXT AND STYLE
**Group by WHAT the subject IS, not WHERE it appears or HOW it looks.**
- A cocktail at a party = "Gastronomy" (not "Party" or "Nightlife")
- A person at a restaurant = "People" (not "Gastronomy")
- Modern office + Vintage office = "Interiors" (same group despite different styles)

### BROAD INDUSTRY CATEGORIES (Use ONLY these top-level terms):
- **Gastronomy** = ALL food and drink (meals, desserts, beverages, ingredients)
- **Architecture** = ALL buildings and structures (exteriors, facades, skylines)
- **Interiors** = ALL indoor spaces (homes, offices, restaurants, rooms)
- **People** = ALL human subjects (portraits, groups, business, lifestyle)
- **Nature** = ALL outdoor natural scenes (landscapes, wildlife, plants, water)
- **Products** = ALL consumer goods (fashion, electronics, furniture, accessories)
- **Transportation** = ALL vehicles (cars, planes, boats)

### INSTRUCTIONS:
- Sort images into MAXIMUM ${maxGroups} groups, but prefer FEWER.
- Use BROAD industry terms as titles (e.g., "Gastronomy" not "Desserts").
- Each group must have:
  - **title:** The BROAD industry category (1-2 words, Capitalized)
  - **semanticTags:** Array starting with the broad category, then optional specifics
- Every image must be in exactly one group.
- When in doubt, MERGE into the broader category.

IMAGES TO ORGANIZE:
${imageIndex}

### OUTPUT FORMAT:
Respond ONLY with valid JSON. Do not include markdown formatting.
{
  "groups": [
    {
      "groupId": "group-1",
      "imageIds": ["id1", "id2"],
      "title": "Gastronomy",
      "semanticTags": ["Food", "Dessert", "Sweet"],
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
