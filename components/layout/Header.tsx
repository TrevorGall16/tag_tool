"use client";

import { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  RotateCcw,
  LogIn,
  LogOut,
  User,
  ChevronDown,
  Coins,
  Settings,
  HelpCircle,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCredits, setCreditsRefreshCallback } from "@/hooks/useCredits";
import { useBatchStore } from "@/store/useBatchStore";

export interface HeaderProps {
  onNewBatch: () => void;
  isResetting?: boolean;
  onHelpClick?: () => void;
}

export function Header({ onNewBatch, isResetting = false, onHelpClick }: HeaderProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { balance: creditsBalance, refresh: refreshCredits } = useCredits();
  const clearStore = useBatchStore((state) => state.clearStore);

  // Register the refresh callback for global use (e.g., after payments)
  useEffect(() => {
    setCreditsRefreshCallback(refreshCredits);
  }, [refreshCredits]);

  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated" && session?.user;

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Logo + Navigation */}
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-2xl font-bold text-slate-900 tracking-tight hover:text-slate-700 transition-colors"
            >
              VisionBatch
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/dashboard"
                className="px-3 py-2 text-sm font-medium text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/pricing"
                className="px-3 py-2 text-sm font-medium text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="/guide"
                className="px-3 py-2 text-sm font-medium text-slate-700 rounded-lg hover:bg-slate-100 transition-colors inline-flex items-center gap-1.5"
              >
                <BookOpen className="h-4 w-4" />
                Guide
              </Link>
            </nav>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {onHelpClick && (
              <button
                onClick={onHelpClick}
                className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                title="How it works"
              >
                <HelpCircle className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={onNewBatch}
              disabled={isResetting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 hover:border-slate-400 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none"
              title="Start new batch (clears all images)"
            >
              <RotateCcw className={`h-4 w-4 ${isResetting ? "animate-spin" : ""}`} />
              New Batch
            </button>

            {/* Credits Badge - Live updating, links to account history */}
            {isAuthenticated && (
              <button
                onClick={() => router.push(creditsBalance === 0 ? "/pricing" : "/account")}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium hover:bg-amber-100 hover:border-amber-300 transition-all duration-200"
                title={creditsBalance === 0 ? "Buy credits" : "View credit history"}
              >
                <Coins className="w-4 h-4" />
                <span className="font-bold">{creditsBalance}</span>
              </button>
            )}

            {/* Auth Section */}
            {isLoading ? (
              <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
            ) : isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || "User"}
                      className="w-8 h-8 rounded-full border border-slate-200"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                  )}
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-slate-500 transition-transform",
                      showUserMenu && "rotate-180"
                    )}
                  />
                </button>

                {/* User Dropdown Menu */}
                {showUserMenu && (
                  <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                    {/* Menu */}
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50">
                      {/* User Info */}
                      <div className="px-4 py-3 border-b border-slate-100">
                        <p className="font-medium text-slate-900 truncate">
                          {session.user.name || "User"}
                        </p>
                        <p className="text-sm text-slate-500 truncate">{session.user.email}</p>
                      </div>

                      {/* Credits - Clickable (Live updating) */}
                      <Link
                        href="/pricing"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center justify-between px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <Coins className="w-4 h-4 text-amber-500" />
                          <span className="text-sm font-medium text-slate-700">Credits</span>
                        </div>
                        <span className="text-sm font-bold text-blue-600 group-hover:text-blue-700">
                          {creditsBalance}
                        </span>
                      </Link>

                      {/* Menu Items */}
                      <div className="py-1">
                        <Link
                          href="/account"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          Account Settings
                        </Link>
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            clearStore(); // Clear all local data before signing out
                            signOut({ callbackUrl: "/" });
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={() => signIn()}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-lg",
                  "bg-blue-600 text-white text-sm font-medium",
                  "hover:bg-blue-700",
                  "transition-all duration-200",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                )}
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
