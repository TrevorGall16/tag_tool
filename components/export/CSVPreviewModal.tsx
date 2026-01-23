"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildNamingContext, generateExportFilename } from "@/lib/export";
import type { LocalGroup } from "@/store/useBatchStore";
import type { ExportSettings } from "@/lib/export";

export interface CSVPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: LocalGroup[];
  exportSettings: ExportSettings;
}

interface PreviewRow {
  filename: string;
  exportFilename: string;
  title: string;
  tags: string;
  group: string;
}

/**
 * Merge image tags with global tags, avoiding duplicates
 */
function mergeWithGlobalTags(imageTags: string[], globalTags: string[]): string[] {
  if (globalTags.length === 0) return imageTags;

  const tagSet = new Set(imageTags.map((t) => t.toLowerCase()));
  const mergedTags = [...imageTags];

  for (const globalTag of globalTags) {
    if (!tagSet.has(globalTag.toLowerCase())) {
      mergedTags.push(globalTag);
      tagSet.add(globalTag.toLowerCase());
    }
  }

  return mergedTags;
}

export function CSVPreviewModal({ isOpen, onClose, groups, exportSettings }: CSVPreviewModalProps) {
  if (!isOpen) return null;

  const globalTags = exportSettings.globalTags || [];

  // Build preview rows from groups with formatted export names
  const rows: PreviewRow[] = [];
  let sequenceNumber = 1;

  for (const group of groups) {
    for (const image of group.images) {
      // Title priority: user-edited title > AI-generated title (NOT group name)
      const title = image.userTitle || image.aiTitle || "";
      // Tags priority: user-edited tags > group shared tags > AI-generated tags
      const baseTags = image.userTags || group.sharedTags || image.aiTags || [];
      const mergedTags = mergeWithGlobalTags(baseTags, globalTags);
      const tags = mergedTags.join(", ");

      // Generate the export filename using naming utilities
      const context = buildNamingContext(
        exportSettings.naming,
        sequenceNumber,
        image.originalFilename
      );
      const ext = image.originalFilename.split(".").pop() || "jpg";
      const exportFilename = generateExportFilename(exportSettings.naming.pattern, context, ext);

      rows.push({
        filename: image.originalFilename,
        exportFilename,
        title,
        tags,
        group: group.sharedTitle || `Group ${group.groupNumber}`,
      });
      sequenceNumber++;
    }
  }

  const totalImages = rows.length;
  const totalGroups = groups.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="CSV Preview"
    >
      {/* Backdrop - use onMouseDown to prevent closing when drag ends outside modal */}
      <div className="absolute inset-0 bg-black/50" onMouseDown={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Metadata Preview</h2>
            <p className="text-sm text-slate-500">
              {totalImages} images from {totalGroups} groups
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Table Container */}
        <div className="flex-1 overflow-auto p-4">
          {rows.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p>No images to preview.</p>
              <p className="text-sm mt-1">Select groups with tagged images to see the preview.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  <th className="text-left p-2 font-medium text-slate-700 border-b border-slate-200">
                    Export Filename
                  </th>
                  <th className="text-left p-2 font-medium text-slate-700 border-b border-slate-200">
                    Title
                  </th>
                  <th className="text-left p-2 font-medium text-slate-700 border-b border-slate-200">
                    Tags
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={i}
                    className={cn(
                      "border-b border-slate-100",
                      i % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                    )}
                  >
                    <td
                      className="p-2 text-slate-900 font-mono text-xs truncate max-w-[200px]"
                      title={row.filename}
                    >
                      {row.exportFilename}
                    </td>
                    <td className="p-2 text-slate-700 truncate max-w-[200px]">
                      {row.title || <span className="text-slate-400 italic">No title</span>}
                    </td>
                    <td className="p-2 text-slate-600">
                      {row.tags ? (
                        <div className="flex flex-wrap gap-1">
                          {row.tags
                            .split(", ")
                            .slice(0, 5)
                            .map((tag, j) => (
                              <span
                                key={j}
                                className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-600 text-xs rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          {row.tags.split(", ").length > 5 && (
                            <span className="text-xs text-slate-400">
                              +{row.tags.split(", ").length - 5} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No tags</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
          <div className="text-sm text-slate-500">
            <p>
              This data will be exported to{" "}
              <code className="bg-slate-200 px-1 rounded">metadata.csv</code>
            </p>
            {globalTags.length > 0 && (
              <p className="mt-1 text-xs">
                <span className="inline-block px-1.5 py-0.5 bg-green-100 text-green-700 rounded mr-1">
                  +{globalTags.length} global
                </span>
                tags will be appended to all images
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors hover:scale-105 transition-transform"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
