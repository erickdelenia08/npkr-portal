// components/manager/section-card.tsx
import React from "react";

interface SectionCardProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function SectionCard({
  title,
  subtitle,
  action,
  children,
  className = "",
}: SectionCardProps) {
  return (
    <div
      className={`bg-white border border-mist p-5 sm:p-6 rounded-2xl shadow-subtle ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-carbon-ink tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-slate mt-0.5 max-w-2xl">{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}
