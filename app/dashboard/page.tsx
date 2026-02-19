"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useBatchStore } from "@/store/useBatchStore";
import { usePersistence, markExplicitClear } from "@/hooks/usePersistence";
import { nukeAllData } from "@/lib/persistence";
import { Dropzone } from "@/components/uploader";
import { ClusterTool } from "@/components/features/ClusterTool";
import {
  ImageGallery,
  GroupList,
  GroupSkeleton,
  BatchToolbar,
  ClusteringProgress,
} from "@/components/gallery";
import { BatchDndContext } from "@/components/dnd";
import { Header } from "@/components/layout";
import {
  ConfirmationModal,
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  FolderPlus,
  Folder,
  FolderOpen,
  ChevronLeft,
  Trash2,
  Images,
  Pencil,
  Check,
  X,
  Upload,
  Layers,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface Folder {
  id: string;
  name: string;
  groupCount: number;
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sessionId, initSession, isClustering, clearBatch, groups, moveGroupToFolder } =
    useBatchStore();
  const { isRestoring, triggerSync } = usePersistence();

  const [isResetting, setIsResetting] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);

  // Derive activeFolderId from URL search params for browser Back button support
  const activeFolderId = searchParams.get("folder") || null;
  const setActiveFolderId = useCallback(
    (folderId: string | null) => {
      if (folderId) {
        router.push(`/dashboard?folder=${encodeURIComponent(folderId)}`);
      } else {
        router.push("/dashboard");
      }
    },
    [router]
  );
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState("");
  const [showTutorial, setShowTutorial] = useState(false);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const isAuthenticated = status === "authenticated";

  useEffect(() => {
    if (!sessionId) {
      initSession();
    }
  }, [sessionId, initSession]);

  // Fetch folders
  useEffect(() => {
    if (isAuthenticated) {
      fetchFolders();
    }
  }, [isAuthenticated]);

  const fetchFolders = async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (data.success) {
        setFolders(
          data.data.map((p: { id: string; name: string; batchCount: number }) => ({
            id: p.id,
            name: p.name,
            groupCount: p.batchCount,
          }))
        );
      }
    } catch (err) {
      console.error("Failed to fetch folders:", err);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    setIsCreatingFolder(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setFolders((prev) => [{ id: data.data.id, name: data.data.name, groupCount: 0 }, ...prev]);
        toast.success(`Created folder "${data.data.name}"`);
        setNewFolderName("");
        setShowNewFolderInput(false);
      } else {
        toast.error(data.error || "Failed to create folder");
      }
    } catch (err) {
      toast.error("Failed to create folder");
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    try {
      const res = await fetch(`/api/projects/${folderId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setFolders((prev) => prev.filter((f) => f.id !== folderId));
        // Move any groups in this folder back to uncategorized
        groups.forEach((g) => {
          if (g.folderId === folderId) {
            moveGroupToFolder(g.id, null);
          }
        });
        toast.success(`Deleted folder "${folderName}"`);
      }
    } catch (err) {
      toast.error("Failed to delete folder");
    }
  };

  const handleRenameFolder = async (folderId: string) => {
    if (!renamingValue.trim()) {
      setRenamingFolderId(null);
      return;
    }

    try {
      const res = await fetch(`/api/projects/${folderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renamingValue.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setFolders((prev) =>
          prev.map((f) => (f.id === folderId ? { ...f, name: renamingValue.trim() } : f))
        );
        toast.success("Folder renamed");
      } else {
        toast.error(data.error || "Failed to rename folder");
      }
    } catch (err) {
      toast.error("Failed to rename folder");
    } finally {
      setRenamingFolderId(null);
      setRenamingValue("");
    }
  };

  const startRenaming = (folder: Folder) => {
    setRenamingFolderId(folder.id);
    setRenamingValue(folder.name);
  };

  const handleMoveGroupToFolder = useCallback(
    async (groupId: string, folderId: string | null) => {
      moveGroupToFolder(groupId, folderId);
      toast.success(folderId ? "Moved to folder" : "Moved to Uncategorized");
      // TODO: API call to persist in database
    },
    [moveGroupToFolder]
  );

  const handleNewBatchClick = () => {
    const totalImages = groups.reduce((acc, g) => acc + g.images.length, 0);
    if (totalImages > 0) {
      setShowResetModal(true);
    } else {
      performReset();
    }
  };

  const performReset = async () => {
    setIsResetting(true);
    setShowResetModal(false);
    try {
      markExplicitClear();
      await nukeAllData();
      clearBatch();
      initSession();
    } catch (err) {
      console.error("[Dashboard] Reset failed:", err);
    } finally {
      setIsResetting(false);
    }
  };

  const hasImages = groups.some((g) => g.images.length > 0);

  // Calculate uncategorized groups
  const uncategorizedGroups = groups.filter(
    (g) => g.id !== "unclustered" && !g.folderId && g.images.length > 0
  );

  // Get active folder details
  const activeFolder = folders.find((f) => f.id === activeFolderId);

  // Filter groups for current view
  const visibleGroups = activeFolderId
    ? groups.filter((g) => g.folderId === activeFolderId)
    : groups;

  if (isRestoring) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-slate-700 font-medium">Restoring your session...</p>
          <p className="text-sm text-slate-500 mt-1">Please wait while we load your images</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Fixed progress bar at top */}
      <ClusteringProgress />

      <Header
        onNewBatch={handleNewBatchClick}
        isResetting={isResetting}
        onHelpClick={() => setShowTutorial(true)}
      />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <BatchDndContext>
          {/* Breadcrumb Navigation */}
          {activeFolderId && (
            <div className="sticky top-0 z-30 bg-gradient-to-b from-slate-50 to-slate-100 pb-4 mb-6">
              <button
                onClick={() => setActiveFolderId(null)}
                className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Back to Folders
              </button>
              <h1 className="text-3xl font-bold text-slate-900 mt-2 flex items-center gap-3">
                {activeFolderId === "__uncategorized__" ? (
                  <>
                    <Images className="h-7 w-7 text-slate-500" />
                    Uncategorized
                  </>
                ) : activeFolder ? (
                  <>
                    <FolderOpen className="h-7 w-7 text-blue-600" />
                    <span className="max-w-[30ch] break-words">{activeFolder.name}</span>
                  </>
                ) : null}
              </h1>
            </div>
          )}

          {/* Folder Grid View (when no folder is selected) */}
          {!activeFolderId && (
            <>
              {/* Title */}
              <div className="text-center mb-10">
                <h2 className="text-4xl font-bold text-slate-900 mb-3 tracking-tight">
                  Tag Architect
                </h2>
                <p className="text-lg text-slate-600">Upload, Cluster, and Tag</p>
              </div>

              {/* Step 1: Upload */}
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">
                  1
                </span>
                <span className="text-sm font-medium text-slate-600">Upload Images</span>
              </div>
              <Dropzone />

              {/* Step 2: Organize */}
              <div className="flex items-center gap-2 mt-12 mb-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">
                  2
                </span>
                <span className="text-sm font-medium text-slate-600">Organize into Groups</span>
              </div>

              {/* Context input for AI clustering */}
              <ClusterTool className="mb-4" />

              <ImageGallery />

              {/* Folders Section */}
              {isAuthenticated && (
                <section className="mt-12">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-slate-900">Your Folders</h3>
                    {!showNewFolderInput && (
                      <button
                        onClick={() => setShowNewFolderInput(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                      >
                        <FolderPlus className="h-4 w-4" />
                        Create Folder
                      </button>
                    )}
                  </div>

                  {/* New Folder Input */}
                  {showNewFolderInput && (
                    <div className="mb-6 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          value={newFolderName}
                          onChange={(e) => setNewFolderName(e.target.value)}
                          placeholder="Folder name..."
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleCreateFolder();
                            if (e.key === "Escape") {
                              setShowNewFolderInput(false);
                              setNewFolderName("");
                            }
                          }}
                          autoFocus
                          disabled={isCreatingFolder}
                        />
                        <button
                          onClick={handleCreateFolder}
                          disabled={!newFolderName.trim() || isCreatingFolder}
                          className="shrink-0 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isCreatingFolder ? "Creating..." : "Create"}
                        </button>
                        <button
                          onClick={() => {
                            setShowNewFolderInput(false);
                            setNewFolderName("");
                          }}
                          className="shrink-0 px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Folder Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {/* Uncategorized Card */}
                    {uncategorizedGroups.length > 0 && (
                      <div
                        onClick={() => setActiveFolderId("__uncategorized__")}
                        className={cn(
                          "p-5 bg-white rounded-xl border-2 border-dashed border-slate-300",
                          "cursor-pointer hover:border-slate-400 hover:shadow-md transition-all",
                          "flex flex-col items-center justify-center text-center min-h-[160px]"
                        )}
                      >
                        <Images className="h-10 w-10 text-slate-400 mb-2" />
                        <h4 className="font-medium text-slate-700">Uncategorized</h4>
                        {(() => {
                          const totalImages = uncategorizedGroups.reduce(
                            (sum, g) => sum + g.images.length,
                            0
                          );
                          const taggedGroups = uncategorizedGroups.filter(
                            (g) => g.images[0]?.aiTags && g.images[0].aiTags.length > 0
                          ).length;
                          const taggedPercent = Math.round(
                            (taggedGroups / uncategorizedGroups.length) * 100
                          );
                          return (
                            <div className="text-xs text-slate-500 mt-2 space-y-0.5">
                              <p>
                                {totalImages} image{totalImages !== 1 ? "s" : ""} •{" "}
                                {uncategorizedGroups.length} group
                                {uncategorizedGroups.length !== 1 ? "s" : ""}
                              </p>
                              <p
                                className={cn(
                                  taggedPercent === 100 ? "text-green-600" : "text-amber-600"
                                )}
                              >
                                {taggedPercent}% tagged
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Folder Cards */}
                    {folders.map((folder) => {
                      const folderGroups = groups.filter(
                        (g) => g.folderId === folder.id && g.images.length > 0
                      );
                      const folderGroupCount = folderGroups.length;
                      const totalImages = folderGroups.reduce((sum, g) => sum + g.images.length, 0);
                      const taggedGroups = folderGroups.filter(
                        (g) => g.images[0]?.aiTags && g.images[0].aiTags.length > 0
                      ).length;
                      const taggedPercent =
                        folderGroupCount > 0
                          ? Math.round((taggedGroups / folderGroupCount) * 100)
                          : 0;
                      const isRenaming = renamingFolderId === folder.id;

                      return (
                        <div
                          key={folder.id}
                          className={cn(
                            "group relative p-5 bg-white rounded-xl border border-slate-200",
                            "cursor-pointer hover:border-blue-300 hover:shadow-lg transition-all",
                            "flex flex-col min-h-[160px]"
                          )}
                        >
                          <div
                            onClick={() => !isRenaming && setActiveFolderId(folder.id)}
                            className="flex-1 flex flex-col items-center justify-center text-center"
                          >
                            <Folder className="h-10 w-10 text-blue-500 mb-2" />

                            {/* Folder name or rename input */}
                            {isRenaming ? (
                              <div
                                className="flex items-center gap-1 mt-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="text"
                                  value={renamingValue}
                                  onChange={(e) => setRenamingValue(e.target.value)}
                                  className="w-24 px-2 py-1 text-sm text-slate-900 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleRenameFolder(folder.id);
                                    if (e.key === "Escape") {
                                      setRenamingFolderId(null);
                                      setRenamingValue("");
                                    }
                                  }}
                                />
                                <button
                                  onClick={() => handleRenameFolder(folder.id)}
                                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setRenamingFolderId(null);
                                    setRenamingValue("");
                                  }}
                                  className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <h4 className="font-medium text-slate-900 max-w-[30ch] truncate">
                                {folder.name}
                              </h4>
                            )}

                            {/* Stats */}
                            <div className="text-xs text-slate-500 mt-2 space-y-0.5">
                              <p>
                                {totalImages} image{totalImages !== 1 ? "s" : ""} •{" "}
                                {folderGroupCount} group{folderGroupCount !== 1 ? "s" : ""}
                              </p>
                              {folderGroupCount > 0 && (
                                <p
                                  className={cn(
                                    taggedPercent === 100 ? "text-green-600" : "text-amber-600"
                                  )}
                                >
                                  {taggedPercent}% tagged
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startRenaming(folder);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Rename folder"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteFolderTarget({
                                  id: folder.id,
                                  name: folder.name,
                                });
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Delete folder"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Empty state for folders */}
                    {folders.length === 0 && uncategorizedGroups.length === 0 && (
                      <div className="col-span-full p-8 text-center text-slate-500">
                        <Folder className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>No folders yet. Create one to organize your image groups.</p>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Step 3: Generate Tags */}
              <div className="flex items-center gap-2 mt-12 mb-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">
                  3
                </span>
                <span className="text-sm font-medium text-slate-600">Generate Tags</span>
              </div>

              {/* Batch Toolbar */}
              <BatchToolbar folderName={undefined} />

              {/* All Groups (outside folders view) */}
              {isClustering ? (
                <GroupSkeleton className="mt-6" count={3} />
              ) : (
                <GroupList
                  className="mt-6"
                  onLightboxSave={triggerSync}
                  folders={folders}
                  onMoveToFolder={handleMoveGroupToFolder}
                />
              )}
            </>
          )}

          {/* Inside Folder View */}
          {activeFolderId && (
            <>
              {/* Dropzone inside folder */}
              <Dropzone />

              {/* Context input for AI clustering */}
              <ClusterTool className="mt-8 mb-4" />

              {/* Image Gallery */}
              <ImageGallery className="mt-4" />

              {/* Batch Toolbar */}
              <BatchToolbar
                className="mt-8"
                folderName={activeFolderId === "__uncategorized__" ? undefined : activeFolder?.name}
              />

              {/* Groups in this folder */}
              {isClustering ? (
                <GroupSkeleton className="mt-6" count={3} />
              ) : (
                <GroupList
                  className="mt-6"
                  onLightboxSave={triggerSync}
                  folders={folders}
                  onMoveToFolder={handleMoveGroupToFolder}
                  filterFolderId={activeFolderId === "__uncategorized__" ? null : activeFolderId}
                />
              )}
            </>
          )}
        </BatchDndContext>
      </main>

      {/* Tutorial Modal */}
      <AlertDialog open={showTutorial} onOpenChange={setShowTutorial}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>How TagArchitect Works</AlertDialogTitle>
            <AlertDialogDescription>
              Three simple steps to tag your images for Etsy or Adobe Stock.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Upload className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">1. Upload Images</p>
                <p className="text-sm text-slate-500">
                  Drag and drop or click the dropzone to upload your product photos.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <Layers className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">2. Organize into Groups</p>
                <p className="text-sm text-slate-500">
                  Cluster images with AI, group them all together, or manually create groups and
                  drag images.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">3. Generate Tags</p>
                <p className="text-sm text-slate-500">
                  AI generates optimized titles and tags for each group. Edit, export, or copy as
                  needed.
                </p>
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction>Got it</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Folder Confirmation */}
      <AlertDialog
        open={!!deleteFolderTarget}
        onOpenChange={(open) => !open && setDeleteFolderTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete folder?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete folder "{deleteFolderTarget?.name}"? Groups inside will be moved to
              Uncategorized.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleteFolderTarget) {
                  handleDeleteFolder(deleteFolderTarget.id, deleteFolderTarget.name);
                  setDeleteFolderTarget(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Confirmation Modal */}
      <ConfirmationModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={performReset}
        title="Start a New Batch?"
        message="This will permanently delete your current images and metadata. This action cannot be undone."
        confirmLabel="Delete & Start Fresh"
        cancelLabel="Keep Working"
        variant="danger"
        isLoading={isResetting}
      />
    </div>
  );
}
