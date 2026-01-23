"use client";

import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RotateCcw, LogIn, LogOut, User, ChevronDown, Coins, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExportToolbar } from "@/components/export";
import { MarketplaceInfo } from "@/components/ui";
import { StrategySelector } from "@/components/dashboard";
import type { MarketplaceType } from "@/store/useBatchStore";

export interface HeaderProps {
  marketplace: MarketplaceType;
  onMarketplaceChange: (marketplace: MarketplaceType) => void;
  onNewBatch: () => void;
  isResetting?: boolean;
}

export function Header({
  marketplace,
  onMarketplaceChange,
  onNewBatch,
  isResetting = false,
}: HeaderProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated" && session?.user;

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Logo + Navigation */}
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">TagArchitect</h1>
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
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <ExportToolbar />

            {/* Batch Settings Group */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-50 border border-slate-200">
              <select
                value={marketplace}
                onChange={(e) => onMarketplaceChange(e.target.value as MarketplaceType)}
                className="rounded-md border border-slate-300 px-2 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 hover:border-slate-400 bg-white"
              >
                <option value="ETSY">Etsy</option>
                <option value="ADOBE_STOCK">Adobe Stock</option>
              </select>
              <MarketplaceInfo marketplace={marketplace} />
              <div className="w-px h-5 bg-slate-300" />
              <StrategySelector />
            </div>

            <button
              onClick={onNewBatch}
              disabled={isResetting}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 hover:border-slate-400 hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none disabled:hover:scale-100"
              title="Start new batch (clears all images)"
            >
              <RotateCcw className={`h-4 w-4 ${isResetting ? "animate-spin" : ""}`} />
              New Batch
            </button>

            {/* Divider */}
            <div className="w-px h-6 bg-slate-200" />

            {/* Credits Badge (visible in header) */}
            {isAuthenticated && session.user.creditsBalance !== undefined && (
              <button
                onClick={() => router.push("/pricing")}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium hover:bg-amber-100 hover:border-amber-300 hover:scale-105 transition-all duration-200"
                title="Buy more credits"
              >
                <Coins className="w-4 h-4" />
                <span className="font-bold">{session.user.creditsBalance}</span>
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

                      {/* Credits - Clickable */}
                      {session.user.creditsBalance !== undefined && (
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            router.push("/pricing");
                          }}
                          className="w-full flex items-center justify-between px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <Coins className="w-4 h-4 text-amber-500" />
                            <span className="text-sm font-medium text-slate-700">Credits</span>
                          </div>
                          <span className="text-sm font-bold text-blue-600 group-hover:text-blue-700">
                            {session.user.creditsBalance}
                          </span>
                        </button>
                      )}

                      {/* Menu Items */}
                      <div className="py-1">
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            router.push("/account");
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          Account Settings
                        </button>
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            signOut({ callbackUrl: "/dashboard" });
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
                  "hover:bg-blue-700 hover:scale-105",
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
