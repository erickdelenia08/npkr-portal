"use client";

import React from "react";

export interface StickyActionBarProps {
  statusText?: React.ReactNode;
  children: React.ReactNode;
  secondaryAction?: React.ReactNode;
}

export function StickyActionBar({
  statusText,
  children,
  secondaryAction,
}: StickyActionBarProps) {
  return (
    <>
      {/* Spacer on mobile so content is never covered by the fixed bar */}
      <div className="h-20 md:hidden" aria-hidden="true" />

      {/* Bar container: fixed on mobile, inline on desktop */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-mist px-4 py-3 shadow-lg md:relative md:bottom-auto md:left-auto md:right-auto md:z-auto md:bg-transparent md:border-t md:border-mist md:px-0 md:py-4 md:shadow-none pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 max-w-7xl mx-auto">
          {/* Status text or secondary information */}
          <div className="text-xs text-slate min-w-0">
            {statusText}
          </div>

          {/* Action buttons (secondary + primary) */}
          <div className="flex items-center gap-2.5 self-stretch sm:self-auto justify-start flex-wrap">
            {secondaryAction}
            {children}
          </div>
        </div>
      </div>
    </>
  );
}

