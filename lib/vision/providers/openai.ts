import OpenAI from "openai";
import type {
  IVisionProvider,
  ClusterResult,
  ClusterImageInput,
  TagImageInput,
  ImageTagResult,
  MarketplaceType,
  StrategyType,
} from "../types";

export interface OpenAIProviderConfig {
  apiKey?: string;
  model?: string;
}

// ==============================================================
// 2. HELPER FUNCTIONS (Optimized & Self-Contained)
// ==============================================================

// This was the missing piece causing the red line!
function extractJsonFromResponse(text: string): any {
  try {
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace >= 0) {
      return JSON.parse(text.substring(firstBrace, lastBrace + 1));
    }
    return JSON.parse(text);
  } catch (e) {
    return {};
  }
}

function buildClusteringPrompt(ids: string, market: string, max: number) {
  // OPTIMIZATION: "Minified JSON" saves ~30% tokens
  return `
    Analyze these product images (IDs: ${ids}) for a ${market} listing.
    Group them visually into a maximum of ${max} groups based on color, angle, or variation.
    
    CRITICAL OUTPUT RULES:
    1. Return strictly valid JSON.
    2. MINIFY your JSON (no line breaks, no indentation, no whitespace).
    3. Structure: { "groups": [{ "name": "...", "imageIds": ["..."] }] }
  `.trim();
}

const STRATEGY_PERSONAS: Record<StrategyType, string> = {
  standard: "",
  etsy: "Act as an Etsy SEO expert. Use high-conversion, long-tail keywords and describe the mood/aesthetic.",
  stock:
    "Act as a professional Stock Content Manager. Use objective, technical terms. Do not use subjective language.",
};

function buildTagPrompt(market: string, strategy: StrategyType = "standard", maxTags: number = 25) {
  const persona = STRATEGY_PERSONAS[strategy] || "";
  const personaLine = persona ? `\n    PERSONA: ${persona}\n` : "";
  const tagLimit = Math.max(5, Math.min(50, maxTags));
  // OPTIMIZATION: Minified + Specific Tag Count
  return `${personaLine}
    Generate high-ranking SEO tags for this ${market} product image.

    CRITICAL OUTPUT RULES:
    1. Return strictly valid JSON.
    2. MINIFY your JSON (no line breaks, no indentation, no whitespace).
    3. Return exactly ${tagLimit} relevant tags. Never exceed ${tagLimit} tags.
    4. Structure: { "title": "...", "description": "...", "tags": ["tag1", "tag2"], "confidence": 0.9 }
  `.trim();
}

// ==============================================================
// 3. MAIN CLASS
// ==============================================================
export class OpenAIVisionProvider implements IVisionProvider {
  readonly name = "openai";
  private client: OpenAI;
  private model: string;

  constructor(config: OpenAIProviderConfig = {}) {
    this.client = new OpenAI({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY || "",
      dangerouslyAllowBrowser: true,
    });
    this.model = config.model || "gpt-4o";
  }

  async clusterImages(
    images: ClusterImageInput[],
    marketplace: MarketplaceType,
    maxGroups: number,
    _context?: string // Not used by OpenAI provider's simple prompt
  ): Promise<ClusterResult> {
    const contentParts = images.map((img) => ({
      type: "image_url" as const,
      image_url: {
        url: img.dataUrl,
        // OPTIMIZATION: Low detail saves ~85 tokens per image
        detail: "low" as const,
      },
    }));

    const imageList = images
      .map((img) => (img.name ? `${img.id} (${img.name})` : img.id))
      .join(", ");
    const prompt = buildClusteringPrompt(imageList, marketplace, maxGroups);

    // 'as any' silences the version conflict errors
    const response = (await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: prompt }, ...contentParts],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    })) as any;

    const text = response.choices[0].message.content || "{}";
    return extractJsonFromResponse(text);
  }

  async generateTags(
    images: TagImageInput[],
    marketplace: MarketplaceType,
    strategy: StrategyType = "standard",
    maxTags: number = 25
  ): Promise<ImageTagResult[]> {
    const image = images[0];

    // SAFETY CHECK: Prevents crash if image list is empty
    if (!image) {
      console.warn("No images provided to generateTags");
      return [];
    }

    const prompt = buildTagPrompt(marketplace, strategy, maxTags);

    const response = (await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: image.dataUrl,
                detail: "high", // High detail needed for reading text/texture
              },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500,
    })) as any;

    const text = response.choices[0].message.content || "{}";
    const result = extractJsonFromResponse(text);

    return [
      {
        imageId: image.id,
        title: result.title || "",
        description: result.description || "",
        tags: result.tags || [],
        confidence: result.confidence || 0.0,
      },
    ];
  }
}
