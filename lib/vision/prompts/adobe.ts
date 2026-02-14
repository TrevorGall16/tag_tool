import type { StrategyType } from "../types";
import { getStrategyPersona } from "./shared";

export const ADOBE_DEFAULTS = {
  maxTags: 49,
  systemInstruction:
    "Strictly output single keywords only. Max 49. No phrases or multi-word tags. Order by visual importance. Example: 'concert, crowd, music, stage, lights', not 'live concert performance'.",
};

export function buildAdobeTagPrompt(strategy: StrategyType, tagCount: number): string {
  const persona = getStrategyPersona(strategy);
  const tagLimit = Math.max(5, Math.min(50, tagCount));

  return `${persona}Generate Adobe Stock metadata for this image.

RULES:
- Title: 200 chars max, descriptive, literal.
- Tags: Generate exactly ${tagLimit} keywords. Order by importance. Never exceed ${tagLimit} tags.
- Description: Literal description of the scene and subject.

STRATEGY:
- Start with literal subjects (what is seen).
- Add conceptual tags (emotions, themes).
- Stop when you reach ${tagLimit} tags.

SAFETY FOR UNKNOWN ITEMS:
- If the subject is ambiguous, focus on: Lighting, Composition, Texture, Colors, and Vibe/Mood.

RESPOND ONLY with valid JSON:
{
  "title": "Portrait of smiling woman working on laptop in modern office",
  "description": "A professional woman sitting at a desk typing on a laptop...",
  "tags": ["business", "woman", "laptop", "office", "work", "professional", "corporate", "technology", "computer", "desk", "workspace", "career", "adult", "employee", "confident", "success", "modern", "indoor", "caucasian", "30s", "sitting", "typing", "focused", "concentration", "productivity"],
  "confidence": 0.95
}`;
}

export function getAdobeDescription(tagCount: number): string {
  return `Optimized for Adobe Stock. ${tagCount} single keywords. Visual priority.`;
}
