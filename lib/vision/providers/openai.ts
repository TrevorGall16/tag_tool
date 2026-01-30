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

function extractJsonFromResponse(text: string): any {
  try {
    // 1. Remove markdown code blocks (```json ... ``` or ``` ... ```)
    let clean = text
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    // 2. Find the first '{' and last '}' to handle intro/outro text
    const first = clean.indexOf("{");
    const last = clean.lastIndexOf("}");

    if (first === -1 || last === -1) {
      console.error("[OpenAI extractJsonFromResponse] No JSON object found. Raw text:", text);
      return { groups: [] };
    }

    return JSON.parse(clean.substring(first, last + 1));
  } catch (e) {
    console.error("[OpenAI extractJsonFromResponse] JSON Parse Failed. Raw text:", text, e);
    return { groups: [] };
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

    // DEBUG: Log raw AI response before parsing
    console.log("[OpenAI Cluster] RAW TEXT:", text);

    return this.parseClusterResponse(text, images);
  }

  private parseClusterResponse(
    responseText: string,
    originalImages: ClusterImageInput[]
  ): ClusterResult {
    try {
      const parsed = extractJsonFromResponse(responseText) as {
        groups?: Array<{
          groupId?: string;
          imageIds?: string[];
          image_ids?: string[];
          title?: string;
          name?: string; // AI sometimes returns 'name' instead of 'title'
          category?: string;
          suggestedLabel?: string;
          semanticTags?: string[];
          label?: string;
          confidence?: number;
        }>;
      };

      if (!parsed.groups || !Array.isArray(parsed.groups)) {
        console.error("[OpenAI] No groups array in response:", parsed);
        return {
          groups: [
            {
              groupId: "group-1",
              imageIds: originalImages.map((img) => img.id),
              title: "All Images",
              suggestedLabel: "All Images",
              semanticTags: ["All Images"],
              confidence: 0.5,
            },
          ],
        };
      }

      const groups = parsed.groups.map((group, index) => {
        // Title priority: title > name > category > label
        const title =
          group.title || group.name || group.category || group.label || `Group ${index + 1}`;

        const semanticTags = Array.isArray(group.semanticTags)
          ? group.semanticTags
          : title
            ? [title]
            : undefined;

        return {
          groupId: group.groupId || `group-${index + 1}`,
          imageIds: group.imageIds || group.image_ids || [],
          title,
          suggestedLabel: title,
          semanticTags,
          confidence: typeof group.confidence === "number" ? group.confidence : 0.8,
        };
      });

      // Handle unassigned images
      const assignedIds = new Set(groups.flatMap((g) => g.imageIds));
      const unassignedIds = originalImages
        .map((img) => img.id)
        .filter((id) => !assignedIds.has(id));

      if (unassignedIds.length > 0) {
        groups.push({
          groupId: "group-unclustered",
          imageIds: unassignedIds,
          title: "Uncategorized",
          suggestedLabel: "Uncategorized",
          semanticTags: ["Uncategorized"],
          confidence: 0.5,
        });
      }

      return { groups };
    } catch (error) {
      console.error("[OpenAI] Failed to parse cluster response:", responseText, error);
      return {
        groups: [
          {
            groupId: "group-1",
            imageIds: originalImages.map((img) => img.id),
            title: "All Images",
            suggestedLabel: "All Images",
            semanticTags: ["All Images"],
            confidence: 0.5,
          },
        ],
      };
    }
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
