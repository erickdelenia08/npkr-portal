import React from "react";
import type { Metadata } from "next";
import { getAllMasterUnits } from "@/actions/master-unit.action";
import { UnitInventoryViewer } from "@/components/shared/UnitInventoryViewer";

export const metadata: Metadata = {
  title: "Katalog Unit & Siteplan | Marketing Portal NPKR",
  description: "Cek ketersediaan kavling, tipe komersil, dan unit subsidi secara real-time",
};

export default async function MarketingUnitPage() {
  const res = await getAllMasterUnits();
  const units = res.success && res.data ? res.data : [];

  return (
    <div className="space-y-6">
      <UnitInventoryViewer
        units={units}
        title="Katalog Unit & Ketersediaan Blok"
        subtitle="Cek ketersediaan kavling, tipe komersil, dan unit subsidi secara real-time sebelum reservasi ITJ"
      />
    </div>
  );
}
