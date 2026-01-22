"use client";

import { useState } from "react";
import { Download, CheckCircle, AlertCircle, Settings2, Eye, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useBatchStore } from "@/store/useBatchStore";
import { ExportEngine } from "@/lib/export";
import { saveSessionAtomic, nukeAllData } from "@/lib/persistence";
import { ExportSettings } from "./ExportSettings";
import { CSVPreviewModal } from "./CSVPreviewModal";
import type {
  ExportProgress,
  ExportResult,
  ExportSettings as ExportSettingsType,
} from "@/lib/export";

export interface ExportToolbarProps {
  className?: string;
}

export function ExportToolbar({ className }: ExportToolbarProps) {
  const {
    groups,
    marketplace,
    exportSettings,
    updateExportSettings,
    selectedGroupIds,
    selectAllGroups,
    sessionId,
  } = useBatchStore();

  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // DEBUG: Emergency save handler
  const handleForceSave = async () => {
    if (!sessionId) {
      setSaveMessage("No session ID!");
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      console.log("[DEBUG] Force save triggered");
      const result = await saveSessionAtomic(sessionId, marketplace, groups);
      setSaveMessage(`Saved ${result.savedGroups} groups, ${result.savedImages} images`);
      setTimeout(() => setSaveMessage(null), 5000);
    } catch (err) {
      console.error("[DEBUG] Force save failed:", err);
      setSaveMessage(`FAILED: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
  };

  // DEBUG: Nuke all data handler
  const handleNukeDB = async () => {
    if (!confirm("This will DELETE ALL DATA from IndexedDB. Are you sure?")) {
      return;
    }

    try {
      await nukeAllData();
      setSaveMessage("Database cleared! Refresh page.");
      // Clear Zustand store too
      useBatchStore.getState().clearBatch();
    } catch (err) {
      console.error("[DEBUG] Nuke failed:", err);
      setSaveMessage(`NUKE FAILED: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const exportableGroups = groups.filter(
    (g) =>
      g.id !== "unclustered" && g.images.length > 0 && (g.sharedTitle || g.sharedTags.length > 0)
  );

  // Calculate what will be exported based on selection
  const groupsToExport =
    selectedGroupIds.size > 0
      ? exportableGroups.filter((g) => selectedGroupIds.has(g.id))
      : exportableGroups;

  const totalExportableImages = groupsToExport.reduce((sum, g) => sum + g.images.length, 0);
  const canExport = totalExportableImages > 0 && !isExporting;

  const handleExport = async () => {
    if (!canExport) return;

    setIsExporting(true);
    setResult(null);
    setShowResult(false);
    setProgress(null);

    try {
      const engine = new ExportEngine({
        marketplace,
        settings: exportSettings,
        selectedGroupIds: selectedGroupIds.size > 0 ? selectedGroupIds : undefined,
      });
      engine.onProgress(setProgress);

      const exportResult = await engine.exportGroups(groups);
      setResult(exportResult);

      if (exportResult.success && exportResult.blob && exportResult.filename) {
        ExportEngine.downloadBlob(exportResult.blob, exportResult.filename);
      }

      setShowResult(true);
      setTimeout(() => setShowResult(false), 5000);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Export failed",
        stats: { totalGroups: 0, totalImages: 0, skippedImages: 0 },
      });
      setShowResult(true);
    } finally {
      setIsExporting(false);
      setProgress(null);
    }
  };

  const getButtonText = () => {
    if (isExporting && progress) {
      switch (progress.phase) {
        case "preparing":
          return "Preparing...";
        case "processing":
          return `Processing ${progress.current}/${progress.total}`;
        case "compressing":
          return "Creating ZIP...";
        default:
          return "Exporting...";
      }
    }
    if (totalExportableImages === 0) {
      return "No images to export";
    }
    if (selectedGroupIds.size > 0) {
      return `Download Selected (${totalExportableImages})`;
    }
    return `Download All (${totalExportableImages})`;
  };

  const handleSettingsChange = (newSettings: ExportSettingsType) => {
    updateExportSettings(newSettings);
  };

  const handlePreview = () => {
    // Auto-select all if nothing is selected
    if (selectedGroupIds.size === 0 && exportableGroups.length > 0) {
      selectAllGroups();
    }
    setShowPreview(true);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* DEBUG: Emergency Save Button */}
      <Button
        onClick={handleForceSave}
        variant="outline"
        size="md"
        title="DEBUG: Force Save to IndexedDB"
        disabled={isSaving || groups.length === 0}
        className="border-orange-300 text-orange-600 hover:bg-orange-50"
      >
        <Save className="h-4 w-4 mr-1" />
        {isSaving ? "Saving..." : "Force Save"}
      </Button>

      {/* DEBUG: Nuke Database Button */}
      <Button
        onClick={handleNukeDB}
        variant="outline"
        size="md"
        title="DEBUG: Delete ALL data from IndexedDB"
        className="border-red-300 text-red-600 hover:bg-red-50"
      >
        <Trash2 className="h-4 w-4 mr-1" />
        Nuke DB
      </Button>

      {saveMessage && (
        <span
          className={cn(
            "text-xs px-2 py-1 rounded",
            saveMessage.startsWith("FAILED") || saveMessage.startsWith("NUKE")
              ? "bg-red-100 text-red-700"
              : "bg-green-100 text-green-700"
          )}
        >
          {saveMessage}
        </span>
      )}

      <div className="w-px h-6 bg-slate-200" />

      <Button
        onClick={handlePreview}
        variant="outline"
        size="md"
        title="Preview Metadata"
        disabled={exportableGroups.length === 0}
      >
        <Eye className="h-4 w-4" />
      </Button>

      <Button
        onClick={() => setShowSettings(true)}
        variant="outline"
        size="md"
        title="Export Settings"
      >
        <Settings2 className="h-4 w-4" />
      </Button>

      <Button
        onClick={handleExport}
        disabled={!canExport}
        isLoading={isExporting}
        variant="primary"
        size="md"
      >
        {!isExporting && <Download className="h-4 w-4 mr-2" />}
        {getButtonText()}
      </Button>

      {showResult && result && (
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm",
            result.success
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          )}
        >
          {result.success ? (
            <>
              <CheckCircle className="h-4 w-4" />
              Exported {result.stats.totalImages} images
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4" />
              {result.error}
            </>
          )}
        </div>
      )}

      <ExportSettings
        settings={exportSettings}
        onSettingsChange={handleSettingsChange}
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      <CSVPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        groups={groupsToExport}
        exportSettings={exportSettings}
      />
    </div>
  );
}
