import React from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import {
  getMasterTipeList,
  getMasterUnits,
  getMasterUnitSummary,
  getCurrentUserRole,
} from "@/actions/master-unit.action";
import { MasterUnitClient } from "@/components/tables/master-unit-client";

export const metadata: Metadata = {
  title: "Master Unit & Tipe | Admin Portal NPKR",
  description: "Manajemen data master tipe perumahan dan inventori blok unit siteplan.",
};

interface MasterUnitPageProps {
  searchParams: Promise<{
    tab?: string;
    q?: string;
    status?: string;
    tipe?: string;
    kategori?: string;
    page?: string;
  }>;
}

export default async function MasterUnitPage({ searchParams }: MasterUnitPageProps) {
  await connection();
  const params = await searchParams;

  const page = params.page ? parseInt(params.page, 10) : 1;
  const search = params.q || "";
  const status = params.status || "";
  const tipeId = params.tipe ? parseInt(params.tipe, 10) : undefined;
  const kategori = params.kategori || "";
  const activeTab = params.tab || "units";

  const [tipeRes, unitsRes, summaryRes, roleRes] = await Promise.all([
    getMasterTipeList(),
    getMasterUnits({
      page: isNaN(page) || page < 1 ? 1 : page,
      limit: 15,
      search: search || undefined,
      status: status && status !== "ALL" ? status : undefined,
      tipeId: tipeId && !isNaN(tipeId) && tipeId > 0 ? tipeId : undefined,
      kategori: kategori && kategori !== "ALL" ? kategori : undefined,
    }),
    getMasterUnitSummary(),
    getCurrentUserRole(),
  ]);

  const loadError = !tipeRes.success || !unitsRes.success || !summaryRes.success;

  const initialTipeList = tipeRes.success && tipeRes.data ? tipeRes.data : [];
  const initialUnitsResult =
    unitsRes.success && unitsRes.data
      ? unitsRes.data
      : { units: [], total: 0, page: 1, totalPages: 1, limit: 15 };
  const initialSummary =
    summaryRes.success && summaryRes.data
      ? summaryRes.data
      : {
        total: 0,
        available: 0,
        proses: 0,
        sold: 0,
        perKategori: { SUBSIDI: 0, KOMERSIL: 0, KAVLING: 0 },
      };

  return (
    <MasterUnitClient
      initialTipeList={initialTipeList}
      initialUnitsResult={initialUnitsResult}
      initialSummary={initialSummary}
      isAdmin={roleRes.isAdmin}
      loadError={loadError}
      initialParams={{
        tab: activeTab,
        q: search,
        status,
        tipe: tipeId,
        kategori,
        page: isNaN(page) || page < 1 ? 1 : page,
      }}
    />
  );
}