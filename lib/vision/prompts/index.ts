import type { PlatformType } from "@/types";
import type { MarketplaceType, StrategyType } from "../types";
import { buildAdobeTagPrompt, ADOBE_DEFAULTS, getAdobeDescription } from "./adobe";
import { buildEtsyTagPrompt, ETSY_DEFAULTS, getEtsyDescription } from "./etsy";
import {
  buildGenericTagPrompt,
  GENERIC_DEFAULTS,
  SHUTTERSTOCK_DEFAULTS,
  getGenericDescription,
} from "./generic";

// Re-export shared utilities
export { getStrategyPersona, buildClusteringPrompt, APPROVED_CATEGORIES } from "./shared";
export type { ApprovedCategory } from "./shared";

// Re-export description helpers
export { getAdobeDescription } from "./adobe";
export { getEtsyDescription } from "./etsy";
export { getGenericDescription } from "./generic";

// ============================================
// Platform Config
// ============================================

export interface PlatformConfig {
  maxTags: number;
  systemInstruction: string;
}

const PLATFORM_CONFIGS: Record<PlatformType, PlatformConfig> = {
  ADOBE: ADOBE_DEFAULTS,
  SHUTTERSTOCK: SHUTTERSTOCK_DEFAULTS,
  ETSY: ETSY_DEFAULTS,
  GENERIC: GENERIC_DEFAULTS,
};

export function getPlatformConfig(platform: PlatformType): PlatformConfig {
  return PLATFORM_CONFIGS[platform] || PLATFORM_CONFIGS.GENERIC;
}

export function getDefaultTagCount(strategy: StrategyType): number {
  switch (strategy) {
    case "etsy":
      return ETSY_DEFAULTS.maxTags;
    case "stock":
      return ADOBE_DEFAULTS.maxTags;
    case "standard":
    default:
      return GENERIC_DEFAULTS.maxTags;
  }
}

// ============================================
// Unified Prompt Builder
// ============================================

export function getPlatformPrompt(platform: PlatformType, tagCount: number): string {
  const config = getPlatformConfig(platform);
  if (platform === "GENERIC" || !config.systemInstruction) return "";
  return `PLATFORM OPTIMIZATION (${platform}): ${config.systemInstruction}
Tag limit for this platform: ${config.maxTags} keywords maximum.

`;
}

export interface TagPromptOptions {
  marketplace: MarketplaceType;
  strategy?: StrategyType;
  maxTags?: number;
  imageCount?: number;
}

export function buildTagPrompt(options: TagPromptOptions): string;
export function buildTagPrompt(
  marketplace: MarketplaceType,
  strategy?: StrategyType,
  maxTags?: number
): string;
export function buildTagPrompt(
  marketplaceOrOptions: MarketplaceType | TagPromptOptions,
  strategyArg?: StrategyType,
  maxTagsArg?: number
): string {
  let marketplace: MarketplaceType;
  let strategy: StrategyType;
  let maxTags: number;

  if (typeof marketplaceOrOptions === "object") {
    marketplace = marketplaceOrOptions.marketplace;
    strategy = marketplaceOrOptions.strategy || "standard";
    maxTags = marketplaceOrOptions.maxTags || 25;
  } else {
    marketplace = marketplaceOrOptions;
    strategy = strategyArg || "standard";
    maxTags = maxTagsArg || 25;
  }

  if (marketplace === "ETSY") {
    return buildEtsyTagPrompt(strategy, maxTags);
  }
  if (marketplace === "ADOBE_STOCK") {
    return buildAdobeTagPrompt(strategy, maxTags);
  }
  return buildGenericTagPrompt(strategy, maxTags);
}

/**
 * Build the batch-analysis guard for multi-image requests.
 * Injected before the main prompt when imageCount > 1.
 */
function buildBatchGuard(imageCount: number): string {
  if (imageCount <= 1) return "";

  return `BATCH ANALYSIS — You are viewing ${imageCount} images from the SAME group.
1. Identify the COMMON THEMES, subjects, and visual elements shared across ALL images.
2. Your tags, title, and description must describe what the images have IN COMMON.
3. If the images differ significantly, strictly prioritize tags that apply to ALL of them.
4. AVOID tags that only apply to a single image in the batch.
5. The title should summarize the shared subject/scene, not describe one specific image.

`;
}

export function buildPlatformTagPrompt(
  options: TagPromptOptions & { platform?: PlatformType }
): string {
  const basePrompt = buildTagPrompt(options);
  const batchGuard = buildBatchGuard(options.imageCount || 1);

  if (!options.platform || options.platform === "GENERIC") {
    return batchGuard + basePrompt;
  }

  const platformPrefix = getPlatformPrompt(options.platform, options.maxTags || 25);
  return batchGuard + platformPrefix + basePrompt;
}

export function getStrategyDescription(strategy: StrategyType, tagCount: number): string {
  switch (strategy) {
    case "etsy":
      return getEtsyDescription(tagCount);
    case "stock":
      return getAdobeDescription(tagCount);
    case "standard":
    default:
      return getGenericDescription(tagCount);
  }
}
