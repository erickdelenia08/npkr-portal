// app/manager/loading.tsx
import React from "react";

export default function ManagerLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-pulse">
      {/* Header skeleton */}
      <div className="bg-white p-6 rounded-2xl border border-mist shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-bone rounded-md" />
          <div className="h-4 w-72 bg-bone rounded-md" />
        </div>
        <div className="h-10 w-40 bg-bone rounded-xl" />
      </div>

      {/* KPI Cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-white p-5 rounded-2xl border border-mist shadow-subtle space-y-3"
          >
            <div className="h-3.5 w-20 bg-bone rounded" />
            <div className="h-8 w-28 bg-bone rounded" />
            <div className="h-3 w-16 bg-bone rounded" />
          </div>
        ))}
      </div>

      {/* Content boxes skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-mist shadow-subtle h-64" />
        <div className="bg-white p-6 rounded-2xl border border-mist shadow-subtle h-64" />
      </div>

      {/* Table skeleton */}
      <div className="bg-white p-6 rounded-2xl border border-mist shadow-subtle space-y-4">
        <div className="h-5 w-48 bg-bone rounded" />
        <div className="h-40 w-full bg-bone/60 rounded-xl" />
      </div>
    </div>
  );
}
