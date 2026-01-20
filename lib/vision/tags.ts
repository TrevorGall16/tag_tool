import Anthropic from "@anthropic-ai/sdk";
import type { TagImageInput, ImageTagResult } from "@/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

type ImageMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

function getMediaType(dataUrl: string): ImageMediaType {
  if (dataUrl.includes("image/png")) return "image/png";
  if (dataUrl.includes("image/webp")) return "image/webp";
  if (dataUrl.includes("image/gif")) return "image/gif";
  return "image/jpeg";
}

function extractBase64Data(dataUrl: string): string {
  const base64Match = dataUrl.match(/base64,(.+)/);
  return base64Match ? base64Match[1] : dataUrl;
}

function buildTagPrompt(marketplace: string): string {
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

function parseTagResponse(responseText: string, imageId: string): ImageTagResult {
  try {
    const jsonMatch =
      responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/\{[\s\S]*\}/);

    const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : responseText;
    const parsed = JSON.parse(jsonStr);

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

export async function generateTagsForImage(
  image: TagImageInput,
  marketplace: string
): Promise<ImageTagResult> {
  const prompt = buildTagPrompt(marketplace);

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
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

  const responseText = message.content[0].type === "text" ? message.content[0].text : "";

  return parseTagResponse(responseText, image.id);
}

export async function generateTagsForImages(
  images: TagImageInput[],
  marketplace: string
): Promise<ImageTagResult[]> {
  const results: ImageTagResult[] = [];

  for (const image of images) {
    try {
      const result = await generateTagsForImage(image, marketplace);
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
