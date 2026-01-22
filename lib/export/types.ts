import type { LocalGroup, MarketplaceType } from "@/store/useBatchStore";

// ============================================
// EXPORT NAMING TYPES
// ============================================

export interface ExportNamingOptions {
  pattern: string;
  sequencePadding: number;
  projectName: string;
}

export interface NamingContext {
  date: string;
  project: string;
  seq: string;
  original: string;
  group: string;
}

export type NamingPlaceholder = "{date}" | "{project}" | "{seq}" | "{original}" | "{group}";

// ============================================
// METADATA TYPES
// ============================================

export interface MetadataOptions {
  enabled: boolean;
  burnExif: boolean;
  burnIptc: boolean;
}

export interface ImageMetadata {
  title: string;
  keywords: string[];
  description?: string;
}

export interface MetadataWriteResult {
  success: boolean;
  data?: ArrayBuffer;
  error?: string;
}

// ============================================
// EXPORT SETTINGS
// ============================================

export interface ExportSettings {
  naming: ExportNamingOptions;
  metadata: MetadataOptions;
}

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  naming: {
    pattern: "{project}_{seq}",
    sequencePadding: 3,
    projectName: "export",
  },
  metadata: {
    enabled: true,
    burnExif: true,
    burnIptc: true,
  },
};

// ============================================
// EXPORT OPTIONS
// ============================================

export interface ExportOptions {
  marketplace: MarketplaceType;
  includeUnverified?: boolean;
  settings?: ExportSettings;
  selectedGroupIds?: Set<string>;
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
