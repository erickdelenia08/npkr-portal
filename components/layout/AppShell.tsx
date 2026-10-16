"use client";

import React from "react";
import { SidebarProvider } from "./SidebarContext";
import { Sidebar, RoleType } from "./Sidebar";
import { AppBar, AuthUser } from "./AppBar";
import { BottomNav } from "./BottomNav";
import { Breadcrumb } from "./Breadcrumb";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
  role: RoleType;
  user?: AuthUser | null;
  className?: string;
  showMobileBreadcrumb?: boolean;
}

export function AppShell({
  children,
  role,
  user,
  className = "",
  showMobileBreadcrumb = true,
}: AppShellProps) {
  const isMarketing = String(role).toUpperCase() === "MARKETING";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex bg-paper text-graphite">
        {/* Responsive Sidebar (Desktop aside & Mobile drawer) */}
        <Sidebar role={role} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top AppBar Header */}
          <AppBar user={user} role={role} />

          {/* Semantic Main Content */}
          <main
            className={cn(
              "flex-1 p-4 md:p-6 lg:p-8 bg-[#f8fafc]/60 overflow-y-scroll",
              // Extra bottom padding on mobile if marketing bottom navigation is active
              isMarketing ? "pb-24 md:pb-8" : "pb-8",
              className
            )}
          >
            {/* Mobile-only breadcrumb strip (if header breadcrumb is hidden on mobile) */}
            {showMobileBreadcrumb && (
              <div className="block sm:hidden mb-4">
                <Breadcrumb />
              </div>
            )}

            {children}
          </main>
        </div>

        {/* Mobile Bottom Navigation (Optimized for Marketing role) */}
        <BottomNav />
      </div>
    </SidebarProvider>
  );
}
