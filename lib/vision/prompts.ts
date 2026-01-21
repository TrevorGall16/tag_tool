import type { MarketplaceType } from "./types";

export function buildClusteringPrompt(
  imageIndex: string,
  marketplace: MarketplaceType,
  maxGroups: number
): string {
  const marketplaceContext =
    marketplace === "ETSY"
      ? "These are product images for an Etsy shop. Group by product type, style, or theme."
      : "These are stock photos for Adobe Stock. Group by subject matter, visual style, or composition.";

  return `You are an image clustering assistant. Analyze the provided images and group them by visual similarity.

${marketplaceContext}

IMAGE REFERENCE:
${imageIndex}

INSTRUCTIONS:
1. Examine all images carefully
2. Group visually similar images together (similar subjects, colors, styles, or themes)
3. Create meaningful groups where images could logically share the same tags
4. Aim for ${maxGroups} or fewer groups, but use more if the images are genuinely diverse
5. Each image must belong to exactly one group
6. Single-image groups are acceptable for unique images

RESPOND ONLY with valid JSON in this exact format:
{
  "groups": [
    {
      "groupId": "group-1",
      "imageIds": ["id1", "id2"],
      "suggestedLabel": "Short description of what unites this group",
      "confidence": 0.85
    }
  ]
}

Use the exact image IDs provided in the IMAGE REFERENCE section.
Confidence should be 0.0-1.0 based on how visually similar the grouped images are.`;
}

export function buildTagPrompt(marketplace: MarketplaceType): string {
  if (marketplace === "ETSY") {
    return `You are an Etsy SEO expert. Analyze this product image and generate metadata optimized for Etsy search.

REQUIREMENTS:
1. Title: Maximum 140 characters. Front-load important keywords. Include style, material, and use case.
2. Description: 2-3 sentences highlighting unique features and benefits. Include keywords naturally.
3. Tags: Exactly 13 tags (Etsy's limit). Mix of broad and specific terms. No commas within tags.

FOCUS ON: Handmade appeal, gift potential, style descriptors, materials, occasions, target audience.

RESPOND ONLY with valid JSON in this exact format:
{
  "title": "Your optimized title here",
  "description": "Your compelling description here",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10", "tag11", "tag12", "tag13"],
  "confidence": 0.85
}`;
  }

  // ADOBE_STOCK
  return `You are a stock photography metadata expert. Analyze this image and generate metadata optimized for Adobe Stock.

REQUIREMENTS:
1. Title: Maximum 200 characters. Descriptive and keyword-rich.
2. Description: 1-2 sentences describing the scene, subject, and mood.
3. Tags: 25-50 relevant keywords. Include concepts, emotions, colors, compositions, and commercial use cases.

FOCUS ON: Commercial applications, conceptual themes, technical aspects, mood/atmosphere, visual elements.

RESPOND ONLY with valid JSON in this exact format:
{
  "title": "Your descriptive title here",
  "description": "Your scene description here",
  "tags": ["keyword1", "keyword2", "..."],
  "confidence": 0.85
}`;
}
