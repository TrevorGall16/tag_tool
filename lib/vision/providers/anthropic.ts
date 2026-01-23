import Anthropic from "@anthropic-ai/sdk";
import type {
  IVisionProvider,
  ClusterResult,
  ClusterImageInput,
  ImageClusterGroup,
  TagImageInput,
  ImageTagResult,
  MarketplaceType,
  StrategyType,
} from "../types";
import { getMediaType, extractBase64Data, extractJsonFromResponse } from "../utils";
import { buildClusteringPrompt, buildTagPrompt } from "../prompts";

export interface AnthropicProviderConfig {
  apiKey?: string;
  model?: string;
}

export class AnthropicVisionProvider implements IVisionProvider {
  readonly name = "anthropic";
  private client: Anthropic;
  private model: string;

  constructor(config: AnthropicProviderConfig = {}) {
    this.client = new Anthropic({
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
    });
    this.model = config.model || "claude-sonnet-4-20250514";
  }

  async clusterImages(
    images: ClusterImageInput[],
    marketplace: MarketplaceType,
    maxGroups: number
  ): Promise<ClusterResult> {
    const imageContent: Anthropic.ImageBlockParam[] = images.map((img) => ({
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: getMediaType(img.dataUrl),
        data: extractBase64Data(img.dataUrl),
      },
    }));

    const imageIndex = images.map((img, i) => `Image ${i + 1}: ID="${img.id}"`).join("\n");

    const prompt = buildClusteringPrompt(imageIndex, marketplace, maxGroups);

    const message = await this.client.messages.create({
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

    const firstContent = message.content[0];
    const responseText = firstContent?.type === "text" ? firstContent.text : "";

    return this.parseClusterResponse(responseText, images);
  }

  async generateTags(
    images: TagImageInput[],
    marketplace: MarketplaceType,
    strategy: StrategyType = "standard"
  ): Promise<ImageTagResult[]> {
    const results: ImageTagResult[] = [];

    for (const image of images) {
      try {
        const result = await this.generateTagsForImage(image, marketplace, strategy);
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
    marketplace: MarketplaceType,
    strategy: StrategyType
  ): Promise<ImageTagResult> {
    const prompt = buildTagPrompt(marketplace, strategy);

    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: getMediaType(image.dataUrl),
                data: extractBase64Data(image.dataUrl),
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

    const firstContent = message.content[0];
    const responseText = firstContent?.type === "text" ? firstContent.text : "";

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
