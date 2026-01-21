import type { ClusterImageInput, ImageClusterGroup, TagImageInput, ImageTagResult } from "@/types";

export type VisionProviderType = "anthropic" | "openai";
export type MarketplaceType = "ETSY" | "ADOBE_STOCK";

export interface ClusterResult {
  groups: ImageClusterGroup[];
}

export interface IVisionProvider {
  readonly name: string;
  clusterImages(
    images: ClusterImageInput[],
    marketplace: MarketplaceType,
    maxGroups: number
  ): Promise<ClusterResult>;
  generateTags(images: TagImageInput[], marketplace: MarketplaceType): Promise<ImageTagResult[]>;
}

export type ImageMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

// Re-export types for convenience
export type { ClusterImageInput, ImageClusterGroup, TagImageInput, ImageTagResult };
