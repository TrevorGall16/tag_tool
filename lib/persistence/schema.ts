import type { DBSchema } from "idb";
import type { MarketplaceType } from "@/store/useBatchStore";

export interface BatchRecord {
  sessionId: string;
  marketplace: MarketplaceType;
  createdAt: number;
  lastModified: number;
}

export interface GroupRecord {
  id: string;
  sessionId: string;
  groupNumber: number;
  sharedTitle?: string;
  sharedDescription?: string;
  sharedTags: string[];
  isVerified: boolean;
  folderId?: string;
  isCollapsed?: boolean;
  createdAt?: number;
  semanticTags?: string[];
}

export interface ImageRecord {
  id: string;
  sessionId: string;
  groupId: string;
  originalFilename: string;
  sanitizedSlug: string;
  thumbnailDataUrl: string;
  aiTitle?: string;
  aiTags?: string[];
  aiConfidence?: number;
  userTitle?: string;
  userTags?: string[];
  status: "pending" | "processing" | "analyzed" | "verified" | "error";
  errorMessage?: string;
}

export interface BlobRecord {
  id: string;
  type: string;
  data: ArrayBuffer;
  size: number;
}

/**
 * Stores the original high-res File object for each ingested image.
 * IDB serialises File via the structured-clone algorithm — no ArrayBuffer conversion needed.
 * Keyed by imageId so it can be looked up or deleted in O(1).
 */
export interface OriginalFileRecord {
  imageId: string;
  file: File;
  storedAt: number;
}

export interface VisionBatchDB extends DBSchema {
  batches: {
    key: string;
    value: BatchRecord;
  };
  groups: {
    key: string;
    value: GroupRecord;
    indexes: {
      bySession: string;
    };
  };
  images: {
    key: string;
    value: ImageRecord;
    indexes: {
      byGroup: string;
      bySession: string;
    };
  };
  blobs: {
    key: string;
    value: BlobRecord;
  };
  originalFiles: {
    key: string;
    value: OriginalFileRecord;
  };
}
