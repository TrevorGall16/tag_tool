import type { ClusterImageInput, ImageClusterGroup, TagImageInput, ImageTagResult } from "@/types";

export type VisionProviderType = "anthropic" | "openai";
export type MarketplaceType = "ETSY" | "ADOBE_STOCK";
export type StrategyType = "standard" | "etsy" | "stock";

export interface ClusterResult {
  groups: ImageClusterGroup[];
}

export interface GenerateTagsOptions {
  marketplace: MarketplaceType;
  strategy?: StrategyType;
  maxTags?: number;
}

export interface IVisionProvider {
  readonly name: string;
  clusterImages(
    images: ClusterImageInput[],
    marketplace: MarketplaceType,
    maxGroups: number,
    context?: string
  ): Promise<ClusterResult>;
  generateTags(
    images: TagImageInput[],
    marketplace: MarketplaceType,
    strategy?: StrategyType,
    maxTags?: number
  ): Promise<ImageTagResult[]>;
}

export type ImageMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

// Re-export types for convenience
export type { ClusterImageInput, ImageClusterGroup, TagImageInput, ImageTagResult };
