"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  isLoading = false,
}: ConfirmationModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === dialogRef.current && !isLoading) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && !isLoading) {
      onClose();
    }
  };

  const variantStyles = {
    danger: {
      icon: "bg-red-100 text-red-600",
      button: "bg-red-600 hover:bg-red-700 focus:ring-red-500",
    },
    warning: {
      icon: "bg-amber-100 text-amber-600",
      button: "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500",
    },
    info: {
      icon: "bg-blue-100 text-blue-600",
      button: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
    },
  };

  const styles = variantStyles[variant];

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      onClose={onClose}
      className={cn(
        "w-full max-w-md p-0 rounded-2xl bg-white shadow-lg",
        "backdrop:bg-black/50 backdrop:backdrop-blur-sm",
        "animate-in fade-in zoom-in-95 duration-200"
      )}
    >
      <div className="p-6">
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className={cn(
            "absolute top-4 right-4 p-1.5 rounded-lg",
            "text-slate-400 hover:text-slate-600 hover:bg-slate-100",
            "transition-colors disabled:opacity-50"
          )}
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className={cn("p-3 rounded-full", styles.icon)}>
            <AlertTriangle className="h-6 w-6" />
          </div>
        </div>

        {/* Content */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">{title}</h2>
          <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className={cn(
              "flex-1 px-4 py-2.5 rounded-xl",
              "border border-slate-300 bg-white text-slate-700 font-medium",
              "hover:bg-slate-50 hover:border-slate-400",
              "transition-all duration-200 hover:scale-105",
              "focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2",
              "disabled:opacity-50 disabled:hover:scale-100"
            )}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              "flex-1 px-4 py-2.5 rounded-xl",
              "text-white font-medium",
              styles.button,
              "transition-all duration-200 hover:scale-105",
              "focus:outline-none focus:ring-2 focus:ring-offset-2",
              "disabled:opacity-50 disabled:hover:scale-100",
              isLoading && "cursor-wait"
            )}
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Processing...
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </dialog>
  );
}
