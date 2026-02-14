"use client";

import { useState } from "react";
import {
  Download,
  CheckCircle,
  AlertCircle,
  Settings2,
  Eye,
  Copy,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { cn, collectAllTags, copyToClipboard, downloadString } from "@/lib/utils";
import { useBatchStore } from "@/store/useBatchStore";
import { ExportEngine, generateStockCSV } from "@/lib/export";
import { ExportSettings } from "./ExportSettings";
import { CSVPreviewModal } from "./CSVPreviewModal";
import type {
  ExportProgress,
  ExportResult,
  ExportSettings as ExportSettingsType,
} from "@/lib/export";

export interface ExportToolbarProps {
  className?: string;
  projectName?: string; // Folder name when inside a folder
}

const slugify = (str: string) =>
  str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function ExportToolbar({ className, projectName }: ExportToolbarProps) {
  const {
    groups,
    marketplace,
    strategy,
    exportSettings,
    updateExportSettings,
    selectedGroupIds,
    selectAllGroups,
  } = useBatchStore();

  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

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
        folderName: projectName, // Folder name for ZIP filename
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
      return `Download ZIP (${totalExportableImages})`;
    }
    return `Download ZIP (${totalExportableImages})`;
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

  const handleCopyAllTags = async () => {
    const allTags = collectAllTags(groupsToExport);
    if (allTags.length === 0) {
      toast.error("No tags to copy");
      return;
    }
    const success = await copyToClipboard(allTags.join(", "));
    if (success) {
      toast.success(`Copied ${allTags.length} tags to clipboard`);
    } else {
      toast.error("Failed to copy tags");
    }
  };

  const handleDownloadAdobeCSV = () => {
    if (groupsToExport.length === 0) {
      toast.error("No groups to export");
      return;
    }

    // Use the new stock-csv generator with full semanticTags support
    // Pass projectName as prefix to handle deduplication
    const csv = generateStockCSV(groupsToExport, marketplace, exportSettings.naming.projectName);

    // Build filename: tagarchitect-[FolderName]-[GroupName].csv
    const firstGroup = groupsToExport[0];
    const groupSlug = firstGroup?.sharedTitle
      ? slugify(firstGroup.sharedTitle)
      : `group-${firstGroup?.groupNumber || 1}`;

    let filename: string;
    if (projectName) {
      filename = `tagarchitect-${slugify(projectName)}-${groupSlug}.csv`;
    } else {
      filename = `tagarchitect-${groupSlug}.csv`;
    }

    downloadString(csv, filename, "text/csv;charset=utf-8");
    toast.success(
      `Exported ${groupsToExport.reduce((sum, g) => sum + g.images.length, 0)} images to CSV`
    );
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Row 1: Quick action buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          onClick={handleCopyAllTags}
          variant="outline"
          size="md"
          title="Copy all tags to clipboard"
          disabled={exportableGroups.length === 0}
        >
          <Copy className="h-4 w-4 mr-1.5" />
          <span className="text-sm">Copy Tags</span>
        </Button>

        <Button
          onClick={handlePreview}
          variant="outline"
          size="md"
          title="Preview Metadata"
          disabled={exportableGroups.length === 0}
        >
          <Eye className="h-4 w-4 mr-1.5" />
          <span className="text-sm">Preview Data</span>
        </Button>

        <Button
          onClick={() => setShowSettings(true)}
          variant="outline"
          size="md"
          title="Export Settings"
        >
          <Settings2 className="h-4 w-4 mr-1.5" />
          <span className="text-sm">Settings</span>
        </Button>
      </div>

      {/* Row 2: Download buttons (full width) */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          onClick={handleDownloadAdobeCSV}
          variant="outline"
          size="md"
          title="Download Adobe Stock CSV"
          disabled={exportableGroups.length === 0}
          className="flex-1 justify-center"
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Download CSV
        </Button>

        <Button
          onClick={handleExport}
          disabled={!canExport}
          isLoading={isExporting}
          variant="primary"
          size="md"
          className="flex-1 justify-center whitespace-nowrap"
        >
          {!isExporting && <Download className="h-4 w-4 mr-2" />}
          {getButtonText()}
        </Button>
      </div>

      {/* Result notification */}
      {showResult && result && (
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
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
