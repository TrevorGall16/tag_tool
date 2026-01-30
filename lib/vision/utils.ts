import type { ImageMediaType } from "./types";

export function getMediaType(dataUrl: string): ImageMediaType {
  if (dataUrl.includes("image/png")) return "image/png";
  if (dataUrl.includes("image/webp")) return "image/webp";
  if (dataUrl.includes("image/gif")) return "image/gif";
  return "image/jpeg";
}

export function extractBase64Data(dataUrl: string): string {
  const base64Match = dataUrl.match(/base64,(.+)/);
  return base64Match?.[1] ?? dataUrl;
}

export function extractJsonFromResponse(responseText: string): unknown {
  try {
    // 1. Remove markdown code blocks (```json ... ``` or ``` ... ```)
    let clean = responseText
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    // 2. Find the first '{' and last '}' to handle intro/outro text
    const first = clean.indexOf("{");
    const last = clean.lastIndexOf("}");

    if (first === -1 || last === -1) {
      console.error("[extractJsonFromResponse] No JSON object found. Raw text:", responseText);
      return { groups: [] };
    }

    const jsonStr = clean.substring(first, last + 1);
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("[extractJsonFromResponse] JSON Parse Failed. Raw text:", responseText, e);
    return { groups: [] };
  }
}
