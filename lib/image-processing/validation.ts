/**
 * Pre-flight file validation.
 * Runs AFTER MIME/size checks, BEFORE the processing queue.
 * Catches HEIC/HEIF files with misreported MIME types and images with corrupted headers.
 */

/** Read the first N bytes of a File without loading it fully into memory. */
async function readHeader(file: File, byteCount: number): Promise<Uint8Array> {
  const buffer = await file.slice(0, byteCount).arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * Returns true if the file has HEIC/HEIF magic bytes, regardless of its reported MIME type.
 * HEIC container: 'ftyp' box at offset 4, brand identifier at offset 8.
 */
async function isHeicFile(file: File): Promise<boolean> {
  try {
    const h = await readHeader(file, 12);
    const box = String.fromCharCode(h[4]!, h[5]!, h[6]!, h[7]!);
    if (box !== "ftyp") return false;
    const brand = String.fromCharCode(h[8]!, h[9]!, h[10]!, h[11]!).toLowerCase();
    return ["heic", "heix", "mif1", "msf1", "hevc", "hevx"].some((b) => brand.startsWith(b));
  } catch {
    return false;
  }
}

/**
 * Returns true if the file header matches a known supported image format.
 * Files that claim to be JPEG/PNG/WebP but fail this check are considered corrupted.
 */
async function hasValidImageHeader(file: File): Promise<boolean> {
  try {
    const h = await readHeader(file, 12);
    // JPEG: FF D8 FF
    if (h[0] === 0xff && h[1] === 0xd8 && h[2] === 0xff) return true;
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (h[0] === 0x89 && h[1] === 0x50 && h[2] === 0x4e && h[3] === 0x47) return true;
    // WebP: 52 49 46 46 xx xx xx xx 57 45 42 50
    if (
      h[0] === 0x52 &&
      h[1] === 0x49 &&
      h[2] === 0x46 &&
      h[3] === 0x46 &&
      h[8] === 0x57 &&
      h[9] === 0x45 &&
      h[10] === 0x42 &&
      h[11] === 0x50
    )
      return true;
    return false;
  } catch {
    return false; // Cannot read header → treat as corrupted
  }
}

export type SkipReason = "unsupported_format" | "corrupted";

export interface PreflightResult {
  valid: File[];
  skipped: Array<{ file: File; reason: SkipReason }>;
}

/**
 * Pre-flight check for files that have already passed MIME/size validation.
 *
 * Detects:
 * - HEIC/HEIF files uploaded with a spoofed/misreported MIME type (e.g., renamed to .jpg)
 * - Corrupted image files whose bytes don't match their claimed format
 */
export async function preflightCheck(files: File[]): Promise<PreflightResult> {
  const valid: File[] = [];
  const skipped: PreflightResult["skipped"] = [];

  for (const file of files) {
    if (await isHeicFile(file)) {
      skipped.push({ file, reason: "unsupported_format" });
      continue;
    }
    if (!(await hasValidImageHeader(file))) {
      skipped.push({ file, reason: "corrupted" });
      continue;
    }
    valid.push(file);
  }

  return { valid, skipped };
}
