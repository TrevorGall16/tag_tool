import Anthropic from "@anthropic-ai/sdk";
import type { ClusterImageInput, ImageClusterGroup } from "@/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ClusterResult {
  groups: ImageClusterGroup[];
}

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

function buildClusteringPrompt(imageIndex: string, marketplace: string, maxGroups: number): string {
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

function parseClusterResponse(
  responseText: string,
  originalImages: ClusterImageInput[]
): ClusterResult {
  try {
    const jsonMatch =
      responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/\{[\s\S]*\}/);

    const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : responseText;
    const parsed = JSON.parse(jsonStr);

    const groups: ImageClusterGroup[] = parsed.groups.map(
      (
        group: {
          groupId?: string;
          imageIds?: string[];
          image_ids?: string[];
          suggestedLabel?: string;
          label?: string;
          confidence?: number;
        },
        index: number
      ) => ({
        groupId: group.groupId || `group-${index + 1}`,
        imageIds: group.imageIds || group.image_ids || [],
        suggestedLabel: group.suggestedLabel || group.label || undefined,
        confidence: typeof group.confidence === "number" ? group.confidence : 0.8,
      })
    );

    const assignedIds = new Set(groups.flatMap((g) => g.imageIds));
    const unassignedIds = originalImages.map((img) => img.id).filter((id) => !assignedIds.has(id));

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

export async function clusterImagesWithVision(
  images: ClusterImageInput[],
  marketplace: string,
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

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
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

  const responseText = message.content[0].type === "text" ? message.content[0].text : "";

  return parseClusterResponse(responseText, images);
}
