import type {
  IVisionProvider,
  VisionProviderType,
  ClusterResult,
  ClusterImageInput,
  TagImageInput,
  ImageTagResult,
  ImageClusterGroup,
  MarketplaceType,
  StrategyType,
} from "./types";
import type { PlatformType } from "@/types";
import { AnthropicVisionProvider, type AnthropicProviderConfig } from "./providers/anthropic";
import { OpenAIVisionProvider, type OpenAIProviderConfig } from "./providers/openai";

// Re-export types for convenience
export type {
  IVisionProvider,
  VisionProviderType,
  ClusterResult,
  ClusterImageInput,
  TagImageInput,
  ImageTagResult,
  ImageClusterGroup,
  MarketplaceType,
  StrategyType,
};

export type VisionProviderConfig = AnthropicProviderConfig | OpenAIProviderConfig;

let cachedProvider: IVisionProvider | null = null;

export class VisionFactory {
  static getProviderType(): VisionProviderType {
    const provider = process.env.AI_PROVIDER?.toLowerCase();
    return provider === "openai" ? "openai" : "anthropic";
  }

  static getProvider(): IVisionProvider {
    if (!cachedProvider) {
      cachedProvider = VisionFactory.createProvider();
    }
    return cachedProvider;
  }

  static createProvider(type?: VisionProviderType, config?: VisionProviderConfig): IVisionProvider {
    const providerType = type || VisionFactory.getProviderType();

    switch (providerType) {
      case "openai":
        return new OpenAIVisionProvider(config as OpenAIProviderConfig);
      case "anthropic":
      default:
        return new AnthropicVisionProvider(config as AnthropicProviderConfig);
    }
  }

  static clearCache(): void {
    cachedProvider = null;
  }
}

// Backwards-compatible exports
export async function clusterImagesWithVision(
  images: ClusterImageInput[],
  marketplace: string,
  maxGroups: number,
  context?: string
): Promise<ClusterResult> {
  return VisionFactory.getProvider().clusterImages(
    images,
    marketplace as MarketplaceType,
    maxGroups,
    context
  );
}

export async function generateTagsForImages(
  images: TagImageInput[],
  marketplace: string,
  strategy: string = "standard",
  maxTags: number = 25,
  platform?: PlatformType
): Promise<ImageTagResult[]> {
  return VisionFactory.getProvider().generateTags(
    images,
    marketplace as MarketplaceType,
    strategy as StrategyType,
    maxTags,
    platform
  );
}
