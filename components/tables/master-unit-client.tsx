"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Building2,
  Layers,
  PlusCircle,
  Sparkles,
  RefreshCw,
  Home,
  CheckCircle2,
  Clock,
  ShieldAlert,
} from "lucide-react";
import {
  SerializedMasterTipe,
  SerializedMasterUnit,
  PaginatedUnitsResult,
  getMasterTipeList,
  getMasterUnits,
} from "@/actions/master-unit.action";
import { MasterTipeTable } from "@/components/tables/master-tipe-table";
import { MasterUnitTable } from "@/components/tables/master-unit-table";
import { MasterTipeForm } from "@/components/forms/master-tipe-form";
import { MasterUnitForm } from "@/components/forms/master-unit-form";

interface MasterUnitClientProps {
  initialTipeList: SerializedMasterTipe[];
  initialUnitsResult: PaginatedUnitsResult;
}

export function MasterUnitClient({
  initialTipeList,
  initialUnitsResult,
}: MasterUnitClientProps) {
  // Active Tab: "units" or "types"
  const [activeTab, setActiveTab] = useState<"units" | "types">("units");

  // Master Tipe State
  const [tipeList, setTipeList] = useState<SerializedMasterTipe[]>(initialTipeList);
  const [isTipeModalOpen, setIsTipeModalOpen] = useState<boolean>(false);
  const [editingTipe, setEditingTipe] = useState<SerializedMasterTipe | null>(null);

  // Master Unit State
  const [units, setUnits] = useState<SerializedMasterUnit[]>(initialUnitsResult.units);
  const [totalUnits, setTotalUnits] = useState<number>(initialUnitsResult.total);
  const [currentPage, setCurrentPage] = useState<number>(initialUnitsResult.page);
  const [totalPages, setTotalPages] = useState<number>(initialUnitsResult.totalPages);

  // Filters
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [tipeFilter, setTipeFilter] = useState<number>(0);

  // Modal State for Unit Creation
  const [isUnitModalOpen, setIsUnitModalOpen] = useState<boolean>(false);

  const [isPending, startTransition] = useTransition();

  // Refresh Tipe List
  const refreshTipeList = async () => {
    const res = await getMasterTipeList();
    if (res.success && res.data) {
      setTipeList(res.data);
    }
  };

  // Refresh Units with current filters & page
  const refreshUnits = async (page = currentPage, query = search, status = statusFilter, tipeId = tipeFilter) => {
    startTransition(async () => {
      const res = await getMasterUnits({
        page,
        limit: 15,
        search: query,
        status,
        tipeId,
      });

      if (res.success && res.data) {
        setUnits(res.data.units);
        setTotalUnits(res.data.total);
        setCurrentPage(res.data.page);
        setTotalPages(res.data.totalPages);
      }
    });
  };

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      refreshUnits(1, search, statusFilter, tipeFilter);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter, tipeFilter]);

  const handlePageChange = (page: number) => {
    refreshUnits(page, search, statusFilter, tipeFilter);
  };

  const handleEditTipe = (tipe: SerializedMasterTipe) => {
    setEditingTipe(tipe);
    setIsTipeModalOpen(true);
  };

  const handleAddTipe = () => {
    setEditingTipe(null);
    setIsTipeModalOpen(true);
  };

  // Compute status summary counts from current type/units
  const availableCount = units.filter((u) => u.status_unit === "AVAILABLE").length;
  const holdCount = units.filter((u) => u.status_unit === "HOLD").length;
  const soldCount = units.filter((u) => u.status_unit === "SOLD").length;

  return (
    <div className="space-y-6">
      {/* Page Title & Top Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-lg border border-mist shadow-subtle">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-carbon-ink tracking-tight">
            Master Data Unit & Tipe
          </h1>
          <p className="text-xs md:text-sm text-slate mt-0.5">
            Konfigurasi spesifikasi tipe properti dan pengelolaan blok unit secara massal
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "units" ? (
            <button
              type="button"
              onClick={() => setIsUnitModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-prism-teal text-white text-xs md:text-sm font-semibold hover:bg-deep-teal transition-colors shadow-subtle"
            >
              <Sparkles className="w-4 h-4" />
              <span>Tambah / Bulk Unit</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleAddTipe}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-prism-teal text-white text-xs md:text-sm font-semibold hover:bg-deep-teal transition-colors shadow-subtle"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Tambah Tipe Unit</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              refreshTipeList();
              refreshUnits();
            }}
            disabled={isPending}
            className="p-2 rounded-md border border-mist bg-white text-slate hover:text-graphite hover:bg-bone transition-colors disabled:opacity-50"
            title="Muat ulang data"
          >
            <RefreshCw
              className={`w-4 h-4 ${isPending ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Metric Cards Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-lg border border-mist shadow-subtle">
          <span className="text-[11px] font-semibold text-slate uppercase tracking-wider">
            Total Tipe Properti
          </span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-bold text-carbon-ink font-mono">
              {tipeList.length}
            </span>
            <div className="w-7 h-7 rounded-md bg-teal-50 text-prism-teal flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-mist shadow-subtle">
          <span className="text-[11px] font-semibold text-slate uppercase tracking-wider">
            Total Blok / Unit
          </span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-bold text-carbon-ink font-mono">
              {totalUnits}
            </span>
            <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-mist shadow-subtle">
          <span className="text-[11px] font-semibold text-slate uppercase tracking-wider">
            Unit AVAILABLE
          </span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-bold text-emerald-600 font-mono">
              {availableCount}
            </span>
            <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-mist shadow-subtle">
          <span className="text-[11px] font-semibold text-slate uppercase tracking-wider">
            Unit HOLD / SOLD
          </span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-bold text-amber-600 font-mono">
              {holdCount + soldCount}
            </span>
            <div className="w-7 h-7 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-mist">
        <button
          type="button"
          onClick={() => setActiveTab("units")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${activeTab === "units"
            ? "border-prism-teal text-deep-teal bg-teal-50/40"
            : "border-transparent text-slate hover:text-graphite hover:bg-bone/50"
            }`}
        >
          <Layers className="w-4 h-4" />
          <span>Daftar Blok / Unit</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-bone text-graphite font-mono">
            {totalUnits}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("types")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${activeTab === "types"
            ? "border-prism-teal text-deep-teal bg-teal-50/40"
            : "border-transparent text-slate hover:text-graphite hover:bg-bone/50"
            }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Tipe Unit</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-bone text-graphite font-mono">
            {tipeList.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Daftar Blok / Unit */}
      {activeTab === "units" && (
        <MasterUnitTable
          units={units}
          tipeList={tipeList}
          total={totalUnits}
          currentPage={currentPage}
          totalPages={totalPages}
          search={search}
          statusFilter={statusFilter}
          tipeFilter={tipeFilter}
          onSearchChange={setSearch}
          onStatusChange={setStatusFilter}
          onTipeChange={setTipeFilter}
          onPageChange={handlePageChange}
          onRefresh={() => refreshUnits()}
        />
      )}

      {/* Tab 2: Tipe Unit */}
      {activeTab === "types" && (
        <MasterTipeTable
          data={tipeList}
          onEdit={handleEditTipe}
          onRefresh={() => {
            refreshTipeList();
            refreshUnits();
          }}
        />
      )}

      {/* Modal: Form Tambah/Edit Tipe */}
      <MasterTipeForm
        isOpen={isTipeModalOpen}
        initialData={editingTipe}
        onClose={() => {
          setIsTipeModalOpen(false);
          setEditingTipe(null);
        }}
        onSuccess={() => {
          refreshTipeList();
          refreshUnits();
        }}
      />

      {/* Modal: Form Tambah Unit (Single & Bulk) */}
      <MasterUnitForm
        isOpen={isUnitModalOpen}
        tipeList={tipeList}
        onClose={() => setIsUnitModalOpen(false)}
        onSuccess={() => {
          refreshUnits();
          refreshTipeList();
        }}
      />
    </div>
  );
}
