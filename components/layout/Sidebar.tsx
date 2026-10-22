"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  FileCheck2,
  ReceiptText,
  BarChart3,
  Briefcase,
  X,
  Layers,
  LucideIcon,
  Sparkles,
  Contact,
  Banknote,
} from "lucide-react";
import { useSidebar } from "./SidebarContext";
import { cn } from "@/lib/utils";
import NpkrLogo from "../npkr-logo";

export type RoleType = "marketing" | "admin" | "manager" | "MARKETING" | "ADMIN" | "MANAGER";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
}

/**
 * Navigation items defined per role as specified in requirements.
 */
export const ROLE_NAV_ITEMS: Record<string, NavItem[]> = {
  marketing: [
    { title: "Dashboard", href: "/marketing/dashboard", icon: LayoutDashboard },
    { title: "Lead", href: "/marketing/lead", icon: Users },
    { title: "Transaksi", href: "/marketing/transaksi", icon: ReceiptText },
    { title: "Unit", href: "/marketing/unit", icon: Building2 },
    { title: "ITJ", href: "/marketing/itj", icon: FileCheck2 },
    { title: "Laporan", href: "/marketing/laporan", icon: BarChart3 },
  ],
  admin: [
    { title: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { title: "Transaksi", href: "/admin/transaksi", icon: ReceiptText },
    { title: "Manajemen Lead", href: "/admin/lead", icon: Users },
    { title: "Buku Induk Customer", href: "/admin/customer", icon: Contact },
    { title: "Master Unit", href: "/admin/master-unit", icon: Building2 },
  ],
  manager: [
    { title: "Dashboard", href: "/manager/dashboard", icon: LayoutDashboard },
    { title: "Laporan Keuangan", href: "/manager/keuangan", icon: Banknote },
    { title: "Manajemen Lead", href: "/manager/lead", icon: Users },
    { title: "Pantauan Transaksi", href: "/manager/transaksi", icon: ReceiptText },
    { title: "Buku Induk Customer", href: "/manager/customer", icon: Contact },
    { title: "Inventaris Unit", href: "/manager/unit", icon: Building2 },
    { title: "Tim Marketing", href: "/manager/tim", icon: Briefcase },
    { title: "Pusat Laporan", href: "/manager/laporan", icon: BarChart3 },
  ],
};

const ROLE_METADATA: Record<string, { title: string; badge: string; colorClass: string }> = {
  marketing: {
    title: "Marketing Portal",
    badge: "Marketing",
    colorClass: "bg-teal-50 text-teal-700 border-teal-200",
  },
  admin: {
    title: "Admin Portal",
    badge: "Administrator",
    colorClass: "bg-slate-100 text-slate-800 border-slate-200",
  },
  manager: {
    title: "Manager Portal",
    badge: "Manager",
    colorClass: "bg-amber-50 text-amber-800 border-amber-200",
  },
};

interface SidebarProps {
  role?: RoleType;
  className?: string;
}

export function Sidebar({ role, className = "" }: SidebarProps) {
  const pathname = usePathname();
  const { isOpen, close } = useSidebar();

  // Detect role from pathname if not explicitly passed
  const normalizedRole = React.useMemo<string>(() => {
    if (role) return role.toLowerCase();
    if (pathname.startsWith("/admin")) return "admin";
    if (pathname.startsWith("/manager")) return "manager";
    return "marketing";
  }, [role, pathname]);

  const navItems = ROLE_NAV_ITEMS[normalizedRole] || ROLE_NAV_ITEMS.marketing;
  const meta = ROLE_METADATA[normalizedRole] || ROLE_METADATA.marketing;

  // Determine if a navigation link is currently active
  const isLinkActive = (href: string): boolean => {
    if (pathname === href) return true;
    // Highlight root dashboard if at base route
    if (href.endsWith("/dashboard") && (pathname === `/${normalizedRole}` || pathname === `/${normalizedRole}/`)) {
      return true;
    }
    // Sub-routes match if not exactly root
    if (href !== `/${normalizedRole}/dashboard` && pathname.startsWith(href)) {
      return true;
    }
    return false;
  };

  const renderNavContent = () => (
    <>
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-mist shrink-0">
        <Link
          href={`/${normalizedRole}/dashboard`}
          className="flex items-center gap-2.5 focus:outline-none"
        >
          <div className="w-8 h-8 rounded-md flex items-center justify-center font-bold text-sm tracking-wider shadow-subtle">
            <NpkrLogo className="w-6 h-6 text-prism-teal" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm tracking-tight text-carbon-ink">
                NPKR
              </span>
              <span className="text-xs text-slate font-normal">Portal</span>
            </div>
            {/* <span className="text-[10px] text-slate font-medium uppercase tracking-wider">
              {meta.title}
            </span> */}
          </div>
        </Link>

        {/* Mobile close button */}
        <button
          type="button"
          onClick={close}
          className="md:hidden p-1.5 rounded-md text-slate hover:text-graphite hover:bg-bone transition-colors"
          aria-label="Tutup menu navigasi"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Role Pill info */}
      {/* <div className="px-5 py-3 border-b border-mist/60 bg-bone/30">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate uppercase tracking-wider">
            Hak Akses
          </span>
          <span
            className={cn(
              "text-[11px] font-semibold px-2 py-0.5 rounded-md border",
              meta.colorClass
            )}
          >
            {meta.badge}
          </span>
        </div>
      </div> */}

      {/* Navigation List */}
      <nav
        aria-label="Navigasi Utama"
        className="flex-1 px-3 py-4 space-y-1 overflow-y-auto"
      >
        <div className="px-3 pb-2">
          <span className="text-[10px] font-semibold text-fog uppercase tracking-wider">
            Menu Utama
          </span>
        </div>

        {navItems.map((item) => {
          const active = isLinkActive(item.href);
          const IconComponent = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={close}
              className={cn(
                "group relative flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                active
                  ? "bg-teal-50/80 text-deep-teal font-semibold shadow-xs"
                  : "text-slate hover:text-graphite hover:bg-bone"
              )}
            >
              {/* Subtle active indicator bar */}
              {active && (
                <span
                  className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-prism-teal rounded-r"
                  aria-hidden="true"
                />
              )}

              <IconComponent
                className={cn(
                  "w-[18px] h-[18px] shrink-0 transition-colors",
                  active
                    ? "text-prism-teal"
                    : "text-steel group-hover:text-graphite"
                )}
                aria-hidden="true"
              />

              <span className="truncate">{item.title}</span>

              {item.badge !== undefined && (
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-bone text-graphite font-semibold">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer System Status */}
      <div className="p-4 border-t border-mist shrink-0 bg-bone/20">
        <div className="flex items-center gap-2 text-xs text-slate">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium text-graphite">Sistem Online</span>
          <span className="text-[10px] text-fog ml-auto font-mono">v1.0.0</span>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* 1. Desktop Static Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col w-64 border-r border-mist bg-white h-screen sticky top-0 shrink-0 z-20",
          className
        )}
      >
        {renderNavContent()}
      </aside>

      {/* 2. Mobile Responsive Drawer Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Menu Navigasi Mobile"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={close}
            aria-hidden="true"
          />

          {/* Drawer Menu */}
          <aside className="relative flex flex-col w-72 max-w-[85vw] bg-white h-full shadow-2xl border-r border-mist z-10 animate-in slide-in-from-left duration-200">
            {renderNavContent()}
          </aside>
        </div>
      )}
    </>
  );
}
