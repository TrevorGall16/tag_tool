import { slugify } from "@/lib/utils";
import type { NamingContext, ExportNamingOptions } from "./types";

/**
 * Build naming context for a specific image
 */
export function buildNamingContext(
  options: ExportNamingOptions,
  sequenceNumber: number,
  originalFilename: string
): NamingContext {
  const date = new Date().toISOString().slice(0, 10);
  const project = slugify(options.projectName) || "export";
  const seq = String(sequenceNumber).padStart(options.sequencePadding, "0");
  const original = extractBasename(originalFilename);

  return { date, project, seq, original };
}

/**
 * Generate filename from pattern and context
 */
export function generateExportFilename(
  pattern: string,
  context: NamingContext,
  extension: string
): string {
  let result = pattern
    .replace(/\{date\}/g, context.date)
    .replace(/\{project\}/g, context.project)
    .replace(/\{seq\}/g, context.seq)
    .replace(/\{original\}/g, context.original);

  result = sanitizeFilenameSegment(result);

  return `${result}.${extension}`;
}

/**
 * Extract base filename without extension
 */
function extractBasename(filename: string): string {
  const parts = filename.split(".");
  if (parts.length > 1) {
    parts.pop();
  }
  return slugify(parts.join(".")) || "image";
}

/**
 * Sanitize filename segment (remove invalid characters)
 */
function sanitizeFilenameSegment(segment: string): string {
  return segment
    .replace(/[<>:"/\\|?*]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .substring(0, 200);
}

/**
 * Validate a naming pattern
 */
export function validatePattern(pattern: string): { valid: boolean; error?: string } {
  if (!pattern.trim()) {
    return { valid: false, error: "Pattern cannot be empty" };
  }

  if (!pattern.includes("{seq}")) {
    return { valid: false, error: "Pattern must include {seq} for unique filenames" };
  }

  const testPattern = pattern.replace(/\{[^}]+\}/g, "");
  if (/[<>:"/\\|?*]/.test(testPattern)) {
    return { valid: false, error: "Pattern contains invalid filename characters" };
  }

  return { valid: true };
}

/**
 * Preview what a filename would look like
 */
export function previewFilename(
  options: ExportNamingOptions,
  sampleSequence: number = 1,
  sampleOriginal: string = "IMG_1234.jpg"
): string {
  const context = buildNamingContext(options, sampleSequence, sampleOriginal);
  return generateExportFilename(options.pattern, context, "jpg");
}
