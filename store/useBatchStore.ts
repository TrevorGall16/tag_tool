"use client";

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { ExportSettings } from "@/lib/export";
import { DEFAULT_EXPORT_SETTINGS } from "@/lib/export";
import type { ClusterSettings } from "@/types";

// Types for the store
export interface LocalImageItem {
  id: string;
  file: File;
  originalFilename: string;
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
        namingSettings: {} as ClusterSettings,
        groupSortOption: "date",

        // Actions
        initSession: () => {
          // Check for existing session in Zustand or generate new one
          const existingSessionId = get().sessionId;
          const sessionId = existingSessionId || `session_${crypto.randomUUID()}`;

          console.log(`[Store] initSession called, using ID: "${sessionId}"`);

          // Set cookie for auth promotion (30 days expiry)
          if (typeof document !== "undefined") {
            const expires = new Date();
            expires.setDate(expires.getDate() + 30);
            document.cookie = `tagarchitect_session=${sessionId}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
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
              console.log(`[Selection] Deselected group: ${groupId}`);
            } else {
              newSelected.add(groupId);
              console.log(`[Selection] Selected group: ${groupId}`);
            }
            console.log(
              `[Selection] Now selected: ${Array.from(newSelected).join(", ") || "none"}`
            );
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
          // Sort groups by createdAt to maintain stable order
          // Put "unclustered" group first, then sort by createdAt ascending
          const sortedGroups = [...groups].sort((a, b) => {
            if (a.id === "unclustered") return -1;
            if (b.id === "unclustered") return 1;
            return (a.createdAt || 0) - (b.createdAt || 0);
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
            // Insert and maintain sort order
            const newGroups = [...state.groups, newGroup].sort((a, b) => {
              if (a.id === "unclustered") return -1;
              if (b.id === "unclustered") return 1;
              return (a.createdAt || 0) - (b.createdAt || 0);
            });
            return { groups: newGroups };
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
          console.log(`[Store] Removing image ${imageId} from group ${groupId}`);
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
          set((state) => ({
            groups: state.groups.map((group) =>
              group.id === groupId
                ? {
                    ...group,
                    images: group.images.map((img) =>
                      img.id === imageId
                        ? {
                            ...img,
                            userTags: tags,
                            ...(title !== undefined && { userTitle: title }),
                          }
                        : img
                    ),
                  }
                : group
            ),
          }));
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
          console.log(
            `[Tagging] Updating group ${groupId} with title: "${aiTitle}", ${aiTags.length} tags`
          );
          set((state) => ({
            groups: state.groups.map((group) => {
              if (group.id === groupId) {
                console.log(`[Tagging] Matched group ${groupId} (${group.images.length} images)`);
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
          set((state) => ({
            groups: state.groups.map((group) =>
              group.id === groupId
                ? {
                    ...group,
                    sharedTitle: title,
                    sharedDescription: description,
                    sharedTags: tags,
                    images: group.images.map((img) => ({
                      ...img,
                      userTitle: title,
                      userTags: tags,
                    })),
                  }
                : group
            ),
          }));
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
            localStorage.removeItem("tagarchitect-batch-storage");
            // Also clear the session cookie
            document.cookie =
              "tagarchitect_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
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
          console.log(`[Store] Moving group ${groupId} to folder ${folderId || "Uncategorized"}`);
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

        setNamingSettings: (settings) => {
          set({ namingSettings: settings });
        },

        setGroupSortOption: (option) => {
          set({ groupSortOption: option });
        },

        getSortedGroups: () => {
          const state = get();
          const clusteredGroups = state.groups.filter((g) => g.id !== "unclustered");

          switch (state.groupSortOption) {
            case "name":
              return [...clusteredGroups].sort((a, b) => {
                const nameA = a.sharedTitle || `Group ${a.groupNumber}`;
                const nameB = b.sharedTitle || `Group ${b.groupNumber}`;
                return nameA.localeCompare(nameB);
              });
            case "imageCount":
              return [...clusteredGroups].sort((a, b) => b.images.length - a.images.length);
            case "date":
            default:
              return [...clusteredGroups].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
          }
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

            // Keep existing groups (except unclustered), add new groups
            const existingGroups = state.groups.filter((g) => g.id !== "unclustered");
            const allGroups = [...existingGroups, ...groupsWithNumbers];

            // Sort by createdAt
            const sortedGroups = allGroups.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

            console.log(
              `[Store] Appended ${newGroups.length} groups. Total: ${sortedGroups.length}`
            );

            return { groups: sortedGroups };
          });
        },

        clearAllGroups: () => {
          console.log("[Store] Clearing all groups");
          set((state) => ({
            groups: state.groups.filter((g) => g.id === "unclustered"),
            selectedGroupIds: new Set(),
          }));
        },
      }),
      {
        name: "tagarchitect-batch-storage",
        // Only persist essential state, not file objects
        partialize: (state) => ({
          sessionId: state.sessionId,
          marketplace: state.marketplace,
          strategy: state.strategy,
          maxTags: state.maxTags,
          currentGroupIndex: state.currentGroupIndex,
          exportSettings: state.exportSettings,
          namingSettings: state.namingSettings,
          groupSortOption: state.groupSortOption,
        }),
      }
    ),
    { name: "BatchStore" }
  )
);
