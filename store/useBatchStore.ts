"use client";

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { ExportSettings } from "@/lib/export";
import { DEFAULT_EXPORT_SETTINGS } from "@/lib/export";

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
}

export type MarketplaceType = "ETSY" | "ADOBE_STOCK";

interface BatchState {
  // Session state
  sessionId: string | null;
  marketplace: MarketplaceType;

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

  // Error state
  error: string | null;

  // Export settings
  exportSettings: ExportSettings;

  // Actions
  initSession: () => void;
  setMarketplace: (marketplace: MarketplaceType) => void;
  toggleGroupSelection: (groupId: string) => void;
  selectAllGroups: () => void;
  deselectAllGroups: () => void;
  setGroups: (groups: LocalGroup[]) => void;
  addGroup: (group: LocalGroup) => void;
  updateGroup: (groupId: string, updates: Partial<LocalGroup>) => void;
  removeGroup: (groupId: string) => void;
  setCurrentGroupIndex: (index: number) => void;
  addImageToGroup: (groupId: string, image: LocalImageItem) => void;
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
  ensureUnclusteredGroup: () => string;
  updateExportSettings: (settings: ExportSettings) => void;
  resetExportSettings: () => void;
}

export const useBatchStore = create<BatchState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        sessionId: null,
        marketplace: "ETSY",
        groups: [],
        currentGroupIndex: 0,
        selectedGroupIds: new Set<string>(),
        isProcessing: false,
        isUploading: false,
        isClustering: false,
        isTagging: false,
        error: null,
        exportSettings: DEFAULT_EXPORT_SETTINGS,

        // Actions
        initSession: () => {
          // DEBUG: Use static session ID to eliminate ID mismatch issues
          // TODO: Remove this after debugging persistence issues
          const STATIC_SESSION_ID = "default-user-session";
          console.log(`[Store] initSession called, using static ID: "${STATIC_SESSION_ID}"`);
          set({
            sessionId: STATIC_SESSION_ID,
            groups: [],
            currentGroupIndex: 0,
            error: null,
          });
        },

        setMarketplace: (marketplace) => {
          set({ marketplace });
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
          set({ groups });
        },

        addGroup: (group) => {
          set((state) => ({
            groups: [...state.groups, group],
          }));
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
      }),
      {
        name: "tagarchitect-batch-storage",
        // Only persist essential state, not file objects
        partialize: (state) => ({
          sessionId: state.sessionId,
          marketplace: state.marketplace,
          currentGroupIndex: state.currentGroupIndex,
          exportSettings: state.exportSettings,
        }),
      }
    ),
    { name: "BatchStore" }
  )
);
