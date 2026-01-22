import OpenAI from "openai";
import type {
  IVisionProvider,
  ClusterResult,
  ClusterImageInput,
  TagImageInput,
  ImageTagResult,
  MarketplaceType,
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

function buildTagPrompt(market: string) {
  // OPTIMIZATION: Minified + Specific Tag Count
  return `
    Generate high-ranking SEO tags for this ${market} product image.
    
    CRITICAL OUTPUT RULES:
    1. Return strictly valid JSON.
    2. MINIFY your JSON (no line breaks, no indentation, no whitespace).
    3. Return exactly 15-20 relevant tags.
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
    maxGroups: number
  ): Promise<ClusterResult> {
    const contentParts = images.map((img) => ({
      type: "image_url" as const,
      image_url: {
        url: img.dataUrl,
        // OPTIMIZATION: Low detail saves ~85 tokens per image
        detail: "low" as const,
      },
    }));

    const prompt = buildClusteringPrompt(
      images.map((img) => img.id).join(", "),
      marketplace,
      maxGroups
    );

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
    marketplace: MarketplaceType
  ): Promise<ImageTagResult[]> {
    const image = images[0];

    // SAFETY CHECK: Prevents crash if image list is empty
    if (!image) {
      console.warn("No images provided to generateTags");
      return [];
    }

    const prompt = buildTagPrompt(marketplace);

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
