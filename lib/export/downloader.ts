import JSZip from "jszip";
import { slugify, sanitizeForCsv } from "@/lib/utils";
import { generateCsv } from "./csv-generator";
import type {
  ExportOptions,
  ExportProgress,
  ExportProgressCallback,
  ExportResult,
  CsvRow,
  LocalGroup,
} from "./types";
import type { LocalImageItem } from "@/store/useBatchStore";

export class ExportEngine {
  private options: Required<ExportOptions>;
  private progressCallback?: ExportProgressCallback;

  constructor(options: ExportOptions) {
    this.options = {
      includeUnverified: true,
      ...options,
    };
  }

  /**
   * Set progress callback for UI updates
   */
  onProgress(callback: ExportProgressCallback): this {
    this.progressCallback = callback;
    return this;
  }

  /**
   * Main export method - creates a zip file with images and metadata.csv
   */
  async exportGroups(groups: LocalGroup[]): Promise<ExportResult> {
    const zip = new JSZip();
    const csvRows: CsvRow[] = [];
    let processedImages = 0;
    let skippedImages = 0;

    const filteredGroups = this.filterGroups(groups);
    const totalImages = this.countTotalImages(filteredGroups);

    if (totalImages === 0) {
      return {
        success: false,
        error: "No images to export. Please add images and generate tags first.",
        stats: { totalGroups: 0, totalImages: 0, skippedImages: 0 },
      };
    }

    this.reportProgress({
      current: 0,
      total: totalImages,
      phase: "preparing",
    });

    try {
      for (const group of filteredGroups) {
        const baseSlug = this.getGroupSlug(group);

        for (let i = 0; i < group.images.length; i++) {
          const image = group.images[i];
          if (!image) {
            skippedImages++;
            continue;
          }

          if (!image.file) {
            skippedImages++;
            continue;
          }

          const extension = this.getFileExtension(image.originalFilename);
          const filename = this.generateFilename(baseSlug, i, group.images.length, extension);

          this.reportProgress({
            current: processedImages,
            total: totalImages,
            phase: "processing",
            currentFile: filename,
          });

          const arrayBuffer = await image.file.arrayBuffer();
          zip.file(filename, arrayBuffer);

          csvRows.push(this.createCsvRow(filename, group, image));

          processedImages++;
        }
      }

      this.reportProgress({
        current: processedImages,
        total: totalImages,
        phase: "compressing",
      });

      const csvContent = generateCsv(csvRows, this.options.marketplace);
      zip.file("metadata.csv", csvContent);

      const blob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });

      const timestamp = new Date().toISOString().slice(0, 10);
      const zipFilename = `tagarchitect-export-${timestamp}.zip`;

      this.reportProgress({
        current: totalImages,
        total: totalImages,
        phase: "complete",
      });

      return {
        success: true,
        blob,
        filename: zipFilename,
        stats: {
          totalGroups: filteredGroups.length,
          totalImages: processedImages,
          skippedImages,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Export failed";
      return {
        success: false,
        error: message,
        stats: {
          totalGroups: filteredGroups.length,
          totalImages: processedImages,
          skippedImages,
        },
      };
    }
  }

  /**
   * Trigger browser download of the export
   */
  static downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private filterGroups(groups: LocalGroup[]): LocalGroup[] {
    return groups.filter((group) => {
      if (group.id === "unclustered") return false;
      if (!this.options.includeUnverified && !group.isVerified) {
        return group.sharedTitle || group.sharedTags.length > 0;
      }
      return group.images.length > 0;
    });
  }

  private countTotalImages(groups: LocalGroup[]): number {
    return groups.reduce((sum, g) => sum + g.images.length, 0);
  }

  private getGroupSlug(group: LocalGroup): string {
    if (group.sharedTitle) {
      return slugify(group.sharedTitle);
    }
    return `group-${group.groupNumber}`;
  }

  private getFileExtension(filename: string): string {
    const parts = filename.split(".");
    return parts.length > 1 ? parts.pop()!.toLowerCase() : "jpg";
  }

  private generateFilename(
    baseSlug: string,
    index: number,
    total: number,
    extension: string
  ): string {
    if (total === 1) {
      return `${baseSlug}.${extension}`;
    }
    return `${baseSlug}-${index + 1}.${extension}`;
  }

  private createCsvRow(filename: string, group: LocalGroup, image: LocalImageItem): CsvRow {
    const title = image.userTitle || group.sharedTitle || image.aiTitle || "";
    const description = group.sharedDescription || "";
    const tags = image.userTags || group.sharedTags || image.aiTags || [];

    return {
      filename,
      title: sanitizeForCsv(title),
      description: sanitizeForCsv(description),
      tags: tags.map(sanitizeForCsv).join(", "),
    };
  }

  private reportProgress(progress: ExportProgress): void {
    this.progressCallback?.(progress);
  }
}
