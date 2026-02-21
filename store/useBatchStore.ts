"use client";

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { ExportSettings } from "@/lib/export";
import { DEFAULT_EXPORT_SETTINGS } from "@/lib/export";
import { DEFAULT_TAG_BLACKLIST } from "@/lib/utils/tag-processing";
import type { ClusterSettings } from "@/types";
import { syncImageToServer } from "@/lib/persistence/server-sync";

// Types for the store
export interface LocalImageItem {
  id: string;
  file: File;
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

export interface LocalGroup {
  id: string;
  groupNumber: number;
  images: LocalImageItem[];
  sharedTitle?: string;
  sharedDescription?: string;
  sharedTags: string[];
  isVerified: boolean;
  folderId?: string; // Which folder this group belongs to (null = Uncategorized)
  isCollapsed?: boolean; // UI state for collapsible view
  createdAt?: number; // Timestamp for stable sorting (optional for backwards compat)
  semanticTags?: string[]; // AI-generated category tags: [Broad, Specific, Vibe] (e.g., ["Gastronomy", "Dessert", "Sweet"])
}

export type MarketplaceType = "ETSY" | "ADOBE_STOCK";
export type StrategyType = "standard" | "etsy" | "stock";
export type GroupSortOption = "date" | "name" | "imageCount";

interface BatchState {
  // Session state
  sessionId: string | null;
  marketplace: MarketplaceType;
  strategy: StrategyType;
  maxTags: number;

  // Batch data
  groups: LocalGroup[];
  currentGroupIndex: number;

  // Selection state for export
  selectedGroupIds: Set<string>;

  // Processing state
  isProcessing: boolean;
  isUploading: boolean;
  isClustering: boolean;
  isTagging: boolean;

  // Clustering progress (for batch processing)
  clusteringProgress: {
    currentBatch: number;
    totalBatches: number;
    totalImages: number;
  } | null;

  // Error state
  error: string | null;

  // Export settings
  exportSettings: ExportSettings;

  // Naming settings (global, persisted)
  namingSettings: ClusterSettings;

  // Tag filtering
  tagBlacklist: string[];

  // UI preferences
  groupSortOption: GroupSortOption;

  // Actions
  initSession: () => void;
  setMarketplace: (marketplace: MarketplaceType) => void;
  setStrategy: (strategy: StrategyType) => void;
  setMaxTags: (maxTags: number) => void;
  toggleGroupSelection: (groupId: string) => void;
  selectAllGroups: () => void;
  deselectAllGroups: () => void;
  setGroups: (groups: LocalGroup[]) => void;
  addGroup: (group: LocalGroup) => void;
  updateGroup: (groupId: string, updates: Partial<LocalGroup>) => void;
  removeGroup: (groupId: string) => void;
  setCurrentGroupIndex: (index: number) => void;
  addImageToGroup: (groupId: string, image: LocalImageItem) => void;
  removeImageFromGroup: (groupId: string, imageId: string) => void;
  moveImageToGroup: (imageId: string, fromGroupId: string, toGroupId: string) => void;
  updateImageTags: (groupId: string, imageId: string, tags: string[], title?: string) => void;
  updateImageStatus: (
    groupId: string,
    imageId: string,
    status: LocalImageItem["status"],
    errorMessage?: string
  ) => void;
  verifyGroup: (groupId: string) => void;
  updateGroupTags: (
    groupId: string,
    aiTitle: string,
    aiTags: string[],
    aiConfidence: number
  ) => void;
  updateGroupMetadata: (
    groupId: string,
    title: string,
    description: string,
    tags: string[]
  ) => void;
  setProcessingState: (
    state: Partial<Pick<BatchState, "isProcessing" | "isUploading" | "isClustering" | "isTagging">>
  ) => void;
  setError: (error: string | null) => void;
  clearBatch: () => void;
  clearStore: () => void;
  ensureUnclusteredGroup: () => string;
  updateExportSettings: (settings: ExportSettings) => void;
  resetExportSettings: () => void;
  moveGroupToFolder: (groupId: string, folderId: string | null) => void;
  toggleGroupCollapse: (groupId: string) => void;
  collapseAllGroups: () => void;
  expandAllGroups: () => void;
  setClusteringProgress: (
    progress: { currentBatch: number; totalBatches: number; totalImages: number } | null
  ) => void;
  setTagBlacklist: (blacklist: string[]) => void;
  setNamingSettings: (settings: ClusterSettings) => void;
  setGroupSortOption: (option: GroupSortOption) => void;
  getSortedGroups: () => LocalGroup[];
  appendGroups: (newGroups: LocalGroup[]) => void;
  clearAllGroups: () => void;
}

export const useBatchStore = create<BatchState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        sessionId: null,
        marketplace: "ETSY",
        strategy: "etsy",
        maxTags: 25,
        groups: [],
        currentGroupIndex: 0,
        selectedGroupIds: new Set<string>(),
        isProcessing: false,
        isUploading: false,
        isClustering: false,
        isTagging: false,
        clusteringProgress: null,
        error: null,
        exportSettings: DEFAULT_EXPORT_SETTINGS,
        tagBlacklist: DEFAULT_TAG_BLACKLIST,
        namingSettings: {} as ClusterSettings,
        groupSortOption: "date",

        // Actions
        initSession: () => {
          // Check for existing session in Zustand or generate new one
          const existingSessionId = get().sessionId;
          const sessionId = existingSessionId || `session_${crypto.randomUUID()}`;

          if (process.env.NODE_ENV === "development") {
            console.log(`[Store] initSession called, using ID: "${sessionId}"`);
          }

          // Set cookie for auth promotion (30 days expiry)
          if (typeof document !== "undefined") {
            const expires = new Date();
            expires.setDate(expires.getDate() + 30);
            document.cookie = `visionbatch_session=${sessionId}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
          }

          set({
            sessionId,
            groups: [],
            currentGroupIndex: 0,
            error: null,
          });
        },

        setMarketplace: (marketplace) => {
          set({ marketplace });
        },

        setStrategy: (strategy) => {
          set({ strategy });
        },

        setMaxTags: (maxTags) => {
          // Clamp between 5 and 50
          const clamped = Math.max(5, Math.min(50, maxTags));
          set({ maxTags: clamped });
        },

        toggleGroupSelection: (groupId) => {
          // Validation: Ensure groupId is defined
          if (!groupId) {
            console.error(
              "[Selection] ERROR: Attempted to toggle selection with undefined groupId"
            );
            return;
          }
          set((state) => {
            const newSelected = new Set(state.selectedGroupIds);
            if (newSelected.has(groupId)) {
              newSelected.delete(groupId);
            } else {
              newSelected.add(groupId);
            }
            return { selectedGroupIds: newSelected };
          });
        },

        selectAllGroups: () => {
          set((state) => {
            const exportableGroupIds = state.groups
              .filter((g) => g.id !== "unclustered" && g.images.length > 0)
              .map((g) => g.id);
            return { selectedGroupIds: new Set(exportableGroupIds) };
          });
        },

        deselectAllGroups: () => {
          set({ selectedGroupIds: new Set() });
        },

        setGroups: (groups) => {
          // Sort groups by createdAt descending (newest first) — LIFO
          // Put "unclustered" group first, then sort by createdAt descending
          const sortedGroups = [...groups].sort((a, b) => {
            if (a.id === "unclustered") return -1;
            if (b.id === "unclustered") return 1;
            return (b.createdAt || 0) - (a.createdAt || 0);
          });
          set({ groups: sortedGroups });
        },

        addGroup: (group) => {
          set((state) => {
            // Ensure createdAt is set
            const newGroup = {
              ...group,
              createdAt: group.createdAt || Date.now(),
            };
            // Prepend new group (LIFO — newest first)
            const unclustered = state.groups.filter((g) => g.id === "unclustered");
            const rest = state.groups.filter((g) => g.id !== "unclustered");
            return { groups: [...unclustered, newGroup, ...rest] };
          });
        },

        updateGroup: (groupId, updates) => {
          set((state) => ({
            groups: state.groups.map((group) =>
              group.id === groupId ? { ...group, ...updates } : group
            ),
          }));
        },

        removeGroup: (groupId) => {
          set((state) => ({
            groups: state.groups.filter((group) => group.id !== groupId),
          }));
        },

        setCurrentGroupIndex: (index) => {
          set({ currentGroupIndex: index });
        },

        addImageToGroup: (groupId, image) => {
          set((state) => ({
            groups: state.groups.map((group) =>
              group.id === groupId ? { ...group, images: [...group.images, image] } : group
            ),
          }));
        },

        removeImageFromGroup: (groupId, imageId) => {
          set((state) => ({
            groups: state.groups.map((group) =>
              group.id === groupId
                ? { ...group, images: group.images.filter((img) => img.id !== imageId) }
                : group
            ),
          }));
        },

        moveImageToGroup: (imageId, fromGroupId, toGroupId) => {
          set((state) => {
            const fromGroup = state.groups.find((g) => g.id === fromGroupId);
            const toGroup = state.groups.find((g) => g.id === toGroupId);
            const image = fromGroup?.images.find((i) => i.id === imageId);

            if (!image || !toGroup) return state;

            // Inherit target group's tags and title when moving
            const updatedImage = {
              ...image,
              aiTags: toGroup.sharedTags.length > 0 ? toGroup.sharedTags : image.aiTags,
              aiTitle: toGroup.sharedTitle || image.aiTitle,
              userTags: toGroup.sharedTags.length > 0 ? toGroup.sharedTags : image.userTags,
              userTitle: toGroup.sharedTitle || image.userTitle,
            };

            return {
              groups: state.groups.map((group) => {
                if (group.id === fromGroupId) {
                  return {
                    ...group,
                    images: group.images.filter((i) => i.id !== imageId),
                  };
                }
                if (group.id === toGroupId) {
                  return {
                    ...group,
                    images: [...group.images, updatedImage],
                  };
                }
                return group;
              }),
            };
          });
        },

        updateImageTags: (groupId, imageId, tags, title) => {
          const state = get();
          const group = state.groups.find((g) => g.id === groupId);
          const image = group?.images.find((img) => img.id === imageId);

          set((s) => ({
            groups: s.groups.map((g) =>
              g.id === groupId
                ? {
                    ...g,
                    images: g.images.map((img) =>
                      img.id === imageId
                        ? {
                            ...img,
                            userTags: tags,
                            ...(title !== undefined && { userTitle: title }),
                          }
                        : img
                    ),
                  }
                : g
            ),
          }));

          // Debounced server sync with creation metadata for upsert
          syncImageToServer(imageId, {
            userTags: tags,
            ...(title !== undefined && { userTitle: title }),
            sessionId: state.sessionId || undefined,
            groupId,
            originalFilename: image?.originalFilename,
            sanitizedSlug: image?.sanitizedSlug,
            fileSize: image?.file?.size,
            mimeType: image?.file?.type,
          });
        },

        updateImageStatus: (groupId, imageId, status, errorMessage) => {
          set((state) => ({
            groups: state.groups.map((group) =>
              group.id === groupId
                ? {
                    ...group,
                    images: group.images.map((img) =>
                      img.id === imageId ? { ...img, status, errorMessage } : img
                    ),
                  }
                : group
            ),
          }));
        },

        verifyGroup: (groupId) => {
          set((state) => ({
            groups: state.groups.map((group) =>
              group.id === groupId ? { ...group, isVerified: true } : group
            ),
          }));
        },

        updateGroupTags: (groupId, aiTitle, aiTags, aiConfidence) => {
          // Validation: Ensure groupId is defined
          if (!groupId) {
            console.error("[Tagging] ERROR: Attempted to update tags with undefined groupId");
            return;
          }
          set((state) => ({
            groups: state.groups.map((group) => {
              if (group.id === groupId) {
                return {
                  ...group,
                  sharedTags: aiTags,
                  sharedTitle: aiTitle,
                  images: group.images.map((img) => ({
                    ...img,
                    aiTitle,
                    aiTags,
                    aiConfidence,
                    status: "analyzed" as const,
                  })),
                };
              }
              return group;
            }),
          }));
        },

        updateGroupMetadata: (groupId, title, description, tags) => {
          const state = get();
          const group = state.groups.find((g) => g.id === groupId);

          set((s) => ({
            groups: s.groups.map((g) =>
              g.id === groupId
                ? {
                    ...g,
                    sharedTitle: title,
                    sharedDescription: description,
                    sharedTags: tags,
                    images: g.images.map((img) => ({
                      ...img,
                      userTitle: title,
                      userTags: tags,
                    })),
                  }
                : g
            ),
          }));

          // Debounced server sync for each image in the group (with upsert metadata)
          if (group) {
            const sessionId = state.sessionId || undefined;
            for (const img of group.images) {
              syncImageToServer(img.id, {
                userTitle: title,
                userTags: tags,
                sessionId,
                groupId,
                originalFilename: img.originalFilename,
                sanitizedSlug: img.sanitizedSlug,
                fileSize: img.file?.size,
                mimeType: img.file?.type,
              });
            }
          }
        },

        setProcessingState: (processingState) => {
          set(processingState);
        },

        setError: (error) => {
          set({ error });
        },

        clearBatch: () => {
          set({
            sessionId: null,
            groups: [],
            currentGroupIndex: 0,
            selectedGroupIds: new Set(),
            isProcessing: false,
            isUploading: false,
            isClustering: false,
            isTagging: false,
            error: null,
          });
        },

        clearStore: () => {
          // Clear all state including persisted localStorage
          set({
            sessionId: null,
            marketplace: "ETSY",
            strategy: "etsy",
            maxTags: 25,
            groups: [],
            currentGroupIndex: 0,
            selectedGroupIds: new Set(),
            isProcessing: false,
            isUploading: false,
            isClustering: false,
            isTagging: false,
            error: null,
            exportSettings: DEFAULT_EXPORT_SETTINGS,
          });

          // Clear localStorage completely
          if (typeof window !== "undefined") {
            localStorage.removeItem("visionbatch-batch-storage");
            // Also clear the session cookie
            document.cookie = "visionbatch_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          }
        },

        ensureUnclusteredGroup: () => {
          const state = get();
          const existing = state.groups.find((g) => g.id === "unclustered");
          if (existing) {
            return existing.id;
          }
          const unclusteredGroup: LocalGroup = {
            id: "unclustered",
            groupNumber: 0,
            images: [],
            sharedTags: [],
            isVerified: false,
            createdAt: 0, // Always first
          };
          set({ groups: [unclusteredGroup, ...state.groups] });
          return unclusteredGroup.id;
        },

        updateExportSettings: (settings) => {
          set({ exportSettings: settings });
        },

        resetExportSettings: () => {
          set({ exportSettings: DEFAULT_EXPORT_SETTINGS });
        },

        moveGroupToFolder: (groupId, folderId) => {
          set((state) => ({
            groups: state.groups.map((group) =>
              group.id === groupId ? { ...group, folderId: folderId || undefined } : group
            ),
          }));
        },

        toggleGroupCollapse: (groupId) => {
          set((state) => ({
            groups: state.groups.map((group) =>
              group.id === groupId ? { ...group, isCollapsed: !group.isCollapsed } : group
            ),
          }));
        },

        collapseAllGroups: () => {
          set((state) => ({
            groups: state.groups.map((group) => ({ ...group, isCollapsed: true })),
          }));
        },

        expandAllGroups: () => {
          set((state) => ({
            groups: state.groups.map((group) => ({ ...group, isCollapsed: false })),
          }));
        },

        setClusteringProgress: (progress) => {
          set({ clusteringProgress: progress });
        },

        setTagBlacklist: (blacklist) => {
          set({ tagBlacklist: blacklist });
        },

        setNamingSettings: (settings) => {
          set({ namingSettings: settings });
        },

        setGroupSortOption: (option) => {
          set((state) => {
            const unclustered = state.groups.filter((g) => g.id === "unclustered");
            const clustered = state.groups.filter((g) => g.id !== "unclustered");

            const tiebreak = (a: LocalGroup, b: LocalGroup) =>
              (b.createdAt || 0) - (a.createdAt || 0) || b.groupNumber - a.groupNumber;

            let sorted: LocalGroup[];
            switch (option) {
              case "name":
                sorted = [...clustered].sort((a, b) => {
                  const nameA = a.sharedTitle || `Group ${a.groupNumber}`;
                  const nameB = b.sharedTitle || `Group ${b.groupNumber}`;
                  return nameA.localeCompare(nameB) || tiebreak(a, b);
                });
                break;
              case "imageCount":
                sorted = [...clustered].sort(
                  (a, b) => b.images.length - a.images.length || tiebreak(a, b)
                );
                break;
              case "date":
              default:
                sorted = [...clustered].sort(tiebreak);
                break;
            }

            return { groupSortOption: option, groups: [...unclustered, ...sorted] };
          });
        },

        getSortedGroups: () => {
          const state = get();
          // Return groups in their current array order (stable, insertion-based).
          // Sorting is applied eagerly in setGroupSortOption, not here.
          return state.groups.filter((g) => g.id !== "unclustered");
        },

        appendGroups: (newGroups) => {
          set((state) => {
            // Get current max group number
            const maxGroupNumber = state.groups.reduce(
              (max, g) => (g.groupNumber > max ? g.groupNumber : max),
              0
            );

            // Assign new group numbers and ensure createdAt
            const groupsWithNumbers = newGroups.map((group, index) => ({
              ...group,
              groupNumber: maxGroupNumber + index + 1,
              createdAt: group.createdAt || Date.now() + index,
            }));

            // Prepend new groups (LIFO — newest first)
            const existingGroups = state.groups.filter((g) => g.id !== "unclustered");
            const allGroups = [...groupsWithNumbers, ...existingGroups];

            return { groups: allGroups };
          });
        },

        clearAllGroups: () => {
          set((state) => ({
            groups: state.groups.filter((g) => g.id === "unclustered"),
            selectedGroupIds: new Set(),
          }));
        },
      }),
      {
        name: "visionbatch-batch-storage",
        // One-time cleanup: remove the legacy localStorage key left by the old brand name
        onRehydrateStorage: () => () => {
          if (typeof window !== "undefined") {
            localStorage.removeItem("tagarchitect-batch-storage");
            // Also expire the old session cookie
            document.cookie =
              "tagarchitect_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          }
        },
        // Only persist essential state, not file objects
        partialize: (state) => ({
          sessionId: state.sessionId,
          marketplace: state.marketplace,
          strategy: state.strategy,
          maxTags: state.maxTags,
          currentGroupIndex: state.currentGroupIndex,
          exportSettings: state.exportSettings,
          tagBlacklist: state.tagBlacklist,
          namingSettings: state.namingSettings,
          groupSortOption: state.groupSortOption,
        }),
      }
    ),
    { name: "BatchStore" }
  )
);
