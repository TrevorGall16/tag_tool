"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  FolderInput,
  FolderOpen,
  FolderPlus,
  ChevronDown,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { StrategySelector } from "@/components/dashboard";
import { ExportToolbar } from "@/components/export";
import { useBatchStore } from "@/store/useBatchStore";

interface Project {
  id: string;
  name: string;
  batchCount: number;
}

export interface BatchToolbarProps {
  className?: string;
  selectedProjectId?: string | null;
  folderName?: string;
}

export function BatchToolbar({ className, selectedProjectId, folderName }: BatchToolbarProps) {
  const { status } = useSession();
  const { groups } = useBatchStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isArchived, setIsArchived] = useState(false);
  const [showNewProjectInput, setShowNewProjectInput] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const projectMenuRef = useRef<HTMLDivElement>(null);
  const newProjectInputRef = useRef<HTMLInputElement>(null);

  const isAuthenticated = status === "authenticated";
  const hasContent = groups.some((g) => g.id !== "unclustered" && g.images.length > 0);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProjects();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectMenuRef.current && !projectMenuRef.current.contains(event.target as Node)) {
        setIsProjectMenuOpen(false);
      }
    };

    if (isProjectMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isProjectMenuOpen]);

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (data.success) {
        setProjects(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    }
  };

  const handleMoveToProject = async (projectId: string | null) => {
    setCurrentProjectId(projectId);
    setIsProjectMenuOpen(false);

    const projectName = projectId
      ? projects.find((p) => p.id === projectId)?.name || "project"
      : "No Project";

    toast.success(`Batch assigned to "${projectName}"`);
    // In a full implementation, this would update the batch's projectId in the database
  };

  const handleToggleArchive = () => {
    setIsArchived(!isArchived);
    toast.success(isArchived ? "Batch restored from archive" : "Batch archived");
    // In a full implementation, this would update the batch's isArchived in the database
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    setIsCreatingProject(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProjectName.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        // Add new project to list and select it
        setProjects((prev) => [data.data, ...prev]);
        setCurrentProjectId(data.data.id);
        toast.success(`Created and moved to "${data.data.name}"`);
        setNewProjectName("");
        setShowNewProjectInput(false);
        setIsProjectMenuOpen(false);
      } else {
        toast.error(data.error || "Failed to create project");
      }
    } catch (err) {
      toast.error("Failed to create project");
    } finally {
      setIsCreatingProject(false);
    }
  };

  // Focus input when showing new project input
  useEffect(() => {
    if (showNewProjectInput && newProjectInputRef.current) {
      newProjectInputRef.current.focus();
    }
  }, [showNewProjectInput]);

  if (!hasContent) {
    return null;
  }

  const currentProject = projects.find((p) => p.id === currentProjectId);

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 px-4 py-3 bg-white rounded-xl border border-slate-200 shadow-sm",
        className
      )}
    >
      {/* Left: Strategy Selector + Project Assignment */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-500">Strategy:</span>
          <StrategySelector />
        </div>

        {/* Project Selector - Only for authenticated users */}
        {isAuthenticated && (
          <>
            <div className="w-px h-6 bg-slate-200" />
            <div className="relative" ref={projectMenuRef}>
              <button
                onClick={() => setIsProjectMenuOpen(!isProjectMenuOpen)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 bg-white",
                  "text-sm font-medium text-slate-700",
                  "hover:border-slate-400 hover:bg-slate-50",
                  "transition-all duration-150"
                )}
              >
                <FolderInput className="h-4 w-4 text-slate-400" />
                <span className="max-w-[120px] truncate">
                  {currentProject?.name || "Move to Folder"}
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-slate-400 transition-transform",
                    isProjectMenuOpen && "rotate-180"
                  )}
                />
              </button>

              {isProjectMenuOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
                  {/* Create New Project */}
                  {showNewProjectInput ? (
                    <div className="px-3 py-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <input
                          ref={newProjectInputRef}
                          type="text"
                          value={newProjectName}
                          onChange={(e) => setNewProjectName(e.target.value)}
                          placeholder="Folder name..."
                          className="flex-1 px-2 py-1.5 text-sm text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleCreateProject();
                            if (e.key === "Escape") {
                              setShowNewProjectInput(false);
                              setNewProjectName("");
                            }
                          }}
                          disabled={isCreatingProject}
                        />
                        <button
                          onClick={handleCreateProject}
                          disabled={!newProjectName.trim() || isCreatingProject}
                          className="px-2 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isCreatingProject ? "..." : "Add"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowNewProjectInput(true)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-blue-600 hover:bg-blue-50 transition-colors border-b border-slate-100"
                    >
                      <FolderPlus className="h-4 w-4" />
                      <span className="font-medium">Create New Folder</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleMoveToProject(null)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-900",
                      "hover:bg-slate-50 transition-colors",
                      !currentProjectId && "bg-blue-50 text-blue-700"
                    )}
                  >
                    <FolderOpen className="h-4 w-4 text-slate-400" />
                    <span>No Folder</span>
                  </button>

                  {projects.length > 0 && <div className="border-t border-slate-100 my-1" />}

                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => handleMoveToProject(project.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-900",
                        "hover:bg-slate-50 transition-colors",
                        currentProjectId === project.id && "bg-blue-50 text-blue-700"
                      )}
                    >
                      <FolderOpen
                        className={cn(
                          "h-4 w-4",
                          currentProjectId === project.id ? "text-blue-500" : "text-slate-400"
                        )}
                      />
                      <span className="flex-1 truncate">{project.name}</span>
                      <span className="text-xs text-slate-400">{project.batchCount}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Archive Button */}
            <button
              onClick={handleToggleArchive}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors",
                isArchived
                  ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                  : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-400"
              )}
              title={isArchived ? "Restore from archive" : "Archive batch"}
            >
              {isArchived ? (
                <ArchiveRestore className="h-4 w-4" />
              ) : (
                <Archive className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">{isArchived ? "Restore" : "Archive"}</span>
            </button>
          </>
        )}
      </div>

      {/* Right: Export Tools */}
      <ExportToolbar projectName={folderName || currentProject?.name} />
    </div>
  );
}
