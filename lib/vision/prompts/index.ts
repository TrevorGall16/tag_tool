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

export function buildPlatformTagPrompt(
  options: TagPromptOptions & { platform?: PlatformType }
): string {
  const basePrompt = buildTagPrompt(options);

  if (!options.platform || options.platform === "GENERIC") {
    return basePrompt;
  }

  const platformPrefix = getPlatformPrompt(options.platform, options.maxTags || 25);
  return platformPrefix + basePrompt;
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
