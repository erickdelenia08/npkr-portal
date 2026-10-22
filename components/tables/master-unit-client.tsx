"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import {
  Building2,
  Layers,
  PlusCircle,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Clock,
  Map,
  ChevronDown,
  Plus,
  Lock,
  AlertCircle,
  FileText,
  Home,
} from "lucide-react";
import {
  SerializedMasterTipe,
  SerializedMasterUnit,
  PaginatedUnitsResult,
  MasterUnitSummary,
  getMasterTipeList,
  getMasterUnits,
  getMasterUnitSummary,
} from "@/actions/master-unit.action";
import { MasterTipeTable } from "@/components/tables/master-tipe-table";
import { MasterUnitTable } from "@/components/tables/master-unit-table";
import { MasterTipeForm } from "@/components/forms/master-tipe-form";
import { MasterUnitForm } from "@/components/forms/master-unit-form";
import { ChangeTipeDrawer } from "@/components/forms/change-tipe-drawer";
import { UnitInventoryViewer } from "@/components/shared/UnitInventoryViewer";

interface MasterUnitClientProps {
  initialTipeList: SerializedMasterTipe[];
  initialUnitsResult: PaginatedUnitsResult;
  initialSummary: MasterUnitSummary;
  isAdmin?: boolean;
}

export function MasterUnitClient({
  initialTipeList,
  initialUnitsResult,
  initialSummary,
  isAdmin = true,
}: MasterUnitClientProps) {
  // Active Tab: "units" | "types" | "siteplan"
  const [activeTab, setActiveTab] = useState<"units" | "types" | "siteplan">("units");

  // Master Tipe State
  const [tipeList, setTipeList] = useState<SerializedMasterTipe[]>(initialTipeList);
  const [isTipeModalOpen, setIsTipeModalOpen] = useState<boolean>(false);
  const [editingTipe, setEditingTipe] = useState<SerializedMasterTipe | null>(null);

  // Master Unit State
  const [units, setUnits] = useState<SerializedMasterUnit[]>(initialUnitsResult.units);
  const [totalUnits, setTotalUnits] = useState<number>(initialUnitsResult.total);
  const [currentPage, setCurrentPage] = useState<number>(initialUnitsResult.page);
  const [totalPages, setTotalPages] = useState<number>(initialUnitsResult.totalPages);

  // Server Summary State
  const [summary, setSummary] = useState<MasterUnitSummary>(initialSummary);

  // Filters
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [tipeFilter, setTipeFilter] = useState<number>(0);
  const [kategoriFilter, setKategoriFilter] = useState<string>("");

  // Modal State for Unit Creation
  const [isUnitModalOpen, setIsUnitModalOpen] = useState<boolean>(false);
  const [unitModalMode, setUnitModalMode] = useState<"bulk" | "single">("bulk");
  const [isSetupMenuOpen, setIsSetupMenuOpen] = useState<boolean>(false);

  // Change Tipe Drawer State
  const [changingUnit, setChangingUnit] = useState<SerializedMasterUnit | null>(null);

  const [isPending, startTransition] = useTransition();
  const isInitialMount = useRef(true);

  // Refresh Tipe List
  const refreshTipeList = async () => {
    const res = await getMasterTipeList();
    if (res.success && res.data) {
      setTipeList(res.data);
    }
  };

  // Refresh Summary
  const refreshSummary = async () => {
    const res = await getMasterUnitSummary();
    if (res.success && res.data) {
      setSummary(res.data);
    }
  };

  // Refresh Units with current filters & page
  const refreshUnits = async (
    page = currentPage,
    query = search,
    status = statusFilter,
    tipeId = tipeFilter,
    kategori = kategoriFilter
  ) => {
    startTransition(async () => {
      const res = await getMasterUnits({
        page,
        limit: 15,
        search: query,
        status,
        tipeId,
        kategori,
      });

      if (res.success && res.data) {
        setUnits(res.data.units);
        setTotalUnits(res.data.total);
        setCurrentPage(res.data.page);
        setTotalPages(res.data.totalPages);
      }
    });
  };

  // Debounced search trigger (SKIP initial mount to avoid redundant initial fetch)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      refreshUnits(1, search, statusFilter, tipeFilter, kategoriFilter);
    }, 300);

    return () => clearTimeout(timer);
  }, [search, statusFilter, tipeFilter, kategoriFilter]);

  const handlePageChange = (page: number) => {
    refreshUnits(page, search, statusFilter, tipeFilter, kategoriFilter);
  };

  const handleEditTipe = (tipe: SerializedMasterTipe) => {
    setEditingTipe(tipe);
    setIsTipeModalOpen(true);
  };

  const handleAddTipe = () => {
    setEditingTipe(null);
    setIsTipeModalOpen(true);
  };

  const handleOpenUnitModal = (mode: "bulk" | "single") => {
    setIsSetupMenuOpen(false);
    setUnitModalMode(mode);
    setIsUnitModalOpen(true);
  };

  // Refresh all data
  const handleFullRefresh = () => {
    refreshTipeList();
    refreshSummary();
    refreshUnits();
  };

  const hasNoTipe = tipeList.length === 0;
  const hasNoUnits = !hasNoTipe && totalUnits === 0;

  return (
    <div className="space-y-6">
      {/* Page Title & Top Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-lg border border-mist shadow-subtle">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-carbon-ink tracking-tight font-heading">
            Master Unit &amp; Tipe
          </h1>
          <p className="text-xs md:text-sm text-slate mt-0.5">
            Manajemen spesifikasi tipe properti dan inventori blok unit berdasarkan siteplan legal
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Primary Action Button depends on active tab */}
          {activeTab === "units" && isAdmin && (
            <div className="relative inline-block text-left">
              <button
                type="button"
                onClick={() => setIsSetupMenuOpen(!isSetupMenuOpen)}
                disabled={hasNoTipe}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-white border border-mist text-carbon-ink text-xs md:text-sm font-semibold hover:bg-bone transition-colors shadow-subtle disabled:opacity-50 disabled:cursor-not-allowed"
                title={hasNoTipe ? "Buat tipe unit terlebih dahulu" : "Setup unit siteplan"}
              >
                <Layers className="w-4 h-4 text-prism-teal" />
                <span>Setup Unit Siteplan</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate ml-0.5" />
              </button>

              {isSetupMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setIsSetupMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-1.5 w-56 rounded-md bg-white border border-mist shadow-lg py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100 text-left">
                    <button
                      type="button"
                      onClick={() => handleOpenUnitModal("bulk")}
                      className="w-full text-left px-3.5 py-2 text-xs text-graphite hover:bg-bone flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 text-prism-teal" />
                      <div>
                        <span className="font-semibold block">Generate Unit Massal</span>
                        <span className="text-[10px] text-slate">Auto series unit (cth: A-1 s/d A-10)</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenUnitModal("single")}
                      className="w-full text-left px-3.5 py-2 text-xs text-graphite hover:bg-bone flex items-center gap-2 border-t border-mist/60 mt-1"
                    >
                      <Plus className="w-4 h-4 text-slate" />
                      <div>
                        <span className="font-semibold block">Tambah Satu Unit</span>
                        <span className="text-[10px] text-slate">Input nomor unit satuan</span>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "types" && isAdmin && (
            <button
              type="button"
              onClick={handleAddTipe}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-prism-teal text-white text-xs md:text-sm font-semibold hover:bg-deep-teal transition-colors shadow-subtle"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Tambah Tipe Unit</span>
            </button>
          )}

          {/* Full Refresh Button */}
          <button
            type="button"
            onClick={handleFullRefresh}
            disabled={isPending}
            className="p-2 rounded-md border border-mist bg-white text-slate hover:text-graphite hover:bg-bone transition-colors disabled:opacity-50"
            title="Muat ulang seluruh data inventori"
          >
            <RefreshCw className={`w-4 h-4 ${isPending ? "animate-spin text-prism-teal" : ""}`} />
          </button>
        </div>
      </div>

      {/* Guided Empty States */}
      {hasNoTipe && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900 font-heading">
                Langkah 1: Mulai dengan membuat tipe unit
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                Spesifikasi tipe unit (kategori, luas bangunan, luas tanah, dan harga dasar) diperlukan sebelum Anda dapat menghasilkan blok unit pada siteplan.
              </p>
            </div>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setActiveTab("types");
                handleAddTipe();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold shrink-0 shadow-xs transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Tambah Tipe Sekarang</span>
            </button>
          )}
        </div>
      )}

      {hasNoUnits && (
        <div className="bg-teal-50/80 border border-teal-200 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-md bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5 text-prism-teal" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-deep-teal font-heading">
                Langkah 2: Sekarang buat unit siteplan Anda
              </h3>
              <p className="text-xs text-teal-800 mt-0.5">
                Tipe unit sudah tersedia. Generate nomor unit secara massal (cth: A-1 sampai A-10) untuk melengkapi inventori perumahan.
              </p>
            </div>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => handleOpenUnitModal("bulk")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-prism-teal hover:bg-deep-teal text-white text-xs font-semibold shrink-0 shadow-xs transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Unit Massal</span>
            </button>
          )}
        </div>
      )}

      {/* Metric Summary Cards (Server-side aggregated, Clickable Status Filter) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Unit Card */}
        <div
          onClick={() => setStatusFilter("")}
          className={`bg-white p-4 rounded-lg border transition-all cursor-pointer ${
            statusFilter === ""
              ? "border-carbon-ink ring-2 ring-carbon-ink/10 shadow-sm"
              : "border-mist shadow-subtle hover:border-slate/60"
          }`}
          title="Klik untuk melihat semua unit"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate uppercase tracking-wider">
              Total Blok / Unit
            </span>
            <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-carbon-ink font-mono">
              {summary.total}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-mist/60 text-[10px] text-slate font-medium flex items-center gap-1.5 flex-wrap">
            <span>Subsidi: <strong className="text-carbon-ink font-mono">{summary.perKategori.SUBSIDI}</strong></span>
            <span>•</span>
            <span>Komersil: <strong className="text-carbon-ink font-mono">{summary.perKategori.KOMERSIL}</strong></span>
            <span>•</span>
            <span>Kavling: <strong className="text-carbon-ink font-mono">{summary.perKategori.KAVLING}</strong></span>
          </div>
        </div>

        {/* Available Card */}
        <div
          onClick={() => setStatusFilter(statusFilter === "AVAILABLE" ? "" : "AVAILABLE")}
          className={`bg-white p-4 rounded-lg border transition-all cursor-pointer ${
            statusFilter === "AVAILABLE"
              ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20 shadow-sm"
              : "border-mist shadow-subtle hover:border-emerald-300"
          }`}
          title="Klik untuk memfilter unit AVAILABLE"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
              Unit AVAILABLE
            </span>
            <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-emerald-600 font-mono">
              {summary.available}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-mist/60 text-[10px] text-slate font-medium">
            Siap untuk reservasi / ITJ
          </div>
        </div>

        {/* Dalam Proses Card (HOLD + BOOKED) */}
        <div
          onClick={() => setStatusFilter(statusFilter === "HOLD" ? "" : "HOLD")}
          className={`bg-white p-4 rounded-lg border transition-all cursor-pointer ${
            statusFilter === "HOLD" || statusFilter === "BOOKED"
              ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20 shadow-sm"
              : "border-mist shadow-subtle hover:border-amber-300"
          }`}
          title="Klik untuk memfilter unit Dalam Proses (HOLD / BOOKED)"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">
              Dalam Proses
            </span>
            <div className="w-7 h-7 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-amber-600 font-mono">
              {summary.proses}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-mist/60 text-[10px] text-slate font-medium">
            Sedang proses ITJ &amp; pemesanan
          </div>
        </div>

        {/* Sold Card */}
        <div
          onClick={() => setStatusFilter(statusFilter === "SOLD" ? "" : "SOLD")}
          className={`bg-white p-4 rounded-lg border transition-all cursor-pointer ${
            statusFilter === "SOLD"
              ? "border-slate-500 ring-2 ring-slate-500/20 bg-slate-50 shadow-sm"
              : "border-mist shadow-subtle hover:border-slate/60"
          }`}
          title="Klik untuk memfilter unit Terjual (SOLD)"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate uppercase tracking-wider">
              Unit SOLD
            </span>
            <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-slate-700 font-mono">
              {summary.sold}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-mist/60 text-[10px] text-slate font-medium">
            Terjual &amp; terkunci oleh sistem
          </div>
        </div>
      </div>

      {/* Tipe Recap Strip / Panel (Verify count against approved siteplan) */}
      {tipeList.length > 0 && (
        <div className="bg-white px-4 py-3 rounded-lg border border-mist shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 shrink-0">
            <Building2 className="w-4 h-4 text-prism-teal" />
            <span className="font-semibold text-carbon-ink font-heading">
              Rekapitulasi Unit per Tipe Siteplan:
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin py-0.5">
            {tipeList.map((t) => {
              const count = t.jumlah_unit ?? t._count?.units ?? 0;
              return (
                <div
                  key={t.id}
                  className="px-2.5 py-1 rounded bg-bone/70 border border-mist flex items-center gap-1.5 shrink-0"
                >
                  <span className="font-mono text-graphite font-medium">{t.nama_tipe}:</span>
                  <span className="font-mono font-bold text-deep-teal">{count} unit</span>
                </div>
              );
            })}
            <div className="px-2.5 py-1 rounded bg-teal-50 border border-teal-200 flex items-center gap-1.5 shrink-0">
              <span className="font-semibold text-deep-teal">Total:</span>
              <span className="font-mono font-bold text-deep-teal">{summary.total} unit</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-mist">
        <button
          type="button"
          onClick={() => setActiveTab("units")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "units"
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
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "types"
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

        <button
          type="button"
          onClick={() => setActiveTab("siteplan")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "siteplan"
              ? "border-prism-teal text-deep-teal bg-teal-50/40"
              : "border-transparent text-slate hover:text-graphite hover:bg-bone/50"
          }`}
        >
          <Map className="w-4 h-4" />
          <span>Siteplan Visual</span>
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
          kategoriFilter={kategoriFilter}
          onSearchChange={setSearch}
          onStatusChange={setStatusFilter}
          onTipeChange={setTipeFilter}
          onKategoriChange={setKategoriFilter}
          onPageChange={handlePageChange}
          onRefresh={handleFullRefresh}
          onChangeTipe={setChangingUnit}
          isAdmin={isAdmin}
          isLoading={isPending}
        />
      )}

      {/* Tab 2: Tipe Unit */}
      {activeTab === "types" && (
        <MasterTipeTable
          data={tipeList}
          onEdit={handleEditTipe}
          onRefresh={handleFullRefresh}
          isAdmin={isAdmin}
        />
      )}

      {/* Tab 3: Siteplan Visual */}
      {activeTab === "siteplan" && (
        <UnitInventoryViewer
          units={units}
          title="Siteplan Visual &amp; Zonasi Master Unit"
          subtitle="Tampilan visual tata letak blok kavling, perumahan subsidi, dan komersil"
          onChangeTipe={isAdmin ? setChangingUnit : undefined}
        />
      )}

      {/* Modal: Form Tambah/Edit Tipe */}
      <MasterTipeForm
        isOpen={isTipeModalOpen}
        initialData={editingTipe}
        existingTipeList={tipeList}
        onClose={() => {
          setIsTipeModalOpen(false);
          setEditingTipe(null);
        }}
        onSuccess={handleFullRefresh}
      />

      {/* Modal: Setup Blok Siteplan (Single & Bulk) */}
      <MasterUnitForm
        isOpen={isUnitModalOpen}
        tipeList={tipeList}
        existingUnits={units}
        initialMode={unitModalMode}
        onClose={() => setIsUnitModalOpen(false)}
        onSuccess={handleFullRefresh}
      />

      {/* Drawer: Ganti Tipe Unit */}
      {changingUnit && (
        <ChangeTipeDrawer
          unit={changingUnit}
          tipeList={tipeList}
          isOpen={Boolean(changingUnit)}
          onClose={() => setChangingUnit(null)}
          onSuccess={handleFullRefresh}
          onOpenCreateTipe={() => {
            setChangingUnit(null);
            setActiveTab("types");
            handleAddTipe();
          }}
        />
      )}
    </div>
  );
}
