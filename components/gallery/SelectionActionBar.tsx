"use client";

import { useState, useEffect, useRef } from "react";
import { FolderInput, Archive, X, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useBatchStore } from "@/store/useBatchStore";

interface Project {
  id: string;
  name: string;
}

export interface SelectionActionBarProps {
  projects: Project[];
  onMoveToFolder?: (projectId: string) => void;
  onArchive?: () => void;
  className?: string;
}

export function SelectionActionBar({
  projects,
  onMoveToFolder,
  onArchive,
  className,
}: SelectionActionBarProps) {
  const { selectedGroupIds, deselectAllGroups } = useBatchStore();
  const [showFolderDropdown, setShowFolderDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedCount = selectedGroupIds.size;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowFolderDropdown(false);
      }
    };

    if (showFolderDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showFolderDropdown]);

  // Don't render if nothing selected
  if (selectedCount === 0) return null;

  const handleMoveToFolder = (projectId: string, projectName: string) => {
    onMoveToFolder?.(projectId);
    setShowFolderDropdown(false);
    toast.success(`Moved ${selectedCount} group(s) to "${projectName}"`);
  };

  const handleArchive = () => {
    onArchive?.();
    toast.success(`Archived ${selectedCount} group(s)`);
  };

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
        "bg-slate-900 text-white rounded-xl shadow-2xl",
        "flex items-center gap-3 px-4 py-3",
        "animate-in slide-in-from-bottom-4 duration-300",
        className
      )}
    >
      {/* Selection count */}
      <span className="text-sm font-medium text-slate-300">{selectedCount} selected</span>

      <div className="w-px h-6 bg-slate-700" />

      {/* Move to Folder */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowFolderDropdown(!showFolderDropdown)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-sm font-medium"
        >
          <FolderInput className="h-4 w-4" />
          Move to Folder
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", showFolderDropdown && "rotate-180")}
          />
        </button>

        {showFolderDropdown && (
          <div className="absolute bottom-full mb-2 left-0 min-w-[200px] bg-white rounded-lg shadow-xl border border-slate-200 py-1 text-slate-900">
            {projects.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-500">No folders available</div>
            ) : (
              projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleMoveToFolder(project.id, project.name)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 transition-colors"
                >
                  {project.name}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Archive */}
      <button
        onClick={handleArchive}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 transition-colors text-sm font-medium"
      >
        <Archive className="h-4 w-4" />
        Archive
      </button>

      <div className="w-px h-6 bg-slate-700" />

      {/* Clear selection */}
      <button
        onClick={deselectAllGroups}
        className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors text-slate-400 hover:text-white"
        title="Clear selection"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
