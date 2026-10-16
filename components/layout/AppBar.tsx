"use client";

import React, { useState, useRef, useEffect, useTransition } from "react";
import Image from "next/image";
import {
  Menu,
  ChevronDown,
  LogOut,
  User as UserIcon,
  Shield,
  Loader2,
  Layers,
} from "lucide-react";
import { useSidebar } from "./SidebarContext";
import { Breadcrumb } from "./Breadcrumb";
import { logoutAction } from "@/actions/auth.action";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export interface AuthUser {
  id?: string | number;
  name?: string | null;
  nama?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string | null;
  no_hp?: string | null;
}

interface AppBarProps {
  user?: AuthUser | null;
  role?: string;
  className?: string;
}

export function AppBar({ user, role, className = "" }: AppBarProps) {
  const { toggle } = useSidebar();
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown on outside click or escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDropdownOpen(false);
      }
    }

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dropdownOpen]);

  // Resolve display name and role
  const displayName = user?.name || user?.nama || "Pengguna Portal";
  const displayRole = (user?.role || role || "USER").toUpperCase();
  const userInitials = displayName
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "NP";

  const handleLogout = () => {
    startTransition(async () => {
      try {
        await logoutAction();
      } catch (error: unknown) {
        // Fallback redirection if server action triggers redirect
        router.push("/login");
      }
    });
  };

  const getRoleBadgeColor = (roleStr: string) => {
    switch (roleStr) {
      case "MARKETING":
        return "bg-teal-50 text-teal-700 border-teal-200";
      case "ADMIN":
        return "bg-slate-100 text-slate-800 border-slate-200";
      case "MANAGER":
        return "bg-amber-50 text-amber-800 border-amber-200";
      default:
        return "bg-bone text-graphite border-mist";
    }
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-mist bg-white/95 backdrop-blur-xs px-4 md:px-6 shrink-0 shadow-subtle",
        className
      )}
    >
      {/* Left Area: Mobile Menu Toggle & Dynamic Breadcrumb */}
      <div className="flex items-center gap-3 md:gap-4 min-w-0">
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={toggle}
          className="p-2 -ml-1.5 rounded-md text-graphite hover:bg-bone transition-colors md:hidden focus:outline-none focus:ring-2 focus:ring-prism-teal/20"
          aria-label="Buka menu navigasi"
        >
          <Menu className="w-5 h-5 text-graphite" />
        </button>

        {/* Mobile brand monogram (only on small screens where sidebar is hidden) */}
        <div className="flex md:hidden items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-carbon-ink text-white flex items-center justify-center font-bold text-xs shadow-subtle">
            <Layers className="w-3.5 h-3.5 text-prism-teal" />
          </div>
          <span className="font-semibold text-sm text-carbon-ink tracking-tight">
            NPKR
          </span>
        </div>

        {/* Breadcrumb Navigation on Tablet and Desktop */}
        <div className="hidden sm:block min-w-0">
          <Breadcrumb />
        </div>
      </div>

      {/* Right Area: Role Badge & Dynamic User Profile Dropdown */}
      <div className="flex items-center gap-3">
        {/* Dynamic Role Badge */}
        {/* <span
          className={cn(
            "hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border tracking-wide",
            getRoleBadgeColor(displayRole)
          )}
        >
          <Shield className="w-3 h-3" />
          {displayRole}
        </span> */}

        {/* User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
            aria-label="Menu profil pengguna"
            className="flex items-center gap-2 p-1.5 rounded-md text-graphite hover:bg-bone transition-colors focus:outline-none focus:ring-2 focus:ring-prism-teal/20"
          >
            {/* User Avatar */}
            {user?.image ? (
              <div className="relative w-8 h-8 rounded-full overflow-hidden border border-mist">
                <Image
                  src={user.image}
                  alt={displayName}
                  width={32}
                  height={32}
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-bone text-graphite border border-mist flex items-center justify-center font-semibold text-xs text-carbon-ink tracking-wider shadow-subtle">
                {userInitials}
              </div>
            )}

            {/* User Name & Mini Role on Desktop */}
            <div className="hidden md:flex flex-col text-left leading-tight">
              <span className="text-xs font-semibold text-graphite truncate max-w-[130px]">
                {displayName}
              </span>
              <span className="text-[10px] text-slate font-medium">
                {displayRole}
              </span>
            </div>

            <ChevronDown
              className={cn(
                "w-3.5 h-3.5 text-slate transition-transform duration-200",
                dropdownOpen && "rotate-180"
              )}
            />
          </button>

          {/* Dropdown Menu Popover */}
          {dropdownOpen && (
            <div
              className="absolute right-0 mt-2 w-64 rounded-lg bg-white border border-mist shadow-lg py-1 z-50 animate-in fade-in-50 zoom-in-95 duration-150"
              role="menu"
              aria-orientation="vertical"
            >
              {/* Profile Details Header */}
              <div className="px-4 py-3 border-b border-mist bg-bone/30">
                <p className="text-xs font-semibold text-graphite truncate">
                  {displayName}
                </p>
                {user?.email && (
                  <p className="text-[11px] text-slate truncate mt-0.5">
                    {user.email}
                  </p>
                )}
                {user?.no_hp && (
                  <p className="text-[11px] text-slate font-mono mt-0.5">
                    {user.no_hp}
                  </p>
                )}
                <div className="mt-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border",
                      getRoleBadgeColor(displayRole)
                    )}
                  >
                    Role: {displayRole}
                  </span>
                </div>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <div className="px-4 py-2 text-xs text-slate flex items-center gap-2">
                  <UserIcon className="w-3.5 h-3.5 text-steel" />
                  <span>Sesi Aktif</span>
                  <span className="ml-auto w-2 h-2 rounded-full bg-emerald-500" />
                </div>
              </div>

              <div className="border-t border-mist my-1" />

              {/* Sign Out Button */}
              <div className="p-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isPending}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 rounded-md hover:bg-rose-50 transition-colors disabled:opacity-50"
                  role="menuitem"
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogOut className="w-4 h-4" />
                  )}
                  <span>{isPending ? "Sedang keluar..." : "Keluar / Logout"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
