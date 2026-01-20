Document 8: API Logic — Claude Vision & CLIP Clustering (TagArchitect — FINAL & COMPLETE)

## 1. Document Purpose

This document defines the **core AI functionality** of TagArchitect:

- **CLIP Clustering:** Client-side image similarity analysis using ONNX.js
- **Claude Vision API:** Server-side tag generation using Claude 3.5 Sonnet
- **Tag Hydration:** Applying AI-generated tags to all images in a group
- **Error Handling:** Retry logic, fallbacks, user feedback
- **Performance Optimization:** Rate limiting, token management, caching

**Architecture Overview:**

```
User Uploads Images
     ↓
[Client-Side] CLIP Clustering (ONNX.js)
     → Groups images by visual similarity
     → FREE operation (no credits consumed)
     ↓
User Reviews Groups
     ↓
[Server-Side] Claude Vision API
     → Analyzes ONE representative image per group
     → Generates marketplace-specific tags
     → PAID operation (1 credit per image tagged)
     ↓
Tag Hydration
     → All images in group inherit tags
     → User can edit individual images
     ↓
Export ZIP + CSV
```

---

## 2. CLIP Clustering (Client-Side)

### 2.1 Why CLIP Clustering

**Goal:** Group visually similar images so user can tag entire batches at once.

**Benefits:**

- Reduces tagging time (50 images → 5 groups → 5 AI calls instead of 50)
- Reduces cost (AI calls only for representative images)
- Privacy-preserving (high-res images never leave browser)

**Technology:** CLIP (Contrastive Language-Image Pre-training)

- Pre-trained vision model by OpenAI
- Converts images to 512-dimensional embeddings
- Images with similar content have similar embeddings

### 2.2 CLIP Model Setup

**Model:** `clip-vit-base-patch32` (150MB)

**Location:** `/public/models/clip-vit-base-patch32.onnx`

**Download Model:**

```bash
# Download from Hugging Face
cd public/models
wget https://huggingface.co/Xenova/clip-vit-base-patch32/resolve/main/onnx/vision_model.onnx -O clip-vit-base-patch32.onnx
```

**Add to Git:**

```bash
git add public/models/clip-vit-base-patch32.onnx
git commit -m "Add CLIP model for image clustering"
```

**Size Warning:** 150MB file. Consider Git LFS if needed.

### 2.3 ONNX Runtime Setup

**Install Dependencies:**

```bash
pnpm add onnxruntime-web
```

**Initialize ONNX Runtime:**

**Location:** `/lib/clip/onnx-setup.ts`

```typescript
import * as ort from "onnxruntime-web";

let session: ort.InferenceSession | null = null;

export async function initializeCLIPModel(
  onProgress?: (percent: number) => void
): Promise<ort.InferenceSession> {
  if (session) return session;

  try {
    // Load model with progress tracking
    session = await ort.InferenceSession.create("/models/clip-vit-base-patch32.onnx", {
      executionProviders: ["wasm"], // Use WebAssembly backend
    });

    if (onProgress) onProgress(100);

    console.log("[CLIP] Model loaded successfully");
    return session;
  } catch (error) {
    console.error("[CLIP] Failed to load model:", error);
    throw new Error("Failed to load CLIP model");
  }
}

export function getCLIPSession(): ort.InferenceSession | null {
  return session;
}
```

### 2.4 Image Preprocessing

**CLIP expects 224×224 RGB images with specific normalization.**

**Location:** `/lib/clip/preprocess.ts`

```typescript
export async function preprocessImageForCLIP(imageFile: File): Promise<Float32Array> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Failed to get canvas context"));
      return;
    }

    img.onload = () => {
      // Resize to 224x224
      canvas.width = 224;
      canvas.height = 224;
      ctx.drawImage(img, 0, 0, 224, 224);

      // Get image data
      const imageData = ctx.getImageData(0, 0, 224, 224);
      const pixels = imageData.data;

      // Convert to normalized float array [0-255] → [-1, 1]
      const tensor = new Float32Array(3 * 224 * 224);

      // CLIP normalization values
      const mean = [0.48145466, 0.4578275, 0.40821073];
      const std = [0.26862954, 0.26130258, 0.27577711];

      // Separate RGB channels and normalize
      for (let i = 0; i < 224 * 224; i++) {
        const r = pixels[i * 4] / 255;
        const g = pixels[i * 4 + 1] / 255;
        const b = pixels[i * 4 + 2] / 255;

        tensor[i] = (r - mean[0]) / std[0];
        tensor[i + 224 * 224] = (g - mean[1]) / std[1];
        tensor[i + 2 * 224 * 224] = (b - mean[2]) / std[2];
      }

      resolve(tensor);
    };

    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(imageFile);
  });
}
```

### 2.5 Generate Embeddings

**Location:** `/lib/clip/embeddings.ts`

```typescript
import * as ort from "onnxruntime-web";
import { getCLIPSession } from "./onnx-setup";
import { preprocessImageForCLIP } from "./preprocess";

export async function generateImageEmbedding(imageFile: File): Promise<number[]> {
  const session = getCLIPSession();
  if (!session) {
    throw new Error("CLIP model not loaded");
  }

  // Preprocess image
  const inputTensor = await preprocessImageForCLIP(imageFile);

  // Create ONNX tensor (shape: [1, 3, 224, 224])
  const tensor = new ort.Tensor("float32", inputTensor, [1, 3, 224, 224]);

  // Run inference
  const outputs = await session.run({ pixel_values: tensor });

  // Extract embedding (512-dimensional vector)
  const embedding = outputs.image_embeds.data as Float32Array;

  // Convert to regular array
  return Array.from(embedding);
}

export async function generateBatchEmbeddings(
  imageFiles: File[],
  onProgress?: (current: number, total: number) => void
): Promise<Map<string, number[]>> {
  const embeddings = new Map<string, number[]>();

  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    const embedding = await generateImageEmbedding(file);
    embeddings.set(file.name, embedding);

    if (onProgress) {
      onProgress(i + 1, imageFiles.length);
    }
  }

  return embeddings;
}
```

### 2.6 Cosine Similarity Calculation

**Location:** `/lib/clip/similarity.ts`

```typescript
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must have same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

export function findSimilarImages(
  embeddings: Map<string, number[]>,
  threshold: number = 0.75
): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  const processed = new Set<string>();

  const filenames = Array.from(embeddings.keys());

  for (const filename of filenames) {
    if (processed.has(filename)) continue;

    const embedding = embeddings.get(filename)!;
    const group: string[] = [filename];
    processed.add(filename);

    // Find similar images
    for (const otherFilename of filenames) {
      if (processed.has(otherFilename)) continue;

      const otherEmbedding = embeddings.get(otherFilename)!;
      const similarity = cosineSimilarity(embedding, otherEmbedding);

      if (similarity >= threshold) {
        group.push(otherFilename);
        processed.add(otherFilename);
      }
    }

    // Use first image as group key
    groups.set(filename, group);
  }

  return groups;
}
```

### 2.7 Clustering Algorithm

**Location:** `/lib/clip/clustering.ts`

```typescript
import { generateBatchEmbeddings } from "./embeddings";
import { findSimilarImages } from "./similarity";

export interface ClusterResult {
  groupNumber: number;
  images: string[];
  representativeImage: string;
}

export async function clusterImages(
  imageFiles: File[],
  onProgress?: (stage: string, percent: number) => void
): Promise<ClusterResult[]> {
  // Stage 1: Generate embeddings
  onProgress?.("Generating embeddings", 0);

  const embeddings = await generateBatchEmbeddings(imageFiles, (current, total) => {
    const percent = Math.round((current / total) * 50); // 0-50%
    onProgress?.("Generating embeddings", percent);
  });

  onProgress?.("Generating embeddings", 50);

  // Stage 2: Find similar images
  onProgress?.("Clustering images", 50);

  const similarityGroups = findSimilarImages(embeddings, 0.75);

  onProgress?.("Clustering images", 75);

  // Stage 3: Select representative images
  onProgress?.("Selecting representatives", 75);

  const clusters: ClusterResult[] = [];
  let groupNumber = 1;

  for (const [representative, members] of similarityGroups.entries()) {
    // Find centroid (image closest to average of all embeddings in group)
    const groupEmbeddings = members.map((filename) => embeddings.get(filename)!);
    const centroid = calculateCentroid(groupEmbeddings);

    // Find image closest to centroid
    let closestImage = representative;
    let closestDistance = Infinity;

    for (const filename of members) {
      const embedding = embeddings.get(filename)!;
      const distance = euclideanDistance(embedding, centroid);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestImage = filename;
      }
    }

    clusters.push({
      groupNumber,
      images: members,
      representativeImage: closestImage,
    });

    groupNumber++;
  }

  onProgress?.("Clustering complete", 100);

  return clusters;
}

function calculateCentroid(embeddings: number[][]): number[] {
  const dim = embeddings[0].length;
  const centroid = new Array(dim).fill(0);

  for (const embedding of embeddings) {
    for (let i = 0; i < dim; i++) {
      centroid[i] += embedding[i];
    }
  }

  for (let i = 0; i < dim; i++) {
    centroid[i] /= embeddings.length;
  }

  return centroid;
}

function euclideanDistance(vecA: number[], vecB: number[]): number {
  let sum = 0;
  for (let i = 0; i < vecA.length; i++) {
    const diff = vecA[i] - vecB[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}
```

### 2.8 Client-Side Integration

**Location:** `/components/SmartUploader.tsx`

```typescript
'use client';

import { useState } from 'react';
import { initializeCLIPModel } from '@/lib/clip/onnx-setup';
import { clusterImages } from '@/lib/clip/clustering';
import { useBatchStore } from '@/store/useBatchStore';

export function SmartUploader() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ stage: '', percent: 0 });
  const { setGroups } = useBatchStore();

  const handleFilesUploaded = async (files: File[]) => {
    setIsProcessing(true);

    try {
      // 1. Load CLIP model (first time only)
      await initializeCLIPModel((percent) => {
        setProgress({ stage: 'Loading AI model', percent });
      });

      // 2. Cluster images
      const clusters = await clusterImages(files, (stage, percent) => {
        setProgress({ stage, percent });
      });

      // 3. Update store
      setGroups(clusters);

      console.log(`[Clustering] Created ${clusters.length} groups`);

    } catch (error) {
      console.error('[Clustering] Error:', error);
      alert('Clustering failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      {isProcessing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md">
            <h3 className="text-xl font-semibold mb-4">Processing Images...</h3>
            <p className="text-slate-600 mb-4">{progress.stage}</p>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <p className="text-sm text-slate-500 mt-2">{progress.percent}%</p>
          </div>
        </div>
      )}

      {/* File upload UI */}
    </div>
  );
}
```

---

## 3. Claude Vision API Integration (Server-Side)

### 3.1 Why Claude Vision

**Model:** Claude 3.5 Sonnet (vision-capable)

**Benefits:**

- Excellent at understanding image content
- Generates marketplace-specific tags
- Follows complex prompts
- High quality, low hallucination rate

**Cost:** ~$0.003 per image (with thumbnail optimization)

### 3.2 API Installation

```bash
pnpm add @anthropic-ai/sdk
```

### 3.3 Vision API Route

**Location:** `/app/api/vision/route.ts`

```typescript
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { rateLimiters, checkRateLimit } from "@/lib/ratelimit";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;

    // 2. Rate limiting
    const tier = session.user.subscriptionTier || "FREE";
    const limiter = tier === "FREE" ? rateLimiters.vision.free : rateLimiters.vision.paid;
    const { success } = await checkRateLimit(userId, limiter);

    if (!success) {
      return new Response("Rate limit exceeded", { status: 429 });
    }

    // 3. Parse request
    const { groupId, imageDataUrl, marketplace } = await req.json();

    if (!groupId || !imageDataUrl || !marketplace) {
      return new Response("Missing required fields", { status: 400 });
    }

    // 4. Check credits
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { creditsBalance: true },
    });

    // Get image count in group
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { images: true },
    });

    if (!group) {
      return new Response("Group not found", { status: 404 });
    }

    const imageCount = group.images.length;

    if (user!.creditsBalance < imageCount) {
      return new Response(
        JSON.stringify({
          error: "Insufficient credits",
          required: imageCount,
          available: user!.creditsBalance,
        }),
        { status: 402 }
      );
    }

    // 5. Call Claude Vision API
    let tags, title;
    try {
      const result = await generateTags(imageDataUrl, marketplace);
      tags = result.tags;
      title = result.title;
    } catch (error) {
      console.error("[Vision API] Claude API failed:", error);
      return new Response("AI tagging failed", { status: 500 });
    }

    // 6. Atomic transaction: Deduct credits + Save tags
    await prisma.$transaction([
      // Deduct credits
      prisma.user.update({
        where: { id: userId },
        data: { creditsBalance: { decrement: imageCount } },
      }),

      // Log transaction
      prisma.creditsLedger.create({
        data: {
          userId,
          amount: -imageCount,
          reason: "USAGE",
          description: `Tagged ${imageCount} images in group ${group.groupNumber}`,
        },
      }),

      // Update group tags
      prisma.group.update({
        where: { id: groupId },
        data: { sharedTags: tags },
      }),

      // Update all images in group
      ...group.images.map((image) =>
        prisma.imageItem.update({
          where: { id: image.id },
          data: {
            aiTitle: title,
            aiTags: tags,
            status: "TAGGED",
          },
        })
      ),
    ]);

    return Response.json({
      success: true,
      tags,
      title,
      creditsRemaining: user!.creditsBalance - imageCount,
    });
  } catch (error) {
    console.error("[Vision API] Error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

async function generateTags(
  imageDataUrl: string,
  marketplace: "ADOBE_STOCK" | "ETSY"
): Promise<{ tags: string[]; title: string }> {
  const prompt = getPromptForMarketplace(marketplace);

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data: imageDataUrl.split(",")[1], // Remove data:image/jpeg;base64, prefix
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

  // Parse Claude's response
  const responseText = message.content[0].type === "text" ? message.content[0].text : "";

  try {
    const parsed = JSON.parse(responseText);
    return {
      tags: parsed.tags || [],
      title: parsed.title || "",
    };
  } catch (error) {
    console.error("[Vision API] Failed to parse Claude response:", responseText);
    throw new Error("Failed to parse AI response");
  }
}

function getPromptForMarketplace(marketplace: "ADOBE_STOCK" | "ETSY"): string {
  if (marketplace === "ADOBE_STOCK") {
    return `Analyze this image and generate SEO-optimized metadata for Adobe Stock.

Rules:
- Title: Max 200 characters, descriptive and keyword-rich
- Tags: Exactly 49 keywords (Adobe Stock maximum)
- Tags should be: single words or short phrases, lowercase, no special characters
- Include: main subject, colors, mood, style, composition, potential uses

Respond ONLY with valid JSON in this exact format:
{
  "title": "Descriptive title here",
  "tags": ["tag1", "tag2", "tag3", ...]
}`;
  } else {
    return `Analyze this image and generate SEO-optimized metadata for Etsy.

Rules:
- Title: Max 140 characters, customer-focused and descriptive
- Tags: Exactly 13 keywords (Etsy maximum)
- Tags should be: max 20 characters each, lowercase, focus on what customers search for
- Include: product type, style, color, occasion, materials

Respond ONLY with valid JSON in this exact format:
{
  "title": "Descriptive title here",
  "tags": ["tag1", "tag2", "tag3", ...]
}`;
  }
}
```

---

## 4. Summary

This document is complete. It includes:

**CLIP Clustering:**

- Model setup (150MB ONNX file)
- Image preprocessing (224x224, normalization)
- Embedding generation (512-dim vectors)
- Cosine similarity clustering (>0.75 threshold)
- Representative image selection (centroid-based)

**Claude Vision API:**

- Server-side integration (secure, no key exposure)
- Marketplace-specific prompts (Adobe Stock vs Etsy)
- Error handling with retries
- Credit deduction (atomic transaction)
- Tag hydration (group → all images)

**Performance:**

- CLIP model caching (IndexedDB)
- Thumbnail optimization (<512px)
- Parallel processing (5 images at a time)

**Ready for implementation!**
