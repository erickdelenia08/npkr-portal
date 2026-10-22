import React from "react";
import type { Metadata } from "next";
import { getAllMasterUnits } from "@/actions/master-unit.action";
import { UnitInventoryViewer } from "@/components/shared/UnitInventoryViewer";

export const metadata: Metadata = {
  title: "Inventaris Unit & Siteplan | Manager Portal NPKR",
  description: "Pantauan ketersediaan blok kavling dan unit perumahan New Puri Kencana",
};

export default async function ManagerUnitPage() {
  const res = await getAllMasterUnits();
  const units = res.success && res.data ? res.data : [];

  return (
    <div className="space-y-6">
      <UnitInventoryViewer
        units={units}
        title="Inventaris Unit & Siteplan Visual"
        subtitle="Monitoring ketersediaan unit, status penjualan, dan zonasi kavling perumahan New Puri Kencana"
      />
    </div>
  );
}
