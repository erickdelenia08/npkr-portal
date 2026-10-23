"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Grid,
  Map,
  Building2,
  Info,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  ChevronRight,
} from "lucide-react";
import type { SerializedMasterUnit } from "@/actions/master-unit.action";
import {
  InteractiveSiteplanSvg,
  UnregisteredPlot,
} from "@/components/shared/InteractiveSiteplanSvg";

interface UnitInventoryViewerProps {
  units: SerializedMasterUnit[];
  title?: string;
  subtitle?: string;
  projectName?: string;
  actionInstruction?: string;
  hideHeader?: boolean;
  showListView?: boolean;
  onChangeTipe?: (unit: SerializedMasterUnit) => void;
}

export function UnitInventoryViewer({
  units,
  title = "Inventaris Unit & Siteplan Visual",
  subtitle = "Monitoring ketersediaan unit dan visualisasi siteplan",
  projectName = "New Puri Kencana",
  actionInstruction = "melihat detail harga & membuat ITJ",
  hideHeader = false,
  showListView = true,
  onChangeTipe,
}: UnitInventoryViewerProps) {
  // View Toggle: "siteplan" | "list"
  const [activeView, setActiveView] = useState<"siteplan" | "list">("siteplan");

  // Filters
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [kategoriFilter, setKategoriFilter] = useState<string>("ALL");
  const [selectedBlock, setSelectedBlock] = useState<string>("ALL");

  // Zoom scale for siteplan (0.75 to 1.75)
  const [zoomScale, setZoomScale] = useState<number>(1);

  // Tooltip / Popover State for Siteplan
  const [selectedUnit, setSelectedUnit] = useState<SerializedMasterUnit | null>(null);
  const [unregisteredPlot, setUnregisteredPlot] = useState<UnregisteredPlot | null>(null);
  const [hoveredUnit, setHoveredUnit] = useState<SerializedMasterUnit | null>(null);

  // Dynamic Block List derived from registered units (natural alphanumeric sort)
  const blockList = useMemo(() => {
    const prefixSet = new Set<string>();
    units.forEach((u) => {
      const match = u.blok.match(/^([A-Za-z0-9]+)-/);
      if (match) {
        prefixSet.add(match[1].toUpperCase());
      }
    });

    const sorted = Array.from(prefixSet).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
    );

    return ["ALL", ...sorted];
  }, [units]);

  // Status Counts
  const counts = useMemo(() => {
    let available = 0;
    let holdBooked = 0;
    let sold = 0;

    units.forEach((u) => {
      if (u.status_unit === "AVAILABLE") available++;
      else if (u.status_unit === "HOLD" || u.status_unit === "BOOKED") holdBooked++;
      else if (u.status_unit === "SOLD") sold++;
    });

    return {
      total: units.length,
      available,
      holdBooked,
      sold,
    };
  }, [units]);

  // Filtered Units
  const filteredUnits = useMemo(() => {
    return units.filter((u) => {
      // Filter by Selected Block
      if (selectedBlock !== "ALL") {
        const blockPrefix = `${selectedBlock}-`;
        if (!u.blok.toUpperCase().startsWith(blockPrefix)) return false;
      }

      // Search by Blok or Tipe
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const matchBlok = u.blok.toLowerCase().includes(query);
        const matchTipe = u.tipe.nama_tipe.toLowerCase().includes(query);
        if (!matchBlok && !matchTipe) return false;
      }

      // Filter by Status
      if (statusFilter !== "ALL") {
        if (statusFilter === "HOLD_BOOKED") {
          if (u.status_unit !== "HOLD" && u.status_unit !== "BOOKED") return false;
        } else if (u.status_unit !== statusFilter) {
          return false;
        }
      }

      // Filter by Kategori
      if (kategoriFilter !== "ALL" && u.tipe.kategori !== kategoriFilter) {
        return false;
      }

      return true;
    });
  }, [units, search, statusFilter, kategoriFilter, selectedBlock]);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      {/* Optional Header & Controls Bar */}
      {!hideHeader && (
        <div className="bg-white p-5 rounded-lg border border-mist shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-carbon-ink tracking-tight font-heading">
              {title}
            </h1>
            <p className="text-xs md:text-sm text-slate mt-0.5">{subtitle}</p>
          </div>

          {/* View Mode Switcher (List vs Siteplan) */}
          {showListView && (
            <div className="inline-flex p-1 rounded-lg bg-bone border border-mist self-start md:self-auto">
              <button
                type="button"
                onClick={() => setActiveView("siteplan")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  activeView === "siteplan"
                    ? "bg-white text-carbon-ink shadow-xs"
                    : "text-slate hover:text-graphite"
                }`}
              >
                <Map className="w-4 h-4 text-prism-teal" />
                <span>Siteplan View</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView("list")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  activeView === "list"
                    ? "bg-white text-carbon-ink shadow-xs"
                    : "text-slate hover:text-graphite"
                }`}
              >
                <Grid className="w-4 h-4" />
                <span>List View</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Summary Stat Badges & Filters */}
      <div className="bg-white p-4 rounded-lg border border-mist shadow-subtle space-y-4">
        {/* Quick Legend & Metrics as real accessible buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-semibold">
          <div className="p-2.5 rounded-md border border-mist bg-bone/40 flex items-center justify-between">
            <span className="text-slate">Total Unit Master</span>
            <span className="font-mono font-bold text-carbon-ink text-sm">
              {counts.total}
            </span>
          </div>

          <button
            type="button"
            aria-pressed={statusFilter === "AVAILABLE"}
            onClick={() => setStatusFilter(statusFilter === "AVAILABLE" ? "ALL" : "AVAILABLE")}
            className={`p-2.5 rounded-md border cursor-pointer transition-all flex items-center justify-between outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              statusFilter === "AVAILABLE"
                ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500 shadow-xs"
                : "border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50 text-emerald-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>AVAILABLE</span>
            </div>
            <span className="font-mono font-bold">{counts.available}</span>
          </button>

          <button
            type="button"
            aria-pressed={statusFilter === "HOLD_BOOKED"}
            onClick={() =>
              setStatusFilter(statusFilter === "HOLD_BOOKED" ? "ALL" : "HOLD_BOOKED")
            }
            className={`p-2.5 rounded-md border cursor-pointer transition-all flex items-center justify-between outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              statusFilter === "HOLD_BOOKED"
                ? "border-amber-500 bg-amber-50 ring-1 ring-amber-500 shadow-xs"
                : "border-amber-200 bg-amber-50/60 hover:bg-amber-50 text-amber-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>HOLD / BOOKED</span>
            </div>
            <span className="font-mono font-bold">{counts.holdBooked}</span>
          </button>

          <button
            type="button"
            aria-pressed={statusFilter === "SOLD"}
            onClick={() => setStatusFilter(statusFilter === "SOLD" ? "ALL" : "SOLD")}
            className={`p-2.5 rounded-md border cursor-pointer transition-all flex items-center justify-between outline-none focus-visible:ring-2 focus-visible:ring-slate-500 ${
              statusFilter === "SOLD"
                ? "border-slate-500 bg-slate-100 ring-1 ring-slate-500 shadow-xs"
                : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span>SOLD</span>
            </div>
            <span className="font-mono font-bold">{counts.sold}</span>
          </button>
        </div>

        {/* Global Filter Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5 pt-1">
          {/* Search by Blok */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nomor blok atau tipe (cth: F-1, A-3, Subsidi)..."
              className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-md border border-mist focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal transition-all"
            />
          </div>

          {/* Filter Status */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-md border border-mist bg-white font-medium text-graphite focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal"
            >
              <option value="ALL">Semua Status</option>
              <option value="AVAILABLE">AVAILABLE (Tersedia)</option>
              <option value="HOLD_BOOKED">HOLD / BOOKED (Diproses)</option>
              <option value="SOLD">SOLD (Terjual)</option>
            </select>

            {/* Filter Kategori */}
            <select
              value={kategoriFilter}
              onChange={(e) => setKategoriFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-md border border-mist bg-white font-medium text-graphite focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal"
            >
              <option value="ALL">Semua Kategori</option>
              <option value="SUBSIDI">SUBSIDI</option>
              <option value="KOMERSIL">KOMERSIL</option>
              <option value="KAVLING">KAVLING</option>
            </select>

            {(search || statusFilter !== "ALL" || kategoriFilter !== "ALL" || selectedBlock !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("ALL");
                  setKategoriFilter("ALL");
                  setSelectedBlock("ALL");
                }}
                className="p-2 rounded-md border border-mist text-slate hover:text-carbon-ink hover:bg-bone transition-colors"
                title="Reset Filter"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Block Filter Pills (dynamically derived) */}
        {blockList.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 scrollbar-thin text-xs">
            <span className="text-slate flex items-center gap-1 font-semibold text-[11px] shrink-0 mr-1">
              <Layers className="w-3.5 h-3.5 text-prism-teal" />
              <span>Pilih Blok:</span>
            </span>
            {blockList.map((blk) => (
              <button
                key={blk}
                type="button"
                onClick={() => setSelectedBlock(blk)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-bold shrink-0 transition-all ${
                  selectedBlock === blk
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                }`}
              >
                {blk === "ALL" ? "Semua" : blk}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* VIEW 1: INTERACTIVE SVG SITEPLAN */}
      {activeView === "siteplan" && (
        <div className="bg-white rounded-lg border border-mist shadow-subtle p-4 md:p-6 space-y-4">
          {/* Siteplan Toolbar & Instructions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate pb-2 border-b border-mist">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-prism-teal shrink-0" />
              <span>
                Siteplan Asli Perumahan {projectName}. Klik atau arahkan kursor ke unit{" "}
                <strong className="text-emerald-700">Hijau (AVAILABLE)</strong> untuk {actionInstruction}.
              </span>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto bg-slate-100 p-1 rounded-md border border-slate-200">
              <button
                type="button"
                onClick={() => setZoomScale((prev) => Math.max(0.75, Math.round((prev - 0.15) * 100) / 100))}
                className="p-1 rounded hover:bg-white text-slate-700 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="font-mono text-[11px] font-bold px-1.5 text-slate-700 min-w-[42px] text-center">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomScale((prev) => Math.min(1.75, Math.round((prev + 0.15) * 100) / 100))}
                className="p-1 rounded hover:bg-white text-slate-700 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoomScale(1)}
                className="p-1 rounded hover:bg-white text-slate-700 transition-colors ml-0.5"
                title="Reset Zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive SVG Canvas & Overlay Popover */}
          <div className="relative">
            <InteractiveSiteplanSvg
              units={units}
              filteredUnits={filteredUnits}
              selectedUnit={selectedUnit}
              onSelectUnit={(unit) => {
                setSelectedUnit(unit);
                setHoveredUnit(null);
              }}
              onSelectUnregistered={(plot) => setUnregisteredPlot(plot)}
              hoveredUnit={hoveredUnit}
              onHoverUnit={(unit) => {
                if (!selectedUnit) {
                  setHoveredUnit(unit);
                }
              }}
              selectedBlock={selectedBlock}
              zoomScale={zoomScale}
            />

            {/* Hover Tooltip (Lightweight, NO action buttons) */}
            {hoveredUnit && !selectedUnit && (
              <div className="absolute top-4 right-4 z-20 w-64 bg-white/95 backdrop-blur-xs rounded-lg border border-mist shadow-lg p-3 animate-in fade-in duration-100 pointer-events-none">
                <div className="flex items-center justify-between pb-1.5 border-b border-mist/80">
                  <span className="font-mono font-bold text-sm text-carbon-ink">
                    Blok {hoveredUnit.blok}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      hoveredUnit.status_unit === "AVAILABLE"
                        ? "bg-emerald-50 text-emerald-700"
                        : hoveredUnit.status_unit === "SOLD"
                        ? "bg-red-50 text-red-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {hoveredUnit.status_unit}
                  </span>
                </div>
                <div className="pt-2 space-y-1 text-xs">
                  <div className="flex justify-between text-slate">
                    <span>Tipe:</span>
                    <span className="font-semibold text-graphite">{hoveredUnit.tipe.nama_tipe}</span>
                  </div>
                  <div className="flex justify-between text-slate">
                    <span>Harga:</span>
                    <span className="font-mono font-bold text-deep-teal">
                      {formatPrice(hoveredUnit.harga_khusus ?? hoveredUnit.tipe.harga_dasar)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Selected Popover (Interactive, with Ganti Tipe Action) */}
            {selectedUnit && (
              <div className="absolute top-4 right-4 z-20 w-72 bg-white rounded-lg border border-mist shadow-xl p-4 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-start justify-between pb-2 border-b border-mist">
                  <div>
                    <span className="text-[10px] font-semibold text-slate uppercase tracking-wider block">
                      Blok Terpilih
                    </span>
                    <span className="font-mono font-bold text-lg text-carbon-ink">
                      {selectedUnit.blok}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedUnit(null)}
                    className="p-1 rounded text-slate hover:text-carbon-ink hover:bg-bone transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="py-2.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate">Tipe Unit:</span>
                    <span className="font-semibold text-carbon-ink">
                      {selectedUnit.tipe.nama_tipe}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate">Kategori:</span>
                    <span className="px-1.5 py-0.5 rounded font-medium text-[10px] bg-bone text-graphite">
                      {selectedUnit.tipe.kategori}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate">LB / LT:</span>
                    <span className="font-mono text-carbon-ink">
                      {selectedUnit.tipe.luas_bangunan} m² / {selectedUnit.tipe.luas_tanah} m²
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate">Harga:</span>
                    <span className="font-mono font-bold text-deep-teal">
                      {formatPrice(selectedUnit.harga_khusus ?? selectedUnit.tipe.harga_dasar)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate">Status:</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        selectedUnit.status_unit === "AVAILABLE"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : selectedUnit.status_unit === "SOLD"
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {selectedUnit.status_unit}
                    </span>
                  </div>
                </div>

                {onChangeTipe && (
                  <div className="pt-2 border-t border-mist mt-2">
                    <button
                      type="button"
                      disabled={selectedUnit.status_unit !== "AVAILABLE"}
                      onClick={() => onChangeTipe(selectedUnit)}
                      className="w-full text-xs font-semibold py-2 px-3 rounded bg-deep-teal text-white hover:bg-deep-teal/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Ganti Tipe Unit
                    </button>
                    {selectedUnit.status_unit !== "AVAILABLE" && (
                      <p className="text-[10px] text-slate text-center mt-1">
                        Unit {selectedUnit.status_unit.toLowerCase()}, tipe tidak bisa diganti
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: LIST VIEW */}
      {activeView === "list" && showListView && (
        <div className="bg-white rounded-lg border border-mist shadow-subtle p-4 md:p-6 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filteredUnits.map((unit) => (
              <div
                key={unit.id}
                className="p-3 rounded-lg border border-mist bg-bone/30 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-sm text-carbon-ink">
                    {unit.blok}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                      unit.status_unit === "AVAILABLE"
                        ? "bg-emerald-50 text-emerald-700"
                        : unit.status_unit === "SOLD"
                        ? "bg-red-50 text-red-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {unit.status_unit}
                  </span>
                </div>
                <div className="text-[11px] text-slate font-medium truncate">
                  {unit.tipe.nama_tipe}
                </div>
                <div className="font-mono font-semibold text-xs text-deep-teal">
                  {formatPrice(unit.harga_khusus ?? unit.tipe.harga_dasar)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
