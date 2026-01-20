"use client";

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

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

  // Processing state
  isProcessing: boolean;
  isUploading: boolean;
  isClustering: boolean;
  isTagging: boolean;

  // Error state
  error: string | null;

  // Actions
  initSession: () => void;
  setMarketplace: (marketplace: MarketplaceType) => void;
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
        isProcessing: false,
        isUploading: false,
        isClustering: false,
        isTagging: false,
        error: null,

        // Actions
        initSession: () => {
          set({
            sessionId: crypto.randomUUID(),
            groups: [],
            currentGroupIndex: 0,
            error: null,
          });
        },

        setMarketplace: (marketplace) => {
          set({ marketplace });
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
            const image = fromGroup?.images.find((i) => i.id === imageId);

            if (!image) return state;

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
                    images: [...group.images, image],
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
          set((state) => ({
            groups: state.groups.map((group) =>
              group.id === groupId
                ? {
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
                  }
                : group
            ),
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
      }),
      {
        name: "tagarchitect-batch-storage",
        // Only persist essential state, not file objects
        partialize: (state) => ({
          sessionId: state.sessionId,
          marketplace: state.marketplace,
          currentGroupIndex: state.currentGroupIndex,
        }),
      }
    ),
    { name: "BatchStore" }
  )
);
