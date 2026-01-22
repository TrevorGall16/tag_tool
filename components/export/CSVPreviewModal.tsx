"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LocalGroup } from "@/store/useBatchStore";

export interface CSVPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: LocalGroup[];
}

interface PreviewRow {
  filename: string;
  title: string;
  tags: string;
  group: string;
}

export function CSVPreviewModal({ isOpen, onClose, groups }: CSVPreviewModalProps) {
  if (!isOpen) return null;

  // Build preview rows from groups
  const rows: PreviewRow[] = [];
  for (const group of groups) {
    for (const image of group.images) {
      const title = image.userTitle || group.sharedTitle || image.aiTitle || "";
      const tags = (image.userTags || group.sharedTags || image.aiTags || []).join(", ");
      rows.push({
        filename: image.originalFilename,
        title,
        tags,
        group: group.sharedTitle || `Group ${group.groupNumber}`,
      });
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
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

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
                    Filename
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
                    <td className="p-2 text-slate-900 font-mono text-xs truncate max-w-[150px]">
                      {row.filename}
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
          <p className="text-sm text-slate-500">
            This data will be exported to{" "}
            <code className="bg-slate-200 px-1 rounded">metadata.csv</code>
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
