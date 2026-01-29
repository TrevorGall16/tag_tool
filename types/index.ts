// Re-export Prisma types for convenience
export type {
  User,
  Batch,
  Group,
  ImageItem,
  CreditsLedger,
  Marketplace,
  BatchStatus,
  SubscriptionTier,
  SubscriptionStatus,
  ImageStatus,
  LedgerReason,
} from "@prisma/client";

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Vision API types
export interface VisionAnalysisRequest {
  imageDataUrl: string;
  marketplace: string;
}

export interface VisionAnalysisResponse {
  title: string;
  tags: string[];
  confidence: number;
}

// Credits types
export interface CreditsBalanceResponse {
  balance: number;
  tier: string;
}

export interface CreditsDeductRequest {
  amount: number;
  reason: string;
  description?: string;
}

// Batch types
export interface BatchCreateRequest {
  marketplace: string;
  sessionId: string;
}

export interface BatchWithGroups {
  id: string;
  marketplace: string;
  status: string;
  groups: GroupWithImages[];
  createdAt: Date;
  expiresAt: Date;
}

export interface GroupWithImages {
  id: string;
  groupNumber: number;
  isVerified: boolean;
  sharedTags: string[] | null;
  images: ImageItemSummary[];
}

export interface ImageItemSummary {
  id: string;
  originalFilename: string;
  sanitizedSlug: string;
  thumbnailDataUrl: string | null;
  aiTitle: string | null;
  aiTags: string[] | null;
  userTitle: string | null;
  userTags: string[] | null;
  status: string;
}

// Stripe types
export interface CheckoutSessionRequest {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

// Vision Clustering types
export interface VisionClusterRequest {
  images: ClusterImageInput[];
  marketplace: "ETSY" | "ADOBE_STOCK";
  maxGroups?: number;
}

export interface ClusterImageInput {
  id: string;
  dataUrl: string;
  name?: string; // Original filename for context
  description?: string; // Optional description for context
}

export interface VisionClusterResponse {
  groups: ImageClusterGroup[];
  processingTimeMs: number;
}

export interface ImageClusterGroup {
  groupId: string;
  imageIds: string[];
  title?: string; // AI-provided human-readable title (1-2 words)
  suggestedLabel?: string; // Deprecated: use title instead
  semanticTags?: string[]; // Multi-level tags: [Broad Category, Specific Type, Vibe/Attribute]
  confidence: number;
}

// Vision Tags types
export interface VisionTagsRequest {
  images: TagImageInput[];
  marketplace: "ETSY" | "ADOBE_STOCK";
  strategy?: "standard" | "etsy" | "stock";
  maxTags?: number;
}

export interface TagImageInput {
  id: string;
  dataUrl: string;
}

export interface VisionTagsResponse {
  results: ImageTagResult[];
  processingTimeMs: number;
}

export interface ImageTagResult {
  imageId: string;
  title: string;
  description: string;
  tags: string[];
  confidence: number;
}
