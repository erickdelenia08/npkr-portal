"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  Layers,
  PlusCircle,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Clock,
  Map,
  Plus,
  Lock,
  AlertTriangle,
  RotateCcw,
  ChevronDown,
} from "lucide-react";
import {
  getMasterTipeList,
  getMasterUnits,
  getMasterUnitSummary,
  getAllMasterUnits,
} from "@/actions/master-unit.action";
import type {
  SerializedMasterTipe,
  SerializedMasterUnit,
  PaginatedUnitsResult,
  MasterUnitSummary,
} from "@/actions/master-unit.action";
import { KategoriUnitType } from "@/schemas/master-unit.schema";
import { MasterTipeTable } from "@/components/tables/master-tipe-table";
import { MasterUnitTable } from "@/components/tables/master-unit-table";
import { MasterTipeForm } from "@/components/forms/master-tipe-form";
import { MasterUnitForm } from "@/components/forms/master-unit-form";
import { ChangeTipeDrawer } from "@/components/forms/change-tipe-drawer";
import { UnitInventoryViewer } from "@/components/shared/UnitInventoryViewer";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface MasterUnitClientProps {
  initialTipeList: SerializedMasterTipe[];
  initialUnitsResult: PaginatedUnitsResult;
  initialSummary: MasterUnitSummary;
  isAdmin?: boolean;
  loadError?: boolean;
  initialParams?: {
    tab?: string;
    q?: string;
    status?: string;
    tipe?: number;
    kategori?: string;
    page?: number;
  };
}

export function MasterUnitClient({
  initialTipeList,
  initialUnitsResult,
  initialSummary,
  isAdmin = true,
  loadError = false,
  initialParams,
}: MasterUnitClientProps) {
  const router = useRouter();

  // Active Tab: "units" | "types" | "siteplan"
  const [activeTab, setActiveTab] = useState<"units" | "types" | "siteplan">(
    initialParams?.tab === "types" || initialParams?.tab === "tipe"
      ? "types"
      : initialParams?.tab === "siteplan"
      ? "siteplan"
      : "units"
  );

  // Master Tipe State
  const [tipeList, setTipeList] = useState<SerializedMasterTipe[]>(initialTipeList);
  const [isTipeModalOpen, setIsTipeModalOpen] = useState<boolean>(false);
  const [editingTipe, setEditingTipe] = useState<SerializedMasterTipe | null>(null);

  // Preset props for MasterTipeForm (when launched from ChangeTipeDrawer)
  const [presetKategori, setPresetKategori] = useState<KategoriUnitType | undefined>(undefined);
  const [presetLuasTanah, setPresetLuasTanah] = useState<number | undefined>(undefined);
  const [pendingUnitForDrawer, setPendingUnitForDrawer] = useState<SerializedMasterUnit | null>(null);

  // Master Unit State
  const [units, setUnits] = useState<SerializedMasterUnit[]>(initialUnitsResult.units);
  const [totalUnits, setTotalUnits] = useState<number>(initialUnitsResult.total);
  const [currentPage, setCurrentPage] = useState<number>(initialUnitsResult.page);
  const [totalPages, setTotalPages] = useState<number>(initialUnitsResult.totalPages);

  // Server Summary State
  const [summary, setSummary] = useState<MasterUnitSummary>(initialSummary);

  // Filters
  const [search, setSearch] = useState<string>(initialParams?.q || "");
  const [statusFilter, setStatusFilter] = useState<string>(initialParams?.status || "");
  const [tipeFilter, setTipeFilter] = useState<number>(initialParams?.tipe || 0);
  const [kategoriFilter, setKategoriFilter] = useState<string>(initialParams?.kategori || "");

  // Modal State for Single Unit Creation
  const [isUnitModalOpen, setIsUnitModalOpen] = useState<boolean>(false);

  // Change Tipe Drawer State
  const [changingUnit, setChangingUnit] = useState<SerializedMasterUnit | null>(null);

  // Siteplan All-Units State (Lazy loaded)
  const [allSiteplanUnits, setAllSiteplanUnits] = useState<SerializedMasterUnit[] | null>(null);
  const [isSiteplanLoading, setIsSiteplanLoading] = useState<boolean>(false);

  const [isPending, startTransition] = useTransition();

  // Out-of-order request guard
  const latestRequestId = useRef(0);
  const isInitialMount = useRef(true);

  // Sync state to URL with router.replace (debounced)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      const sp = new URLSearchParams();
      if (activeTab !== "units") sp.set("tab", activeTab === "types" ? "tipe" : activeTab);
      if (search.trim()) sp.set("q", search.trim());
      if (statusFilter && statusFilter !== "ALL") sp.set("status", statusFilter);
      if (tipeFilter && tipeFilter > 0) sp.set("tipe", String(tipeFilter));
      if (kategoriFilter && kategoriFilter !== "ALL") sp.set("kategori", kategoriFilter);
      if (currentPage > 1) sp.set("page", String(currentPage));

      const queryStr = sp.toString();
      const newUrl = `/admin/master-unit${queryStr ? `?${queryStr}` : ""}`;
      router.replace(newUrl, { scroll: false });

      // Trigger server fetch with request ID guard
      refreshUnits(currentPage, search, statusFilter, tipeFilter, kategoriFilter);
    }, 250);

    return () => clearTimeout(timer);
  }, [activeTab, search, statusFilter, tipeFilter, kategoriFilter, currentPage, router]);

  // Lazy load all siteplan units when Siteplan tab opens
  useEffect(() => {
    if (activeTab === "siteplan" && allSiteplanUnits === null && !isSiteplanLoading) {
      loadAllSiteplanUnits();
    }
  }, [activeTab, allSiteplanUnits, isSiteplanLoading]);

  const loadAllSiteplanUnits = async () => {
    setIsSiteplanLoading(true);
    try {
      const res = await getAllMasterUnits();
      if (res.success && res.data) {
        setAllSiteplanUnits(res.data);
      }
    } catch (err: unknown) {
      console.error("Failed to load siteplan units:", err);
    } finally {
      setIsSiteplanLoading(false);
    }
  };

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

  // Refresh Units with request-id guard
  const refreshUnits = async (
    page = currentPage,
    query = search,
    status = statusFilter,
    tipeId = tipeFilter,
    kategori = kategoriFilter
  ) => {
    const reqId = ++latestRequestId.current;

    startTransition(async () => {
      const res = await getMasterUnits({
        page,
        limit: 15,
        search: query || undefined,
        status: status && status !== "ALL" ? status : undefined,
        tipeId: tipeId && tipeId > 0 ? tipeId : undefined,
        kategori: kategori && kategori !== "ALL" ? kategori : undefined,
      });

      // Ignore out-of-order response if a newer request was sent
      if (reqId !== latestRequestId.current) return;

      if (res.success && res.data) {
        setUnits(res.data.units);
        setTotalUnits(res.data.total);
        setCurrentPage(res.data.page);
        setTotalPages(res.data.totalPages);
      }
    });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleEditTipe = (tipe: SerializedMasterTipe) => {
    setEditingTipe(tipe);
    setPresetKategori(undefined);
    setPresetLuasTanah(undefined);
    setIsTipeModalOpen(true);
  };

  const handleAddTipe = () => {
    setEditingTipe(null);
    setPresetKategori(undefined);
    setPresetLuasTanah(undefined);
    setIsTipeModalOpen(true);
  };

  // After single unit creation, reset to page 1
  const handleSingleUnitCreated = () => {
    setCurrentPage(1);
    handleFullRefresh();
  };

  // Refresh all data
  const handleFullRefresh = () => {
    refreshTipeList();
    refreshSummary();
    refreshUnits(currentPage, search, statusFilter, tipeFilter, kategoriFilter);
    if (allSiteplanUnits !== null) {
      loadAllSiteplanUnits();
    }
  };

  // Handler when ChangeTipeDrawer requests creating a compatible new tipe
  const handleRequestCreateTipeForDrawer = (preset: {
    kategori: KategoriUnitType;
    luas_tanah: number;
    unit: SerializedMasterUnit;
  }) => {
    setPendingUnitForDrawer(preset.unit);
    setPresetKategori(preset.kategori);
    setPresetLuasTanah(preset.luas_tanah);
    setEditingTipe(null);
    setChangingUnit(null);
    setIsTipeModalOpen(true);
  };

  // Rule: hasNoUnits must be summary.total === 0 (not filtered totalUnits)
  const hasNoTipe = tipeList.length === 0;
  const hasNoUnits = !hasNoTipe && summary.total === 0;

  return (
    <div className="space-y-4">
      {/* Page Title & Top Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-lg border border-mist shadow-subtle">
        <div>
          <h1 className="text-xl font-bold text-carbon-ink tracking-tight font-heading">
            Master Unit &amp; Tipe
          </h1>
          <p className="text-xs text-slate mt-0.5">
            Manajemen spesifikasi tipe properti dan inventori blok unit berdasarkan siteplan legal
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Header Actions for Admin */}
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-white border border-mist text-carbon-ink text-xs font-semibold hover:bg-bone transition-colors shadow-2xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label="Menu Setup Unit Siteplan"
              >
                <Layers className="w-4 h-4 text-prism-teal" />
                <span>Setup Unit Siteplan</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate ml-0.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem className="p-0">
                  <Link
                    href="/admin/master-unit/setup"
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-graphite hover:bg-bone"
                  >
                    <Sparkles className="w-4 h-4 text-prism-teal shrink-0" />
                    <div>
                      <span className="font-semibold block">Setup Siteplan (wizard)</span>
                      <span className="text-[10px] text-slate block">
                        Wizard 3-langkah setup unit massal
                      </span>
                    </div>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => setIsUnitModalOpen(true)}
                  className="gap-2 cursor-pointer text-xs"
                >
                  <Plus className="w-4 h-4 text-slate" />
                  <div>
                    <span className="font-semibold block">Tambah Satu Unit</span>
                    <span className="text-[10px] text-slate block">Input nomor unit satuan</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {activeTab === "types" && isAdmin && (
            <button
              type="button"
              onClick={handleAddTipe}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-prism-teal text-white text-xs font-semibold hover:bg-deep-teal transition-colors shadow-2xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Tambah Tipe</span>
            </button>
          )}

          {/* Full Refresh Button */}
          <button
            type="button"
            onClick={handleFullRefresh}
            disabled={isPending}
            className="p-1.5 rounded-md border border-mist bg-white text-slate hover:text-graphite hover:bg-bone transition-colors disabled:opacity-50"
            title="Muat ulang seluruh data inventori"
          >
            <RefreshCw className={`w-4 h-4 ${isPending ? "animate-spin text-prism-teal" : ""}`} />
          </button>
        </div>
      </div>

      {/* ERROR PANEL: When initial server load fails */}
      {loadError && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 flex items-center justify-between text-xs text-rose-800">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <strong className="block font-semibold">Gagal Memuat Sebagian Data</strong>
              <span>Terjadi kendala jaringan saat menghubungi database.</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleFullRefresh}
            className="px-3 py-1.5 rounded bg-white border border-rose-300 text-rose-700 hover:bg-rose-100 font-semibold"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Guided Empty States (Do NOT render if loadError is true) */}
      {!loadError && hasNoTipe && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900 font-heading">
                Langkah 1: Mulai dengan membuat tipe unit
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                Spesifikasi tipe unit diperlukan sebelum Anda dapat menghasilkan blok unit pada siteplan.
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold shrink-0 shadow-xs transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Tambah Tipe Sekarang</span>
            </button>
          )}
        </div>
      )}

      {!loadError && hasNoUnits && (
        <div className="bg-teal-50/80 border border-teal-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-md bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4 text-prism-teal" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-deep-teal font-heading">
                Langkah 2: Setup blok unit siteplan Anda
              </h3>
              <p className="text-xs text-teal-800 mt-0.5">
                Tipe unit sudah tersedia. Gunakan wizard setup untuk menginisialisasi nomor unit kavling.
              </p>
            </div>
          </div>
          {isAdmin && (
            <Link
              href="/admin/master-unit/setup"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-prism-teal hover:bg-deep-teal text-white text-xs font-semibold shrink-0 shadow-xs transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>Mulai Setup Siteplan (Wizard)</span>
            </Link>
          )}
        </div>
      )}

      {/* Compact Metric Summary Cards (All on 1 row with label + number + icon) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Total Unit Card */}
        <button
          type="button"
          aria-pressed={statusFilter === "" || statusFilter === "ALL"}
          onClick={() => setStatusFilter("")}
          className={`p-3 rounded-lg border text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-carbon-ink ${
            statusFilter === "" || statusFilter === "ALL"
              ? "bg-white border-carbon-ink ring-1 ring-carbon-ink/10 shadow-xs"
              : "bg-white border-mist hover:border-slate/60 shadow-2xs"
          }`}
          title="Klik untuk melihat semua unit"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate uppercase tracking-wider">
              Total Unit
            </span>
            <div className="w-6 h-6 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-bold text-carbon-ink font-mono">
              {summary.total}
            </span>
            <span className="text-[10px] text-slate font-mono">
              S:{summary.perKategori.SUBSIDI} • K:{summary.perKategori.KOMERSIL} • V:{summary.perKategori.KAVLING}
            </span>
          </div>
        </button>

        {/* Available Card */}
        <button
          type="button"
          aria-pressed={statusFilter === "AVAILABLE"}
          onClick={() => setStatusFilter(statusFilter === "AVAILABLE" ? "" : "AVAILABLE")}
          className={`p-3 rounded-lg border text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
            statusFilter === "AVAILABLE"
              ? "bg-emerald-50/40 border-emerald-500 ring-1 ring-emerald-500/20 shadow-xs"
              : "bg-white border-mist hover:border-emerald-300 shadow-2xs"
          }`}
          title="Klik untuk memfilter unit AVAILABLE"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
              AVAILABLE
            </span>
            <div className="w-6 h-6 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1">
            <span className="text-xl font-bold text-emerald-600 font-mono">
              {summary.available}
            </span>
          </div>
        </button>

        {/* Dalam Proses Card (PROSES -> HOLD + BOOKED) */}
        <button
          type="button"
          aria-pressed={statusFilter === "PROSES"}
          onClick={() => setStatusFilter(statusFilter === "PROSES" ? "" : "PROSES")}
          className={`p-3 rounded-lg border text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
            statusFilter === "PROSES"
              ? "bg-amber-50/40 border-amber-500 ring-1 ring-amber-500/20 shadow-xs"
              : "bg-white border-mist hover:border-amber-300 shadow-2xs"
          }`}
          title="Klik untuk memfilter unit Dalam Proses (HOLD + BOOKED)"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">
              Dalam Proses
            </span>
            <div className="w-6 h-6 rounded bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1">
            <span className="text-xl font-bold text-amber-600 font-mono">
              {summary.proses}
            </span>
          </div>
        </button>

        {/* Sold Card */}
        <button
          type="button"
          aria-pressed={statusFilter === "SOLD"}
          onClick={() => setStatusFilter(statusFilter === "SOLD" ? "" : "SOLD")}
          className={`p-3 rounded-lg border text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-slate-500 ${
            statusFilter === "SOLD"
              ? "bg-slate-100 border-slate-500 ring-1 ring-slate-500/20 shadow-xs"
              : "bg-white border-mist hover:border-slate/60 shadow-2xs"
          }`}
          title="Klik untuk memfilter unit Terjual (SOLD)"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate uppercase tracking-wider">
              SOLD
            </span>
            <div className="w-6 h-6 rounded bg-slate-100 text-slate-700 flex items-center justify-center">
              <Lock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1">
            <span className="text-xl font-bold text-slate-700 font-mono">
              {summary.sold}
            </span>
          </div>
        </button>
      </div>

      {/* Recap Chips: Scrollable single row of chips that filter by tipe */}
      {tipeList.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-thin text-xs">
          <span className="text-slate font-semibold text-[11px] shrink-0 mr-1 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-prism-teal" />
            <span>Tipe:</span>
          </span>
          {tipeList.map((t) => {
            const count = t.jumlah_unit ?? t._count?.units ?? 0;
            const isSelected = tipeFilter === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTipeFilter(isSelected ? 0 : t.id)}
                className={`px-2.5 py-1 rounded text-xs shrink-0 transition-all flex items-center gap-1.5 border ${
                  isSelected
                    ? "bg-deep-teal text-white border-deep-teal font-semibold shadow-xs"
                    : "bg-white text-graphite border-mist hover:bg-bone"
                }`}
              >
                <span className="font-mono">{t.nama_tipe}</span>
                <span
                  className={`font-mono text-[10px] px-1.5 py-0.2 rounded font-bold ${
                    isSelected ? "bg-white/20 text-white" : "bg-bone text-deep-teal"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
          <div className="px-2.5 py-1 rounded bg-bone border border-mist flex items-center gap-1.5 shrink-0 ml-auto">
            <span className="text-[11px] text-slate">Total Unit:</span>
            <span className="font-mono font-bold text-deep-teal">{summary.total}</span>
          </div>
        </div>
      )}

      {/* Accessible Tabs Navigation */}
      <div
        role="tablist"
        aria-label="Navigasi Master Unit"
        className="flex items-center gap-2 border-b border-mist pt-1"
      >
        <button
          id="tab-units"
          role="tab"
          type="button"
          aria-selected={activeTab === "units"}
          aria-controls="panel-units"
          onClick={() => setActiveTab("units")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-all outline-none focus-visible:ring-1 focus-visible:ring-prism-teal ${
            activeTab === "units"
              ? "border-prism-teal text-deep-teal bg-teal-50/40"
              : "border-transparent text-slate hover:text-graphite hover:bg-bone/50"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Daftar Blok / Unit</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-bone text-graphite font-mono">
            {totalUnits}
          </span>
        </button>

        <button
          id="tab-types"
          role="tab"
          type="button"
          aria-selected={activeTab === "types"}
          aria-controls="panel-types"
          onClick={() => setActiveTab("types")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-all outline-none focus-visible:ring-1 focus-visible:ring-prism-teal ${
            activeTab === "types"
              ? "border-prism-teal text-deep-teal bg-teal-50/40"
              : "border-transparent text-slate hover:text-graphite hover:bg-bone/50"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Tipe Unit</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-bone text-graphite font-mono">
            {tipeList.length}
          </span>
        </button>

        <button
          id="tab-siteplan"
          role="tab"
          type="button"
          aria-selected={activeTab === "siteplan"}
          aria-controls="panel-siteplan"
          onClick={() => setActiveTab("siteplan")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-all outline-none focus-visible:ring-1 focus-visible:ring-prism-teal ${
            activeTab === "siteplan"
              ? "border-prism-teal text-deep-teal bg-teal-50/40"
              : "border-transparent text-slate hover:text-graphite hover:bg-bone/50"
          }`}
        >
          <Map className="w-4 h-4" />
          <span>Siteplan Visual</span>
        </button>
      </div>

      {/* Tab Panels */}
      {/* Panel 1: Daftar Blok / Unit */}
      {activeTab === "units" && (
        <div id="panel-units" role="tabpanel" aria-labelledby="tab-units">
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
        </div>
      )}

      {/* Panel 2: Tipe Unit */}
      {activeTab === "types" && (
        <div id="panel-types" role="tabpanel" aria-labelledby="tab-types">
          <MasterTipeTable
            data={tipeList}
            onEdit={handleEditTipe}
            onRefresh={handleFullRefresh}
            isAdmin={isAdmin}
          />
        </div>
      )}

      {/* Panel 3: Siteplan Visual (Lazy loaded, independent of table pagination) */}
      {activeTab === "siteplan" && (
        <div id="panel-siteplan" role="tabpanel" aria-labelledby="tab-siteplan">
          {isSiteplanLoading && allSiteplanUnits === null ? (
            <div className="bg-white rounded-lg border border-mist p-12 text-center text-xs text-slate space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-prism-teal border-t-transparent animate-spin mx-auto" />
              <p className="font-medium text-graphite">Memuat seluruh unit siteplan...</p>
            </div>
          ) : (
            <UnitInventoryViewer
              units={allSiteplanUnits || []}
              title="Siteplan Visual & Zonasi Master Unit"
              subtitle="Tampilan visual tata letak blok kavling, perumahan subsidi, dan komersil"
              hideHeader={true}
              showListView={false}
              onChangeTipe={isAdmin ? setChangingUnit : undefined}
            />
          )}
        </div>
      )}

      {/* Modal: Form Tambah/Edit Tipe */}
      <MasterTipeForm
        isOpen={isTipeModalOpen}
        initialData={editingTipe}
        presetKategori={presetKategori}
        presetLuasTanah={presetLuasTanah}
        existingTipeList={tipeList}
        onClose={() => {
          setIsTipeModalOpen(false);
          setEditingTipe(null);
          setPresetKategori(undefined);
          setPresetLuasTanah(undefined);
        }}
        onCreated={(createdTipe) => {
          // If launched from ChangeTipeDrawer, reopen the drawer with this newly created tipe
          if (pendingUnitForDrawer) {
            setChangingUnit(pendingUnitForDrawer);
            setPendingUnitForDrawer(null);
          }
        }}
        onSuccess={handleFullRefresh}
      />

      {/* Modal: Tambah Satu Unit */}
      <MasterUnitForm
        isOpen={isUnitModalOpen}
        tipeList={tipeList}
        onClose={() => setIsUnitModalOpen(false)}
        onSuccess={handleSingleUnitCreated}
      />

      {/* Drawer: Ganti Tipe Unit */}
      {changingUnit && (
        <ChangeTipeDrawer
          unit={changingUnit}
          tipeList={tipeList}
          isOpen={Boolean(changingUnit)}
          onClose={() => setChangingUnit(null)}
          onSuccess={handleFullRefresh}
          onRequestCreateTipe={handleRequestCreateTipeForDrawer}
        />
      )}
    </div>
  );
}
