"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { STATS_RANGES, type StatsRange } from "@/lib/admin-types";

function AdminView() {
  const raw = useSearchParams().get("range");
  const range: StatsRange = (STATS_RANGES as readonly string[]).includes(raw ?? "") ? (raw as StatsRange) : "7d";
  return <AdminDashboard range={range} />;
}

export default function AdminPage() {
  return (
    <Suspense fallback={null}>
      <AdminView />
    </Suspense>
  );
}
