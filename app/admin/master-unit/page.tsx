import React from "react";
import type { Metadata } from "next";
import {
  getMasterTipeList,
  getMasterUnits,
  getMasterUnitSummary,
  getCurrentUserRole,
} from "@/actions/master-unit.action";
import { MasterUnitClient } from "@/components/tables/master-unit-client";

export const metadata: Metadata = {
  title: "Master Unit & Tipe | Admin Portal NPKR",
  description: "Manajemen data master tipe perumahan dan inventori blok unit",
};

export default async function MasterUnitPage() {
  // Fetch initial data on the server for fast, SEO-friendly initial render
  const [tipeRes, unitsRes, summaryRes, roleRes] = await Promise.all([
    getMasterTipeList(),
    getMasterUnits({ page: 1, limit: 15 }),
    getMasterUnitSummary(),
    getCurrentUserRole(),
  ]);

  const initialTipeList = tipeRes.success && tipeRes.data ? tipeRes.data : [];
  const initialUnitsResult =
    unitsRes.success && unitsRes.data
      ? unitsRes.data
      : { units: [], total: 0, page: 1, totalPages: 1 };
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
    />
  );
}
