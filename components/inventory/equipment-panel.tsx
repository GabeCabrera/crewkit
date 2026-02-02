"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Package,
  AlertTriangle,
  RefreshCw,
  Layers,
  ExternalLink,
  X,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import type { Equipment, Assembly } from "./inventory-layout";

interface SyncStatus {
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  lastSyncResult: {
    success: boolean;
    created: number;
    updated: number;
    archived: number;
    errors: string[];
  } | null;
}

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasMore: boolean;
}

interface EquipmentPanelProps {
  equipment: Equipment[];
  allEquipment: Equipment[];
  syncStatus: SyncStatus;
  onSync: () => Promise<void>;
  onRefresh: () => void;
  getAssembliesUsingEquipment: (equipmentId: string) => Assembly[];
  pagination?: PaginationInfo;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  filter: string;
}

// Equipment detail panel component
function EquipmentDetailPanel({
  equipment,
  assembliesUsing,
  onClose,
}: {
  equipment: Equipment | null;
  assembliesUsing: Assembly[];
  onClose: () => void;
}) {
  if (!equipment) return null;

  const isLowStock = (equipment.inventory?.quantity || 0) < 10;
  const isOutOfStock = (equipment.inventory?.quantity || 0) === 0;

  return (
    <Sheet open={!!equipment} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {equipment.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={equipment.photoUrl}
                  alt={equipment.name}
                  className="h-16 w-16 rounded-lg object-cover border"
                />
              ) : (
                <div className="h-16 w-16 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Package className="h-8 w-8 text-slate-400" />
                </div>
              )}
              <div>
                <SheetTitle className="text-left">{equipment.name}</SheetTitle>
                <p className="text-sm text-slate-500 font-mono">{equipment.sku}</p>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Stock Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-slate-50">
              <p className="text-sm text-slate-500">In Stock</p>
              <p className={cn(
                "text-2xl font-bold",
                isOutOfStock && "text-red-600",
                isLowStock && !isOutOfStock && "text-yellow-600"
              )}>
                {equipment.inventory?.quantity || 0}
              </p>
              {isLowStock && (
                <div className="flex items-center gap-1 mt-1 text-xs text-yellow-600">
                  <AlertTriangle className="h-3 w-3" />
                  Low stock
                </div>
              )}
            </div>
            <div className="p-4 rounded-lg bg-slate-50">
              <p className="text-sm text-slate-500">Price</p>
              <p className="text-2xl font-bold">{formatCurrency(equipment.pricePerUnit)}</p>
              <p className="text-xs text-slate-500">per {equipment.unitType.toLowerCase()}</p>
            </div>
          </div>

          {/* Description */}
          {equipment.description && (
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-2">Description</h4>
              <p className="text-sm text-slate-600">{equipment.description}</p>
            </div>
          )}

          {/* Used in Assemblies */}
          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-2">
              Used in {assembliesUsing.length} {assembliesUsing.length === 1 ? "Assembly" : "Assemblies"}
            </h4>
            {assembliesUsing.length > 0 ? (
              <div className="space-y-2">
                {assembliesUsing.map((assembly) => {
                  const item = assembly.items.find(i => i.equipmentId === equipment.id);
                  return (
                    <div
                      key={assembly.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-white"
                    >
                      <div>
                        <p className="font-medium text-sm">{assembly.name}</p>
                        <p className="text-xs text-slate-500">
                          {item?.quantity || 1}× per assembly
                        </p>
                      </div>
                      <Badge variant="outline" className={cn(
                        assembly.status === "APPROVED" && "border-green-200 text-green-700",
                        assembly.status === "PENDING_APPROVAL" && "border-yellow-200 text-yellow-700",
                        assembly.status === "DRAFT" && "border-slate-200 text-slate-700",
                      )}>
                        {assembly.status === "PENDING_APPROVAL" ? "Pending" : assembly.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Not used in any assemblies yet.</p>
            )}
          </div>

          {/* BoxHero Link */}
          {equipment.boxheroId && (
            <div className="pt-4 border-t">
              <Button variant="outline" size="sm" asChild className="w-full">
                <a
                  href={`https://web.boxhero-app.com/items/${equipment.boxheroId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View in BoxHero
                </a>
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function EquipmentPanel({
  equipment,
  allEquipment,
  syncStatus,
  onSync,
  onRefresh,
  getAssembliesUsingEquipment,
  pagination,
  onLoadMore,
  isLoadingMore,
  filter,
}: EquipmentPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);

  // Filter equipment by search query
  const filteredEquipment = equipment.filter((item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(query) ||
      item.sku.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query)
    );
  });

  const getFilterTitle = () => {
    switch (filter) {
      case "equipment-low":
        return "Low Stock Equipment";
      case "equipment-out":
        return "Out of Stock Equipment";
      default:
        return "All Equipment";
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{getFilterTitle()}</h2>
          <p className="text-sm text-slate-500">
            {filteredEquipment.length} {filteredEquipment.length === 1 ? "item" : "items"}
            {pagination && filter === "equipment-all" && ` of ${pagination.totalCount}`}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search equipment..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Equipment List */}
      {filteredEquipment.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">
              {searchQuery ? "No equipment matches your search." : "No equipment found."}
            </p>
            {!searchQuery && equipment.length === 0 && (
              <Button onClick={onSync} size="sm" className="mt-4">
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync from BoxHero
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile view - Cards */}
          <div className="md:hidden space-y-2">
            {filteredEquipment.map((item) => {
              const isLowStock = (item.inventory?.quantity || 0) < 10 && (item.inventory?.quantity || 0) > 0;
              const isOutOfStock = (item.inventory?.quantity || 0) === 0;
              const assembliesUsing = getAssembliesUsingEquipment(item.id);

              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedEquipment(item)}
                  className="w-full text-left"
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex gap-3">
                        {item.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.photoUrl}
                            alt={item.name}
                            className="h-12 w-12 rounded-lg object-cover border shrink-0"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                            <Package className="h-6 w-6 text-slate-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.name}</p>
                          <p className="text-xs text-slate-500 font-mono">{item.sku}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className={cn(
                              "text-sm font-semibold",
                              isOutOfStock && "text-red-600",
                              isLowStock && "text-yellow-600"
                            )}>
                              {item.inventory?.quantity || 0} in stock
                            </span>
                            {assembliesUsing.length > 0 && (
                              <span className="flex items-center gap-1 text-xs text-slate-500">
                                <Layers className="h-3 w-3" />
                                {assembliesUsing.length}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </div>

          {/* Desktop view - Table */}
          <Card className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-center">Used In</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEquipment.map((item) => {
                  const isLowStock = (item.inventory?.quantity || 0) < 10 && (item.inventory?.quantity || 0) > 0;
                  const isOutOfStock = (item.inventory?.quantity || 0) === 0;
                  const assembliesUsing = getAssembliesUsingEquipment(item.id);

                  return (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => setSelectedEquipment(item)}
                    >
                      <TableCell>
                        {item.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.photoUrl}
                            alt={item.name}
                            className="h-10 w-10 rounded-lg object-cover border"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Package className="h-5 w-5 text-slate-400" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px]">
                        <p className="truncate">{item.name}</p>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-slate-500">
                        {item.sku}
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {item.unitType}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.pricePerUnit)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className={cn(
                            "font-semibold tabular-nums",
                            isOutOfStock && "text-red-600",
                            isLowStock && "text-yellow-600"
                          )}>
                            {item.inventory?.quantity || 0}
                          </span>
                          {(isLowStock || isOutOfStock) && (
                            <AlertTriangle className={cn(
                              "h-4 w-4",
                              isOutOfStock ? "text-red-500" : "text-yellow-500"
                            )} />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {assembliesUsing.length > 0 ? (
                          <Badge variant="secondary">
                            <Layers className="h-3 w-3 mr-1" />
                            {assembliesUsing.length}
                          </Badge>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          {/* Load More */}
          {pagination?.hasMore && onLoadMore && (
            <div className="text-center pt-2">
              <Button
                variant="outline"
                onClick={onLoadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>Load More ({pagination.totalCount - equipment.length} remaining)</>
                )}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Detail Panel */}
      <EquipmentDetailPanel
        equipment={selectedEquipment}
        assembliesUsing={selectedEquipment ? getAssembliesUsingEquipment(selectedEquipment.id) : []}
        onClose={() => setSelectedEquipment(null)}
      />
    </div>
  );
}
