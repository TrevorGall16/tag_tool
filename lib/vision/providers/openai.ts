import OpenAI from "openai";

// --------------------------------------------------------------
// 1. ALL TYPES DEFINED LOCALLY (No imports from ../types)
// --------------------------------------------------------------
export type MarketplaceType = 'etsy' | 'shopify' | 'amazon' | 'general';

export interface ClusterImageInput {
  id: string;
  dataUrl: string;
}

export interface TagImageInput {
  id: string;
  dataUrl: string;
}

export interface ClusterResult {
  groups: any[]; 
}

export interface ImageTagResult {
  imageId: string;
  tags: string[];
  title?: string;
  description?: string;
  confidence?: number;
}

export interface IVisionProvider {
  name: string;
  clusterImages(images: ClusterImageInput[], marketplace: MarketplaceType, maxGroups: number): Promise<ClusterResult>;
  generateTags(images: TagImageInput[], marketplace: MarketplaceType): Promise<ImageTagResult[]>;
}

// --------------------------------------------------------------
// 2. HELPER FUNCTIONS DEFINED LOCALLY (No imports from ../utils)
// --------------------------------------------------------------
function extractJsonFromResponse(text: string): any {
  try {
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace >= 0) {
       return JSON.parse(text.substring(firstBrace, lastBrace + 1));
    }
    return JSON.parse(text);
  } catch (e) {
    return {};
  }
}

function buildClusteringPrompt(ids: string, market: string, max: number) {
  return `Cluster these images (${ids}) from ${market} into max ${max} groups.`;
}

function buildTagPrompt(market: string) {
  return `Generate tags for this ${market} item.`;
}

// --------------------------------------------------------------
// 3. MAIN CLASS
// --------------------------------------------------------------
export class OpenAIVisionProvider implements IVisionProvider {
  readonly name = "openai";
  private client: OpenAI;

  constructor() {
    // We add '|| ""' to prevent strict null check errors
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "", 
      dangerouslyAllowBrowser: true,
    });
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
            detail: "low" as const
        }
    }));

    const prompt = buildClusteringPrompt(
      images.map((img) => img.id).join(", "),
      marketplace,
      maxGroups
    );

    // 'as any' forces TypeScript to ignore library version conflicts
    const response = await this.client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            ...contentParts,
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    }) as any;

    const text = response.choices[0].message.content || "{}";
    return extractJsonFromResponse(text);
  }

async generateTags(
    images: TagImageInput[],
    marketplace: MarketplaceType
  ): Promise<ImageTagResult[]> {
    const image = images[0];

    // --- FIX: Safety Check ---
    // If the list is empty, 'image' is undefined. We must stop here.
    if (!image) {
      console.warn("No images provided to generateTags");
      return [];
    }

    const prompt = buildTagPrompt(marketplace);

    // 'as any' forces TypeScript to ignore library version conflicts
    const response = await this.client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: image.dataUrl, // Now safe because we checked 'if (!image)' above
                detail: "high",
              },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500,
    }) as any;

    const text = response.choices[0].message.content || "{}";
    const result = extractJsonFromResponse(text);

    return [
      {
        imageId: image.id, // Now safe
        title: result.title || "",
        description: result.description || "",
        tags: result.tags || [],
        confidence: result.confidence || 0.0,
      },
    ];
  }
}