"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  FileCheck2,
  BarChart3,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

const MARKETING_BOTTOM_ITEMS: BottomNavItem[] = [
  { title: "Dashboard", href: "/marketing/dashboard", icon: LayoutDashboard },
  { title: "Lead", href: "/marketing/lead", icon: Users },
  { title: "Unit", href: "/marketing/unit", icon: Building2 },
  { title: "ITJ", href: "/marketing/transaksi", icon: FileCheck2 },
  // { title: "Laporan", href: "/marketing/laporan", icon: BarChart3 },
];

export function BottomNav() {
  const pathname = usePathname();

  // Only render for marketing base routes on mobile
  if (!pathname.startsWith("/marketing")) {
    return null;
  }

  const isItemActive = (href: string): boolean => {
    if (pathname === href) return true;
    if (href === "/marketing/dashboard" && (pathname === "/marketing" || pathname === "/marketing/")) {
      return true;
    }
    if (href !== "/marketing/dashboard" && pathname.startsWith(href)) {
      return true;
    }
    return false;
  };

  return (
    <nav
      aria-label="Navigasi Bawah Mobile"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-mist h-16 flex items-center justify-around px-1 shadow-[0_-2px_10px_rgba(0,0,0,0.03)]"
    >
      {MARKETING_BOTTOM_ITEMS.map((item) => {
        const active = isItemActive(item.href);
        const IconComponent = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-colors relative",
              active
                ? "text-deep-teal font-semibold"
                : "text-slate hover:text-graphite"
            )}
          >
            {active && (
              <span
                className="absolute top-0 w-8 h-0.5 bg-prism-teal rounded-b-full"
                aria-hidden="true"
              />
            )}
            <IconComponent
              className={cn(
                "w-5 h-5 mb-1 transition-transform",
                active ? "text-prism-teal scale-105" : "text-steel"
              )}
              aria-hidden="true"
            />
            <span className="text-[10px] leading-tight truncate max-w-[64px]">
              {item.title}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
