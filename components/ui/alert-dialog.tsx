"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function AlertDialog({ open, onOpenChange, children }: AlertDialogProps) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in-0"
        onClick={() => onOpenChange(false)}
      />
      {/* Content */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-in fade-in-0 zoom-in-95">
        {children}
      </div>
    </div>
  );
}

interface AlertDialogContentProps {
  className?: string;
  children: React.ReactNode;
}

export function AlertDialogContent({ className, children }: AlertDialogContentProps) {
  return (
    <div
      className={cn(
        "w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 p-6",
        className
      )}
    >
      {children}
    </div>
  );
}

interface AlertDialogHeaderProps {
  className?: string;
  children: React.ReactNode;
}

export function AlertDialogHeader({ className, children }: AlertDialogHeaderProps) {
  return <div className={cn("space-y-2", className)}>{children}</div>;
}

interface AlertDialogTitleProps {
  className?: string;
  children: React.ReactNode;
}

export function AlertDialogTitle({ className, children }: AlertDialogTitleProps) {
  return <h2 className={cn("text-xl font-semibold text-slate-900", className)}>{children}</h2>;
}

interface AlertDialogDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

export function AlertDialogDescription({ className, children }: AlertDialogDescriptionProps) {
  return <p className={cn("text-slate-600", className)}>{children}</p>;
}

interface AlertDialogFooterProps {
  className?: string;
  children: React.ReactNode;
}

export function AlertDialogFooter({ className, children }: AlertDialogFooterProps) {
  return (
    <div className={cn("mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3", className)}>
      {children}
    </div>
  );
}

interface AlertDialogActionProps {
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
  variant?: "default" | "destructive" | "outline";
}

export function AlertDialogAction({
  className,
  onClick,
  children,
  variant = "default",
}: AlertDialogActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center px-4 py-2.5 rounded-lg font-medium transition-colors",
        variant === "default" && "bg-blue-600 text-white hover:bg-blue-700",
        variant === "destructive" && "bg-red-600 text-white hover:bg-red-700",
        variant === "outline" &&
          "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
        className
      )}
    >
      {children}
    </button>
  );
}

interface AlertDialogCancelProps {
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
}

export function AlertDialogCancel({ className, onClick, children }: AlertDialogCancelProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center px-4 py-2.5 rounded-lg font-medium",
        "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors",
        className
      )}
    >
      {children}
    </button>
  );
}
