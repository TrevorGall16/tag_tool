import OpenAI from "openai";
import type {
  IVisionProvider,
  ClusterResult,
  ClusterImageInput,
  ImageDescription,
  TagImageInput,
  ImageTagResult,
  MarketplaceType,
  StrategyType,
} from "../types";
import type { PlatformType, ImageClusterGroup } from "@/types";
import { getPlatformConfig } from "../prompts/index";

export interface OpenAIProviderConfig {
  apiKey?: string;
  model?: string;
}

// ==============================================================
// HELPER FUNCTIONS
// ==============================================================

const CONCURRENCY_LIMIT = 10;

function extractJsonFromResponse(text: string): any {
  try {
    let clean = text
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    const first = clean.indexOf("{");
    const last = clean.lastIndexOf("}");

    if (first === -1 || last === -1) {
      console.error("[OpenAI extractJsonFromResponse] No JSON object found. Raw text:", text);
      return { groups: [] };
    }

    return JSON.parse(clean.substring(first, last + 1));
  } catch (e) {
    console.error("[OpenAI extractJsonFromResponse] JSON Parse Failed. Raw text:", text, e);
    return { groups: [] };
  }
}

/**
 * Run async tasks with a concurrency limit.
 */
async function runWithConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < tasks.length) {
      const index = nextIndex++;
      results[index] = await tasks[index]!();
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// ==============================================================
// STEP 1 PROMPT: Visual Analysis ("The Eyes")
// ==============================================================

const VISION_ANALYSIS_PROMPT = `Analyze this stock photo. Return a valid JSON object (NO markdown) with these fields:
{
  "main_subject": "String. Format: 'Category - Detail'. Categories MUST be one of: [Gastronomy, Music, People, Nature, Animals, Urban, Technology, Objects]. Example: 'Gastronomy - Burger' or 'Music - Electric Guitar'.",
  "setting": "String. (e.g. Studio, Outdoor, Concert, Office).",
  "vibe": "String. Select ONLY from: [Bright, Moody, Minimalist, High-Contrast, Authentic, Corporate].",
  "shot_context": "String. (e.g. Close-up, Wide angle, Drone shot, Studio setup).",
  "narrative": "String. (What is happening?).",
  "usage_type": "String. (Commercial or Editorial)."
}`;

// ==============================================================
// STEP 2 PROMPT BUILDER: Clustering ("The Archivist")
// ==============================================================

function buildArchivistPrompt(
  descriptions: { imageId: string; description: ImageDescription }[],
  maxGroups: number,
  context?: string
): string {
  const descriptionList = descriptions
    .map(
      (d, i) =>
        `${i + 1}. ID="${d.imageId}" | Subject: ${d.description.main_subject} | Setting: ${d.description.setting} | Vibe: ${d.description.vibe} | Shot: ${d.description.shot_context} | Narrative: ${d.description.narrative} | Usage: ${d.description.usage_type}`
    )
    .join("\n");

  return `You are a Senior Stock Archivist.

**INPUT:**
- Context: '${context || "EMPTY"}'
- Images: [List of structured descriptions]

**CRITICAL OPERATING MODES:**

**MODE A: THE LIBRARIAN (Trigger: Context is EMPTY or Vague like 'My Photos')**
- **Logic:** STRICT CATEGORIZATION.
- **Rule:** You MUST create separate groups based on the 'main_subject' Category.
- **Constraint:** NEVER lump different Categories (e.g. 'Gastronomy' and 'Music') just because they share a 'Vibe'.
- **Output Example:** Group 1: Music (Guitars), Group 2: Gastronomy (Burgers).

**MODE B: THE STORYTELLER (Trigger: Context is SPECIFIC like 'Summer Festival')**
- **Logic:** NARRATIVE GROUPING.
- **Rule:** You MAY lump diverse subjects (Guitar + Burger) ONLY if they fit the specific Context.

**MANDATORY SPLIT RULES (Always Active):**
- Split if 'usage_type' differs (Commercial vs Editorial).
- Split if 'shot_context' clashes (e.g. Drone Shot vs Macro Detail).

**CONSTRAINTS:**
- Maximum ${maxGroups} groups.
- Every image must be assigned to exactly one group.

**DESCRIPTIONS:**
${descriptionList}

Return ONLY valid JSON:
{"groups":[{"title":"Descriptive Photoshoot Name","semanticTags":["tag1","tag2","tag3"],"imageIds":["id1","id2"],"confidence":0.95}]}`;
}

const STRATEGY_PERSONAS: Record<StrategyType, string> = {
  standard: "",
  etsy: "Act as an Etsy SEO expert. Use high-conversion, long-tail keywords and describe the mood/aesthetic.",
  stock:
    "Act as a professional Stock Content Manager. Use objective, technical terms. Do not use subjective language.",
};

function buildTagPrompt(market: string, strategy: StrategyType = "standard", maxTags: number = 25) {
  const persona = STRATEGY_PERSONAS[strategy] || "";
  const personaLine = persona ? `\n    PERSONA: ${persona}\n` : "";
  const tagLimit = Math.max(5, Math.min(50, maxTags));
  return `${personaLine}
    Generate high-ranking SEO tags for this ${market} product image.

    CRITICAL OUTPUT RULES:
    1. Return strictly valid JSON.
    2. MINIFY your JSON (no line breaks, no indentation, no whitespace).
    3. Return exactly ${tagLimit} relevant tags. Never exceed ${tagLimit} tags.
    4. Structure: { "title": "...", "description": "...", "tags": ["tag1", "tag2"], "confidence": 0.9 }
  `.trim();
}

// ==============================================================
// MAIN CLASS
// ==============================================================
export class OpenAIVisionProvider implements IVisionProvider {
  readonly name = "openai";
  private client: OpenAI;
  private model: string;

  constructor(config: OpenAIProviderConfig = {}) {
    this.client = new OpenAI({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY || "",
    });
    this.model = config.model || "gpt-4o-mini";
  }

  // ============================================================
  // 2-STEP CLUSTERING PIPELINE
  // ============================================================

  async clusterImages(
    images: ClusterImageInput[],
    _marketplace: MarketplaceType,
    maxGroups: number,
    context?: string
  ): Promise<ClusterResult> {
    // STEP 1: Visual Analysis — describe each image in parallel
    const descriptions = await this.analyzeImages(images);

    // STEP 2: Clustering — group text descriptions with the Archivist
    return this.clusterDescriptions(descriptions, images, maxGroups, context);
  }

  /**
   * STEP 1: "The Eyes" — Analyze each image individually.
   * Sends parallel requests (with concurrency limit) to get structured descriptions.
   */
  private async analyzeImages(
    images: ClusterImageInput[]
  ): Promise<{ imageId: string; description: ImageDescription }[]> {
    const tasks = images.map((img) => async () => {
      try {
        const response = (await this.client.chat.completions.create({
          model: this.model,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: { url: img.dataUrl, detail: "low" },
                },
                { type: "text", text: VISION_ANALYSIS_PROMPT },
              ],
            },
          ],
          response_format: { type: "json_object" },
          max_tokens: 200,
        })) as any;

        const text = response.choices[0].message.content || "{}";
        const parsed = extractJsonFromResponse(text);

        return {
          imageId: img.id,
          description: {
            imageId: img.id,
            main_subject: parsed.main_subject || "Unknown",
            setting: parsed.setting || "Unknown",
            vibe: parsed.vibe || "Neutral",
            shot_context: parsed.shot_context || "Unknown",
            narrative: parsed.narrative || "No description",
            usage_type: parsed.usage_type || "Commercial",
          } satisfies ImageDescription,
        };
      } catch (error) {
        console.error(`[OpenAI] Step 1 failed for image ${img.id}:`, error);
        return {
          imageId: img.id,
          description: {
            imageId: img.id,
            main_subject: img.name || "Unknown",
            setting: "Unknown",
            vibe: "Unknown",
            shot_context: "Unknown",
            narrative: "Analysis failed",
            usage_type: "Commercial",
          } satisfies ImageDescription,
        };
      }
    });

    return runWithConcurrency(tasks, CONCURRENCY_LIMIT);
  }

  /**
   * STEP 2: "The Archivist" — Cluster text descriptions into Photoshoot Sets.
   * Single API call with low temperature for consistent grouping.
   */
  private async clusterDescriptions(
    descriptions: { imageId: string; description: ImageDescription }[],
    originalImages: ClusterImageInput[],
    maxGroups: number,
    context?: string
  ): Promise<ClusterResult> {
    const prompt = buildArchivistPrompt(descriptions, maxGroups, context);

    try {
      const response = (await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 1500,
      })) as any;

      const text = response.choices[0].message.content || "{}";
      return this.parseClusterResponse(text, originalImages);
    } catch (error) {
      console.error("[OpenAI] Step 2 clustering failed:", error);
      return {
        groups: [
          {
            groupId: "group-1",
            imageIds: originalImages.map((img) => img.id),
            title: "All Images",
            suggestedLabel: "All Images",
            semanticTags: ["All Images"],
            confidence: 0.5,
          },
        ],
      };
    }
  }

  // ============================================================
  // RESPONSE PARSING
  // ============================================================

  private parseClusterResponse(
    responseText: string,
    originalImages: ClusterImageInput[]
  ): ClusterResult {
    try {
      const parsed = extractJsonFromResponse(responseText) as {
        groups?: Array<{
          groupId?: string;
          imageIds?: string[];
          image_ids?: string[];
          title?: string;
          name?: string;
          category?: string;
          suggestedLabel?: string;
          semanticTags?: string[] | string;
          keywords?: string[] | string;
          tags?: string[] | string;
          label?: string;
          confidence?: number;
        }>;
      };

      if (!parsed.groups || !Array.isArray(parsed.groups)) {
        console.error("[OpenAI] No groups array in response:", parsed);
        return {
          groups: [
            {
              groupId: "group-1",
              imageIds: originalImages.map((img) => img.id),
              title: "All Images",
              suggestedLabel: "All Images",
              semanticTags: ["All Images"],
              confidence: 0.5,
            },
          ],
        };
      }

      const toArray = (val: string[] | string | undefined): string[] | undefined => {
        if (Array.isArray(val)) return val;
        if (typeof val === "string" && val.trim()) {
          return val
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        }
        return undefined;
      };

      const groups: ImageClusterGroup[] = parsed.groups.map((group, index) => {
        const title =
          group.title || group.name || group.category || group.label || `Group ${index + 1}`;

        const semanticTags =
          toArray(group.semanticTags) ||
          toArray(group.keywords) ||
          toArray(group.tags) ||
          (title ? [title] : undefined);

        return {
          groupId: group.groupId || `group-${index + 1}`,
          imageIds: group.imageIds || group.image_ids || [],
          title,
          suggestedLabel: title,
          semanticTags,
          confidence: typeof group.confidence === "number" ? group.confidence : 0.8,
        };
      });

      // Handle unassigned images
      const assignedIds = new Set(groups.flatMap((g) => g.imageIds));
      const unassignedIds = originalImages
        .map((img) => img.id)
        .filter((id) => !assignedIds.has(id));

      if (unassignedIds.length > 0) {
        groups.push({
          groupId: "group-unclustered",
          imageIds: unassignedIds,
          title: "Uncategorized",
          suggestedLabel: "Uncategorized",
          semanticTags: ["Uncategorized"],
          confidence: 0.5,
        });
      }

      return { groups };
    } catch (error) {
      console.error("[OpenAI] Failed to parse cluster response:", responseText, error);
      return {
        groups: [
          {
            groupId: "group-1",
            imageIds: originalImages.map((img) => img.id),
            title: "All Images",
            suggestedLabel: "All Images",
            semanticTags: ["All Images"],
            confidence: 0.5,
          },
        ],
      };
    }
  }

  // ============================================================
  // TAG GENERATION (unchanged)
  // ============================================================

  async generateTags(
    images: TagImageInput[],
    marketplace: MarketplaceType,
    strategy: StrategyType = "standard",
    maxTags: number = 25,
    platform?: PlatformType
  ): Promise<ImageTagResult[]> {
    if (images.length === 0) {
      return [];
    }

    const sampleImages = images.slice(0, 4);
    const effectiveMaxTags = maxTags || (platform ? getPlatformConfig(platform).maxTags : 25);
    const platformInstruction =
      platform && platform !== "GENERIC"
        ? `\n    PLATFORM OPTIMIZATION (${platform}): ${getPlatformConfig(platform).systemInstruction}\n`
        : "";

    const batchGuard =
      sampleImages.length > 1
        ? `BATCH ANALYSIS — You are viewing ${sampleImages.length} images from the SAME group.\n1. Identify the COMMON THEMES shared across ALL images.\n2. Tags, title, and description must describe what the images have IN COMMON.\n3. AVOID tags that only apply to a single image.\n\n`
        : "";

    const prompt =
      batchGuard + platformInstruction + buildTagPrompt(marketplace, strategy, effectiveMaxTags);

    const imageContentParts = sampleImages.map((img) => ({
      type: "image_url" as const,
      image_url: {
        url: img.dataUrl,
        detail: "high" as const,
      },
    }));

    const response = (await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "user",
          content: [...imageContentParts, { type: "text" as const, text: prompt }],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500,
    })) as any;

    const text = response.choices[0].message.content || "{}";
    const result = extractJsonFromResponse(text);

    const tagResult = {
      title: result.title || "",
      description: result.description || "",
      tags: result.tags || [],
      confidence: result.confidence || 0.0,
    };

    return images.map((img) => ({ ...tagResult, imageId: img.id }));
  }
}
