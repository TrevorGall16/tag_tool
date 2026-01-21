import OpenAI from "openai";
import type {
  IVisionProvider,
  ClusterResult,
  ClusterImageInput,
  ImageClusterGroup,
  TagImageInput,
  ImageTagResult,
  MarketplaceType,
} from "../types";
import { extractJsonFromResponse } from "../utils";
import { buildClusteringPrompt, buildTagPrompt } from "../prompts";

export interface OpenAIProviderConfig {
  apiKey?: string;
  model?: string;
}

export class OpenAIVisionProvider implements IVisionProvider {
  readonly name = "openai";
  private client: OpenAI;
  private model: string;

  constructor(config: OpenAIProviderConfig = {}) {
    this.client = new OpenAI({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
    });
    this.model = config.model || "gpt-4o";
  }

  async clusterImages(
    images: ClusterImageInput[],
    marketplace: MarketplaceType,
    maxGroups: number
  ): Promise<ClusterResult> {
    const imageContent: OpenAI.Chat.Completions.ChatCompletionContentPartImage[] = images.map(
      (img) => ({
        type: "image_url" as const,
        image_url: {
          url: img.dataUrl,
          detail: "low" as const,
        },
      })
    );

    const imageIndex = images.map((img, i) => `Image ${i + 1}: ID="${img.id}"`).join("\n");

    const prompt = buildClusteringPrompt(imageIndex, marketplace, maxGroups);

    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [
            ...imageContent,
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
    });

    const responseText = response.choices[0]?.message?.content || "";

    return this.parseClusterResponse(responseText, images);
  }

  async generateTags(
    images: TagImageInput[],
    marketplace: MarketplaceType
  ): Promise<ImageTagResult[]> {
    const results: ImageTagResult[] = [];

    for (const image of images) {
      try {
        const result = await this.generateTagsForImage(image, marketplace);
        results.push(result);
      } catch (error) {
        console.error(`Failed to generate tags for image ${image.id}:`, error);
        results.push({
          imageId: image.id,
          title: "Error",
          description: "Failed to generate tags for this image",
          tags: [],
          confidence: 0,
        });
      }
    }

    return results;
  }

  private async generateTagsForImage(
    image: TagImageInput,
    marketplace: MarketplaceType
  ): Promise<ImageTagResult> {
    const prompt = buildTagPrompt(marketplace);

    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: image.dataUrl,
                detail: "low",
              },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
    });

    const responseText = response.choices[0]?.message?.content || "";

    return this.parseTagResponse(responseText, image.id);
  }

  private parseClusterResponse(
    responseText: string,
    originalImages: ClusterImageInput[]
  ): ClusterResult {
    try {
      const parsed = extractJsonFromResponse(responseText) as {
        groups: Array<{
          groupId?: string;
          imageIds?: string[];
          image_ids?: string[];
          suggestedLabel?: string;
          label?: string;
          confidence?: number;
        }>;
      };

      const groups: ImageClusterGroup[] = parsed.groups.map((group, index) => ({
        groupId: group.groupId || `group-${index + 1}`,
        imageIds: group.imageIds || group.image_ids || [],
        suggestedLabel: group.suggestedLabel || group.label || undefined,
        confidence: typeof group.confidence === "number" ? group.confidence : 0.8,
      }));

      const assignedIds = new Set(groups.flatMap((g) => g.imageIds));
      const unassignedIds = originalImages
        .map((img) => img.id)
        .filter((id) => !assignedIds.has(id));

      if (unassignedIds.length > 0) {
        groups.push({
          groupId: "group-unclustered",
          imageIds: unassignedIds,
          suggestedLabel: "Uncategorized",
          confidence: 0.5,
        });
      }

      return { groups };
    } catch (error) {
      console.error("Failed to parse cluster response:", responseText, error);
      return {
        groups: [
          {
            groupId: "group-1",
            imageIds: originalImages.map((img) => img.id),
            suggestedLabel: "All Images",
            confidence: 0.5,
          },
        ],
      };
    }
  }

  private parseTagResponse(responseText: string, imageId: string): ImageTagResult {
    try {
      const parsed = extractJsonFromResponse(responseText) as {
        title?: string;
        description?: string;
        tags?: string[];
        confidence?: number;
      };

      return {
        imageId,
        title: parsed.title || "Untitled",
        description: parsed.description || "",
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.7,
      };
    } catch (error) {
      console.error("Failed to parse tag response:", responseText, error);
      return {
        imageId,
        title: "Untitled",
        description: "",
        tags: [],
        confidence: 0,
      };
    }
  }
}
