"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Layers,
  Plus,
  RefreshCw,
  AlertTriangle,
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

  // Active Tab
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

  // Presets
  const [presetKategori, setPresetKategori] = useState<KategoriUnitType | undefined>(undefined);
  const [presetLuasTanah, setPresetLuasTanah] = useState<number | undefined>(undefined);
  const [pendingUnitForDrawer, setPendingUnitForDrawer] = useState<SerializedMasterUnit | null>(null);

  // Master Unit State
  const [units, setUnits] = useState<SerializedMasterUnit[]>(initialUnitsResult.units);
  const [totalUnits, setTotalUnits] = useState<number>(initialUnitsResult.total);
  const [currentPage, setCurrentPage] = useState<number>(initialUnitsResult.page);
  const [totalPages, setTotalPages] = useState<number>(initialUnitsResult.totalPages);

  // Summary State
  const [summary, setSummary] = useState<MasterUnitSummary>(initialSummary);

  // Filters
  const [search, setSearch] = useState<string>(initialParams?.q || "");
  const [statusFilter, setStatusFilter] = useState<string>(initialParams?.status || "");
  const [tipeFilter, setTipeFilter] = useState<number>(initialParams?.tipe || 0);
  const [kategoriFilter, setKategoriFilter] = useState<string>(initialParams?.kategori || "");

  const [isUnitModalOpen, setIsUnitModalOpen] = useState<boolean>(false);
  const [changingUnit, setChangingUnit] = useState<SerializedMasterUnit | null>(null);

  const [allSiteplanUnits, setAllSiteplanUnits] = useState<SerializedMasterUnit[] | null>(null);
  const [isSiteplanLoading, setIsSiteplanLoading] = useState<boolean>(false);

  const [isPending, startTransition] = useTransition();
  const latestRequestId = useRef(0);
  const isInitialMount = useRef(true);

  // Sync state to URL and fetch units
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

      if (activeTab === "units") {
        refreshUnits(currentPage, search, statusFilter, tipeFilter, kategoriFilter);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [activeTab, search, statusFilter, tipeFilter, kategoriFilter, currentPage, router]);

  // Lazy load siteplan
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

  const refreshTipeList = async () => {
    const res = await getMasterTipeList();
    if (res.success && res.data) setTipeList(res.data);
  };

  const refreshSummary = async () => {
    const res = await getMasterUnitSummary();
    if (res.success && res.data) setSummary(res.data);
  };

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

  const handleSingleUnitCreated = () => {
    setCurrentPage(1);
    handleFullRefresh();
  };

  const handleFullRefresh = () => {
    refreshTipeList();
    refreshSummary();
    refreshUnits(currentPage, search, statusFilter, tipeFilter, kategoriFilter);
    if (allSiteplanUnits !== null) {
      loadAllSiteplanUnits();
    }
  };

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

  const hasNoTipe = tipeList.length === 0;
  const hasNoUnits = !hasNoTipe && summary.total === 0;

  return (
    <div className="space-y-4 sm:space-y-5 font-sans text-zinc-900 w-full overflow-hidden">
      {/* ─── Header Bar: Mobile-Stack Friendly ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-3 sm:pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-zinc-900">
              Master Unit &amp; Tipe
            </h1>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-medium whitespace-nowrap">
              {summary.total} Unit
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-zinc-500 mt-0.5 leading-relaxed">
            Spesifikasi tipe properti dan alokasi blok unit berdasarkan siteplan.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto w-full sm:w-auto">
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-200 bg-white text-zinc-800 text-xs font-medium hover:bg-zinc-50 active:bg-zinc-100 transition-colors h-8">
                <Layers className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span>Setup Unit</span>
                <ChevronDown className="w-3 h-3 text-zinc-400 shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 text-xs">
                <DropdownMenuItem className="p-0">
                  <Link
                    href="/admin/master-unit/setup"
                    className="w-full px-3 py-2 text-zinc-700 hover:bg-zinc-50 block"
                  >
                    <span className="font-medium block">Wizard Setup Siteplan</span>
                    <span className="text-[10px] text-zinc-400 block">Inisialisasi nomor unit massal</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setIsUnitModalOpen(true)}
                  className="px-3 py-2 cursor-pointer"
                >
                  <div>
                    <span className="font-medium block">Tambah Satu Unit</span>
                    <span className="text-[10px] text-zinc-400 block">Input nomor unit manual</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {activeTab === "types" && isAdmin && (
            <button
              type="button"
              onClick={handleAddTipe}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition-colors h-8"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Tipe</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleFullRefresh}
            disabled={isPending}
            className="p-2 rounded-md border border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 active:bg-zinc-100 transition-colors disabled:opacity-50 h-8 w-8 flex items-center justify-center shrink-0"
            title="Muat Ulang Seluruh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin text-zinc-900" : ""}`} />
          </button>
        </div>
      </div>

      {/* ─── Error Alert ─── */}
      {loadError && (
        <div className="p-3 rounded-lg border border-red-200 bg-red-50/40 text-xs text-red-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>Sebagian data gagal dimuat dari server database.</span>
          </div>
          <button
            type="button"
            onClick={handleFullRefresh}
            className="self-start sm:self-auto px-2.5 py-1 rounded border border-red-300 bg-white text-red-700 hover:bg-red-50 font-medium"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* ─── Guided Alerts: No Tipe / No Units ─── */}
      {!loadError && hasNoTipe && (
        <div className="p-3.5 rounded-lg border border-zinc-200 bg-zinc-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div>
            <h3 className="font-medium text-zinc-900">Belum ada tipe unit</h3>
            <p className="text-zinc-500 mt-0.5">
              Buat spesifikasi tipe terlebih dahulu sebelum menghasilkan unit pada blok.
            </p>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setActiveTab("types");
                handleAddTipe();
              }}
              className="self-start sm:self-auto px-3 py-1.5 rounded bg-zinc-900 text-white hover:bg-zinc-800 font-medium"
            >
              Tambah Tipe
            </button>
          )}
        </div>
      )}

      {!loadError && hasNoUnits && (
        <div className="p-3.5 rounded-lg border border-zinc-200 bg-zinc-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div>
            <h3 className="font-medium text-zinc-900">Tipe unit siap, blok belum dibuat</h3>
            <p className="text-zinc-500 mt-0.5">
              Gunakan wizard setup untuk menginisialisasi nomor unit secara otomatis.
            </p>
          </div>
          {isAdmin && (
            <Link
              href="/admin/master-unit/setup"
              className="self-start sm:self-auto px-3 py-1.5 rounded bg-zinc-900 text-white hover:bg-zinc-800 font-medium"
            >
              Mulai Wizard
            </Link>
          )}
        </div>
      )}

      {/* ─── Metric Filter Cards: Clean 2x2 Grid on Mobile ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {/* Total */}
        <button
          type="button"
          onClick={() => setStatusFilter("")}
          className={`p-2.5 sm:p-3.5 rounded-lg border text-left transition-all ${statusFilter === "" || statusFilter === "ALL"
            ? "border-zinc-900 bg-zinc-50/70"
            : "border-zinc-200 bg-white hover:border-zinc-300"
            }`}
        >
          <span className="text-[10px] sm:text-[11px] font-medium text-zinc-500 block truncate">
            Total Unit
          </span>
          <div className="mt-1">
            <span className="text-lg sm:text-xl font-semibold text-zinc-900 font-mono tabular-nums block">
              {summary.total}
            </span>
            <span className="text-[9px] sm:text-[10px] text-zinc-400 font-mono block truncate mt-0.5">
              S:{summary.perKategori.SUBSIDI} • K:{summary.perKategori.KOMERSIL} • V:{summary.perKategori.KAVLING}
            </span>
          </div>
        </button>

        {/* Available */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === "AVAILABLE" ? "" : "AVAILABLE")}
          className={`p-2.5 sm:p-3.5 rounded-lg border text-left transition-all ${statusFilter === "AVAILABLE"
            ? "border-zinc-900 bg-zinc-50/70"
            : "border-zinc-200 bg-white hover:border-zinc-300"
            }`}
        >
          <span className="text-[10px] sm:text-[11px] font-medium text-zinc-500 block truncate">
            Available
          </span>
          <div className="mt-1">
            <span className="text-lg sm:text-xl font-semibold text-emerald-700 font-mono tabular-nums block">
              {summary.available}
            </span>
            <span className="text-[9px] sm:text-[10px] text-zinc-400 block truncate mt-0.5">
              Siap Dipasarkan
            </span>
          </div>
        </button>

        {/* Proses */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === "PROSES" ? "" : "PROSES")}
          className={`p-2.5 sm:p-3.5 rounded-lg border text-left transition-all ${statusFilter === "PROSES"
            ? "border-zinc-900 bg-zinc-50/70"
            : "border-zinc-200 bg-white hover:border-zinc-300"
            }`}
        >
          <span className="text-[10px] sm:text-[11px] font-medium text-zinc-500 block truncate">
            Proses
          </span>
          <div className="mt-1">
            <span className="text-lg sm:text-xl font-semibold text-amber-700 font-mono tabular-nums block">
              {summary.proses}
            </span>
            <span className="text-[9px] sm:text-[10px] text-zinc-400 block truncate mt-0.5">
              Hold &amp; Booked
            </span>
          </div>
        </button>

        {/* Sold */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === "SOLD" ? "" : "SOLD")}
          className={`p-2.5 sm:p-3.5 rounded-lg border text-left transition-all ${statusFilter === "SOLD"
            ? "border-zinc-900 bg-zinc-50/70"
            : "border-zinc-200 bg-white hover:border-zinc-300"
            }`}
        >
          <span className="text-[10px] sm:text-[11px] font-medium text-zinc-500 block truncate">
            Terjual (Sold)
          </span>
          <div className="mt-1">
            <span className="text-lg sm:text-xl font-semibold text-zinc-900 font-mono tabular-nums block">
              {summary.sold}
            </span>
            <span className="text-[9px] sm:text-[10px] text-zinc-400 block truncate mt-0.5">
              Sudah Akad / BAST
            </span>
          </div>
        </button>
      </div>

      {/* ─── Tabs Navigation: Horizontal Scroll on Mobile ─── */}
      <div className="border-b border-zinc-200 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex items-center gap-4 sm:gap-6 text-xs whitespace-nowrap min-w-max">
          <button
            type="button"
            onClick={() => setActiveTab("units")}
            className={`pb-2.5 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === "units"
              ? "border-zinc-900 text-zinc-900"
              : "border-transparent text-zinc-500 hover:text-zinc-800"
              }`}
          >
            <span>Daftar Unit</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600 font-mono">
              {totalUnits}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("types")}
            className={`pb-2.5 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === "types"
              ? "border-zinc-900 text-zinc-900"
              : "border-transparent text-zinc-500 hover:text-zinc-800"
              }`}
          >
            <span>Tipe Properti</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600 font-mono">
              {tipeList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("siteplan")}
            className={`pb-2.5 font-medium border-b-2 transition-colors ${activeTab === "siteplan"
              ? "border-zinc-900 text-zinc-900"
              : "border-transparent text-zinc-500 hover:text-zinc-800"
              }`}
          >
            <span>Siteplan Visual</span>
          </button>
        </div>
      </div>

      {/* ─── Panels ─── */}
      {activeTab === "units" && (
        <div className="w-full">
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

      {activeTab === "types" && (
        <div className="w-full">
          <MasterTipeTable
            data={tipeList}
            onEdit={handleEditTipe}
            onRefresh={handleFullRefresh}
            isAdmin={isAdmin}
          />
        </div>
      )}

      {activeTab === "siteplan" && (
        <div className="w-full">
          {isSiteplanLoading && allSiteplanUnits === null ? (
            <div className="p-8 sm:p-12 text-center text-xs text-zinc-500 border border-zinc-200 rounded-lg bg-white">
              <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-zinc-400" />
              <p>Memuat peta interaktif siteplan...</p>
            </div>
          ) : (
            <UnitInventoryViewer
              units={allSiteplanUnits || []}
              title="Siteplan Visual &amp; Zonasi"
              subtitle="Tata letak blok kavling, perumahan subsidi, dan komersil"
              hideHeader={true}
              showListView={false}
              onChangeTipe={isAdmin ? setChangingUnit : undefined}
            />
          )}
        </div>
      )}

      {/* Form Modal: Tipe */}
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
        onCreated={() => {
          if (pendingUnitForDrawer) {
            setChangingUnit(pendingUnitForDrawer);
            setPendingUnitForDrawer(null);
          }
        }}
        onSuccess={handleFullRefresh}
      />

      {/* Form Modal: Single Unit */}
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