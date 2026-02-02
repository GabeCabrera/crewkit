"use client";

import { Suspense } from "react";
import { TablePageSkeleton } from "@/components/layout/page-skeleton";
import { InventoryLayout } from "@/components/inventory/inventory-layout";

export default function InventoryPage() {
  return (
    <Suspense fallback={<TablePageSkeleton />}>
      <InventoryLayout />
    </Suspense>
  );
}
