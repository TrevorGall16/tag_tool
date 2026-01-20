export interface MarketplaceConfig {
  name: string;
  maxTags: number;
  maxTagLength: number;
  maxTitleLength: number;
  csvColumns: string[];
  tagSeparator: string;
}

export const MARKETPLACE_CONFIGS: Record<string, MarketplaceConfig> = {
  ETSY: {
    name: "Etsy",
    maxTags: 13,
    maxTagLength: 20,
    maxTitleLength: 140,
    csvColumns: ["Title", "Tags", "Image1"],
    tagSeparator: ", ",
  },
  ADOBE_STOCK: {
    name: "Adobe Stock",
    maxTags: 49,
    maxTagLength: 50,
    maxTitleLength: 200,
    csvColumns: ["Filename", "Title", "Keywords"],
    tagSeparator: ", ",
  },
};

/**
 * Get marketplace configuration by key
 */
export function getMarketplaceConfig(marketplace: string): MarketplaceConfig {
  const config = MARKETPLACE_CONFIGS[marketplace];
  if (!config) {
    throw new Error(`Unknown marketplace: ${marketplace}`);
  }
  return config;
}

/**
 * Validate tags against marketplace constraints
 */
export function validateTags(tags: string[], marketplace: string): string[] {
  const config = getMarketplaceConfig(marketplace);
  return tags
    .slice(0, config.maxTags)
    .map((tag) => tag.slice(0, config.maxTagLength).trim())
    .filter((tag) => tag.length > 0);
}

/**
 * Validate title against marketplace constraints
 */
export function validateTitle(title: string, marketplace: string): string {
  const config = getMarketplaceConfig(marketplace);
  return title.slice(0, config.maxTitleLength).trim();
}
