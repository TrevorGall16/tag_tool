import type { LocalGroup, MarketplaceType } from "@/store/useBatchStore";

export interface ExportOptions {
  marketplace: MarketplaceType;
  includeUnverified?: boolean;
}

export interface ExportProgress {
  current: number;
  total: number;
  phase: "preparing" | "processing" | "compressing" | "complete";
  currentFile?: string;
}

export type ExportProgressCallback = (progress: ExportProgress) => void;

export interface ExportResult {
  success: boolean;
  blob?: Blob;
  filename?: string;
  error?: string;
  stats: {
    totalGroups: number;
    totalImages: number;
    skippedImages: number;
  };
}

export interface CsvRow {
  filename: string;
  title: string;
  description: string;
  tags: string;
}

export type { LocalGroup, MarketplaceType };
