"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { FolderOpen, FolderPlus, Trash2, ChevronRight, Loader2, Archive } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SidebarSearch } from "./SidebarSearch";

// Helper component to highlight matching text
function HighlightedText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) return <>{text}</>;

  const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-amber-200 text-inherit rounded px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

export interface Project {
  id: string;
  name: string;
  batchCount: number;
  createdAt: string;
}

export interface ProjectListProps {
  selectedProjectId: string | null;
  onSelectProject: (projectId: string | null) => void;
  showArchived: boolean;
  onToggleArchived: () => void;
  className?: string;
}

export function ProjectList({
  selectedProjectId,
  onSelectProject,
  showArchived,
  onToggleArchived,
  className,
}: ProjectListProps) {
  const { status } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const isAuthenticated = status === "authenticated";

  // Filter projects based on search query
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const query = searchQuery.toLowerCase();
    return projects.filter((project) => project.name.toLowerCase().includes(query));
  }, [projects, searchQuery]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProjects();
    }
  }, [isAuthenticated]);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (data.success) {
        setProjects(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    setIsCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProjectName.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setProjects([data.data, ...projects]);
        setNewProjectName("");
        setShowNewModal(false);
        toast.success(`Created project "${data.data.name}"`);
      } else {
        toast.error(data.error || "Failed to create project");
      }
    } catch (err) {
      toast.error("Failed to create project");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (!confirm(`Delete "${projectName}" and unlink all its batches?`)) return;

    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setProjects(projects.filter((p) => p.id !== projectId));
        if (selectedProjectId === projectId) {
          onSelectProject(null);
        }
        toast.success(`Deleted project "${projectName}"`);
      } else {
        toast.error(data.error || "Failed to delete project");
      }
    } catch (err) {
      toast.error("Failed to delete project");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className={cn("p-4", className)}>
        <p className="text-sm text-slate-500 text-center">
          Sign in to organize batches into projects
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-900">Projects</h3>
          <button
            onClick={() => setShowNewModal(true)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="New Project"
          >
            <FolderPlus className="h-4 w-4" />
          </button>
        </div>

        {/* Search Bar */}
        <SidebarSearch
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search projects..."
          className="mb-3"
        />

        {/* Quick Filters */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              onSelectProject(null);
              // Also turn off archived view when clicking "All Batches"
              if (showArchived) {
                onToggleArchived();
              }
            }}
            className={cn(
              "flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
              selectedProjectId === null && !showArchived
                ? "bg-blue-100 text-blue-700"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            All Batches
          </button>
          <button
            onClick={onToggleArchived}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
              showArchived
                ? "bg-amber-100 text-amber-700"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            <Archive className="h-3 w-3" />
            Archived
          </button>
        </div>
      </div>

      {/* Project List */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-8">
            <FolderOpen className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No projects yet</p>
            <button
              onClick={() => setShowNewModal(true)}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Create your first project
            </button>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-8">
            <FolderOpen className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No projects match "{searchQuery}"</p>
            <button
              onClick={() => setSearchQuery("")}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className={cn(
                  "group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors",
                  selectedProjectId === project.id
                    ? "bg-blue-50 text-blue-700"
                    : "hover:bg-slate-100 text-slate-700"
                )}
                onClick={() => onSelectProject(project.id)}
              >
                <FolderOpen
                  className={cn(
                    "h-4 w-4 shrink-0",
                    selectedProjectId === project.id ? "text-blue-500" : "text-slate-400"
                  )}
                />
                <span className="flex-1 text-sm font-medium truncate">
                  <HighlightedText text={project.name} highlight={searchQuery} />
                </span>
                <span className="text-xs text-slate-400">{project.batchCount}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteProject(project.id, project.name);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <ChevronRight
                  className={cn(
                    "h-4 w-4 shrink-0 transition-transform",
                    selectedProjectId === project.id ? "text-blue-500" : "text-slate-300"
                  )}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Project Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">New Project</h3>
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Project name..."
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateProject();
                if (e.key === "Escape") setShowNewModal(false);
              }}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowNewModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim() || isCreating}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
