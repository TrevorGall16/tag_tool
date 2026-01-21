// src/types.ts

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
  // Add whatever fields you expect, e.g.:
  groups: any[]; 
}

export interface ImageTagResult {
  imageId: string;
  tags: string[];
}

// This interface makes sure your OpenAI class matches what the rest of the app expects
export interface IVisionProvider {
  name: string;
  clusterImages(images: ClusterImageInput[], marketplace: MarketplaceType, maxGroups: number): Promise<ClusterResult>;
  generateTags(images: TagImageInput[], marketplace: MarketplaceType): Promise<ImageTagResult[]>;
}