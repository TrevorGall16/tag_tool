"use client";

import { Layers } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui";

export interface ClusterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  imageCount: number;
}

export function ClusterDialog({ isOpen, onClose, onConfirm, imageCount }: ClusterDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-600" />
            Cluster with AI
          </AlertDialogTitle>
          <AlertDialogDescription>
            Cluster {imageCount} image{imageCount !== 1 ? "s" : ""} into groups using AI? This is
            free and does not use any credits.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Layers className="h-4 w-4 mr-2" />
            Run Clustering
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
