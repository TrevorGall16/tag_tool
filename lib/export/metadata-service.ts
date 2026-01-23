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

// IPTC Constants
const IPTC_RECORD = 2; // Application Record
const IPTC_TAGS = {
  ObjectName: 5, // Title
  Keywords: 25, // Keywords (repeatable)
  Caption: 120, // Caption/Abstract - this is IPTC:Caption
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
 * Build IPTC dataset entry
 * IPTC-IIM format: 0x1C (marker) + record + dataset + size (2 bytes) + data
 */
function buildIptcDataset(record: number, dataset: number, data: string): Uint8Array {
  const encoded = new TextEncoder().encode(data);
  const size = encoded.length;

  // For sizes > 32767, extended format would be needed, but we'll cap at standard
  if (size > 32767) {
    const truncated = data.slice(0, 32767);
    return buildIptcDataset(record, dataset, truncated);
  }

  const result = new Uint8Array(5 + size);
  result[0] = 0x1c; // IPTC marker
  result[1] = record;
  result[2] = dataset;
  result[3] = (size >> 8) & 0xff; // Size high byte
  result[4] = size & 0xff; // Size low byte
  result.set(encoded, 5);

  return result;
}

/**
 * Build complete IPTC-IIM block from metadata
 */
function buildIptcBlock(metadata: ImageMetadata): Uint8Array {
  const datasets: Uint8Array[] = [];

  // Add title (Object Name)
  if (metadata.title) {
    datasets.push(buildIptcDataset(IPTC_RECORD, IPTC_TAGS.ObjectName, metadata.title));
  }

  // Add keywords (each keyword is a separate dataset)
  if (metadata.keywords && metadata.keywords.length > 0) {
    for (const keyword of metadata.keywords) {
      datasets.push(buildIptcDataset(IPTC_RECORD, IPTC_TAGS.Keywords, keyword));
    }
  }

  // Add caption/description (IPTC:Caption)
  if (metadata.description) {
    datasets.push(buildIptcDataset(IPTC_RECORD, IPTC_TAGS.Caption, metadata.description));
  }

  // Concatenate all datasets
  const totalLength = datasets.reduce((sum, d) => sum + d.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const dataset of datasets) {
    result.set(dataset, offset);
    offset += dataset.length;
  }

  return result;
}

/**
 * Create Photoshop 3.0 APP13 segment with IPTC data
 * Format: APP13 marker + length + "Photoshop 3.0\0" + 8BIM resource
 */
function buildApp13Segment(iptcData: Uint8Array): Uint8Array {
  const photoshopHeader = new TextEncoder().encode("Photoshop 3.0");
  const resourceType = new TextEncoder().encode("8BIM");
  const resourceId = 0x0404; // IPTC-NAA record

  // 8BIM resource block: type(4) + id(2) + pascal string(1+0 padded to even) + size(4) + data
  const pascalStringLength = 0; // Empty name
  const paddedPascalString = 2; // Length byte + padding to even

  // Calculate sizes
  const resourceBlockSize =
    4 + // 8BIM
    2 + // resource ID
    paddedPascalString + // pascal string
    4 + // data size
    iptcData.length +
    (iptcData.length % 2); // padding to even

  const segmentDataSize =
    photoshopHeader.length +
    1 + // null terminator
    resourceBlockSize;

  const totalSize = 2 + segmentDataSize; // length field includes itself

  const result = new Uint8Array(2 + totalSize); // APP13 marker + content
  let offset = 0;

  // APP13 marker
  result[offset++] = 0xff;
  result[offset++] = 0xed;

  // Segment length (big-endian, includes length bytes)
  result[offset++] = (totalSize >> 8) & 0xff;
  result[offset++] = totalSize & 0xff;

  // Photoshop 3.0 header
  result.set(photoshopHeader, offset);
  offset += photoshopHeader.length;
  result[offset++] = 0; // null terminator

  // 8BIM resource
  result.set(resourceType, offset);
  offset += 4;

  // Resource ID (0x0404 = IPTC-NAA)
  result[offset++] = (resourceId >> 8) & 0xff;
  result[offset++] = resourceId & 0xff;

  // Pascal string (empty, padded to even)
  result[offset++] = 0; // length
  result[offset++] = 0; // padding

  // Data size (big-endian 4 bytes)
  result[offset++] = (iptcData.length >> 24) & 0xff;
  result[offset++] = (iptcData.length >> 16) & 0xff;
  result[offset++] = (iptcData.length >> 8) & 0xff;
  result[offset++] = iptcData.length & 0xff;

  // IPTC data
  result.set(iptcData, offset);
  offset += iptcData.length;

  // Padding to even length if needed
  if (iptcData.length % 2 !== 0) {
    result[offset++] = 0;
  }

  return result;
}

/**
 * Insert APP13 (IPTC) segment into JPEG data
 * Inserts after SOI and any APP0/APP1 segments
 */
function insertApp13IntoJpeg(jpegData: ArrayBuffer, app13Segment: Uint8Array): ArrayBuffer {
  const data = new Uint8Array(jpegData);

  // Verify JPEG SOI marker
  if (data[0] !== 0xff || data[1] !== 0xd8) {
    return jpegData; // Not a valid JPEG
  }

  // Find insertion point (after SOI and APP0/APP1 segments)
  let insertPos = 2; // After SOI

  while (insertPos < data.length - 3) {
    if (data[insertPos] !== 0xff) break;

    const marker = data[insertPos + 1];

    // Skip APP0 (JFIF) and APP1 (EXIF) segments
    if (marker === 0xe0 || marker === 0xe1) {
      const segmentLength = ((data[insertPos + 2] ?? 0) << 8) | (data[insertPos + 3] ?? 0);
      insertPos += 2 + segmentLength;
    } else if (marker === 0xed) {
      // Skip existing APP13 segment
      const segmentLength = ((data[insertPos + 2] ?? 0) << 8) | (data[insertPos + 3] ?? 0);
      insertPos += 2 + segmentLength;
    } else {
      break;
    }
  }

  // Create new array with APP13 inserted
  const result = new Uint8Array(data.length + app13Segment.length);
  result.set(data.slice(0, insertPos), 0);
  result.set(app13Segment, insertPos);
  result.set(data.slice(insertPos), insertPos + app13Segment.length);

  return result.buffer;
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
 * Supports both EXIF (Windows XP tags) and IPTC (Caption/Keywords)
 */
export async function embedMetadata(
  imageFile: File,
  metadata: ImageMetadata,
  options: MetadataOptions
): Promise<MetadataWriteResult> {
  if (!options.enabled || (!options.burnExif && !options.burnIptc)) {
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
    let resultBuffer: ArrayBuffer;
    const dataUrl = await fileToDataUrl(imageFile);

    // Step 1: Embed EXIF metadata (XPTitle, XPSubject, XPKeywords)
    if (options.burnExif) {
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
      resultBuffer = dataUrlToArrayBuffer(newDataUrl);
    } else {
      resultBuffer = await imageFile.arrayBuffer();
    }

    // Step 2: Embed IPTC metadata (Caption, Keywords)
    if (options.burnIptc) {
      const iptcBlock = buildIptcBlock(metadata);
      if (iptcBlock.length > 0) {
        const app13Segment = buildApp13Segment(iptcBlock);
        resultBuffer = insertApp13IntoJpeg(resultBuffer, app13Segment);
      }
    }

    return { success: true, data: resultBuffer };
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
