import piexif, { type ExifDict } from "piexifjs";
import type { ImageMetadata, MetadataWriteResult, MetadataOptions } from "./types";

// EXIF Tag Constants
const EXIF_TAGS = {
  ImageDescription: 0x010e,
  XPTitle: 0x9c9b,
  XPSubject: 0x9c9f,
  XPKeywords: 0x9c9e,
  UserComment: 0x9286,
} as const;

/**
 * Convert string to Windows XP tag format (UTF-16LE with null terminator)
 */
function encodeXpTag(text: string): number[] {
  const encoded: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    encoded.push(charCode & 0xff);
    encoded.push((charCode >> 8) & 0xff);
  }
  encoded.push(0, 0);
  return encoded;
}

/**
 * Format keywords for XPKeywords tag (semicolon-separated)
 */
function formatKeywordsForXp(keywords: string[]): string {
  return keywords.join(";");
}

/**
 * Create EXIF data structure from metadata
 */
function buildExifDict(metadata: ImageMetadata): ExifDict {
  const zeroth: Record<number, unknown> = {};
  const exifDict: Record<number, unknown> = {};

  if (metadata.title) {
    zeroth[EXIF_TAGS.ImageDescription] = metadata.title;
    zeroth[EXIF_TAGS.XPTitle] = encodeXpTag(metadata.title);
  }

  if (metadata.keywords && metadata.keywords.length > 0) {
    const keywordsStr = formatKeywordsForXp(metadata.keywords);
    zeroth[EXIF_TAGS.XPKeywords] = encodeXpTag(keywordsStr);
  }

  if (metadata.description) {
    zeroth[EXIF_TAGS.XPSubject] = encodeXpTag(metadata.description);
    exifDict[EXIF_TAGS.UserComment] = `ASCII\0\0\0${metadata.description}`;
  }

  return {
    "0th": zeroth,
    Exif: exifDict,
    GPS: {},
    Interop: {},
    "1st": {},
    thumbnail: null,
  };
}

/**
 * Embed metadata into a JPEG image
 * Returns a new ArrayBuffer with embedded metadata
 */
export async function embedMetadata(
  imageFile: File,
  metadata: ImageMetadata,
  options: MetadataOptions
): Promise<MetadataWriteResult> {
  if (!options.enabled || !options.burnExif) {
    const buffer = await imageFile.arrayBuffer();
    return { success: true, data: buffer };
  }

  const isJpeg =
    imageFile.type === "image/jpeg" ||
    imageFile.type === "image/jpg" ||
    imageFile.name.toLowerCase().endsWith(".jpg") ||
    imageFile.name.toLowerCase().endsWith(".jpeg");

  if (!isJpeg) {
    const buffer = await imageFile.arrayBuffer();
    return { success: true, data: buffer };
  }

  try {
    const dataUrl = await fileToDataUrl(imageFile);

    let exifObj: ExifDict;
    try {
      exifObj = piexif.load(dataUrl);
    } catch {
      exifObj = {
        "0th": {},
        Exif: {},
        GPS: {},
        Interop: {},
        "1st": {},
        thumbnail: null,
      };
    }

    const metadataExif = buildExifDict(metadata);
    mergeExif(exifObj, metadataExif);

    const exifBytes = piexif.dump(exifObj);
    const newDataUrl = piexif.insert(exifBytes, dataUrl);

    const buffer = dataUrlToArrayBuffer(newDataUrl);

    return { success: true, data: buffer };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to embed metadata";
    console.error("Metadata embedding error:", message);
    const buffer = await imageFile.arrayBuffer();
    return { success: true, data: buffer };
  }
}

/**
 * Merge new EXIF data into existing
 */
function mergeExif(existing: ExifDict, newData: ExifDict): void {
  if (newData["0th"]) {
    existing["0th"] = { ...existing["0th"], ...newData["0th"] };
  }
  if (newData["Exif"]) {
    existing["Exif"] = { ...existing["Exif"], ...newData["Exif"] };
  }
}

/**
 * Convert File to data URL
 */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Convert data URL to ArrayBuffer
 */
function dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer {
  const base64 = dataUrl.split(",")[1];
  if (!base64) throw new Error("Invalid data URL");

  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Build metadata from image/group data
 */
export function buildImageMetadata(
  title: string | undefined,
  tags: string[] | undefined,
  description: string | undefined
): ImageMetadata {
  return {
    title: title || "",
    keywords: tags || [],
    description: description,
  };
}
