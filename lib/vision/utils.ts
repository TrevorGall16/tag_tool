import type { ImageMediaType } from "./types";

export function getMediaType(dataUrl: string): ImageMediaType {
  if (dataUrl.includes("image/png")) return "image/png";
  if (dataUrl.includes("image/webp")) return "image/webp";
  if (dataUrl.includes("image/gif")) return "image/gif";
  return "image/jpeg";
}

export function extractBase64Data(dataUrl: string): string {
  const base64Match = dataUrl.match(/base64,(.+)/);
  return base64Match ? base64Match[1] : dataUrl;
}

export function extractJsonFromResponse(responseText: string): unknown {
  const jsonMatch =
    responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/\{[\s\S]*\}/);

  const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : responseText;
  return JSON.parse(jsonStr);
}
