"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Layers,
  AlertTriangle,
  RefreshCw,
  Cloud,
  ExternalLink,
  Check,
  AlertCircle,
  Package,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import type { Equipment, Assembly } from "@/app/admin/inventory/page";

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

interface EquipmentTableProps {
  equipment: Equipment[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  onSync: () => Promise<void>;
  syncStatus: SyncStatus;
  getAssembliesUsingEquipment: (equipmentId: string) => Assembly[];
  onNavigateToAssemblies: (equipmentName: string) => void;
  pagination?: PaginationInfo;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}

// Mobile Equipment Card Component
function EquipmentCard({
  item,
  assembliesUsing,
  onNavigateToAssemblies,
}: {
  item: Equipment;
  assembliesUsing: Assembly[];
  onNavigateToAssemblies: (name: string) => void;
}) {
  const isLowStock = (item.inventory?.quantity || 0) < 10;

  return (
    <div className="flex gap-3 p-3 bg-white rounded-lg border shadow-sm">
      {/* Photo */}
      <div className="shrink-0">
        {item.photoUrl ? (
          <img 
            src={item.photoUrl} 
            alt={item.name}
            className="h-14 w-14 rounded-lg object-cover border"
          />
        ) : (
          <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center">
            <Package className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm leading-tight line-clamp-2">{item.name}</h4>
        <p className="text-xs text-muted-foreground font-mono mt-0.5">{item.sku}</p>
        
        {/* Stats row */}
        <div className="flex items-center gap-3 mt-2">
          {/* Stock */}
          <div className="flex items-center gap-1">
            <span className={cn(
              "text-sm font-semibold",
              isLowStock && "text-red-600"
            )}>
              {item.inventory?.quantity || 0}
            </span>
            <span className="text-xs text-muted-foreground">in stock</span>
            {isLowStock && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
          </div>
          
          {/* Price */}
          <span className="text-xs text-muted-foreground">
            {formatCurrency(item.pricePerUnit)}
          </span>
          
          {/* Assemblies */}
          {assembliesUsing.length > 0 && (
            <button
              onClick={() => onNavigateToAssemblies(item.name)}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Layers className="h-3 w-3" />
              {assembliesUsing.length}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function EquipmentTable({
  equipment,
  searchValue,
  onSearchChange,
  onRefresh,
  onSync,
  syncStatus,
  getAssembliesUsingEquipment,
  onNavigateToAssemblies,
  pagination,
  onLoadMore,
  isLoadingMore,
}: EquipmentTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [unitTypeFilter, setUnitTypeFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  // Format relative time
  const formatLastSync = (date: Date | null) => {
    if (!date) return "Never";
    
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  // Apply filters
  const filteredEquipment = equipment.filter(item => {
    if (unitTypeFilter !== "all" && item.unitType !== unitTypeFilter) return false;
    
    const qty = item.inventory?.quantity || 0;
    if (stockFilter === "low" && qty >= 10) return false;
    if (stockFilter === "in-stock" && qty === 0) return false;
    if (stockFilter === "out-of-stock" && qty > 0) return false;
    
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Sync Status Banner - Collapsible on mobile */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Left side */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                <Cloud className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm">BoxHero Sync</p>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Equipment is managed via BoxHero integration
                </p>
              </div>
            </div>
            
            {/* Right side */}
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
              {/* Last sync info */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Synced:</span>
                <span className="font-medium">{formatLastSync(syncStatus.lastSyncedAt)}</span>
                {syncStatus.lastSyncResult && (
                  syncStatus.lastSyncResult.success ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )
                )}
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button 
                  onClick={onSync}
                  disabled={syncStatus.isSyncing}
                  size="sm"
                  className="h-8"
                >
                  <RefreshCw className={cn("h-4 w-4", syncStatus.isSyncing && "animate-spin")} />
                  <span className="hidden sm:inline ml-2">
                    {syncStatus.isSyncing ? "Syncing..." : "Sync"}
                  </span>
                </Button>
                
                <Button variant="outline" size="sm" asChild className="h-8">
                  <a 
                    href="https://web.boxhero-app.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span className="hidden sm:inline ml-2">BoxHero</span>
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search equipment..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        
        {/* Filters */}
        <div className="flex gap-2">
          <Select value={unitTypeFilter} onValueChange={setUnitTypeFilter}>
            <SelectTrigger className="flex-1 sm:flex-none sm:w-[130px] h-9">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="UNIT">Unit</SelectItem>
              <SelectItem value="BOX">Box</SelectItem>
              <SelectItem value="CASE">Case</SelectItem>
              <SelectItem value="PALLET">Pallet</SelectItem>
              <SelectItem value="FOOT">Foot</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={stockFilter} onValueChange={setStockFilter}>
            <SelectTrigger className="flex-1 sm:flex-none sm:w-[130px] h-9">
              <SelectValue placeholder="Stock" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stock</SelectItem>
              <SelectItem value="in-stock">In Stock</SelectItem>
              <SelectItem value="low">Low Stock</SelectItem>
              <SelectItem value="out-of-stock">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Mobile View - Card List */}
      <div className="md:hidden space-y-2">
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-muted-foreground">
            {equipment.length}{pagination ? ` of ${pagination.totalCount}` : ""} items
          </p>
          <Button variant="ghost" size="sm" onClick={onRefresh} className="h-8">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        
        {filteredEquipment.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {equipment.length === 0 && !searchValue ? (
                <div className="space-y-2">
                  <p>No equipment synced yet.</p>
                  <Button onClick={onSync} size="sm">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync from BoxHero
                  </Button>
                </div>
              ) : (
                <p>No equipment found. {searchValue && "Try adjusting your search."}</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredEquipment.map((item) => (
              <EquipmentCard
                key={item.id}
                item={item}
                assembliesUsing={getAssembliesUsingEquipment(item.id)}
                onNavigateToAssemblies={onNavigateToAssemblies}
              />
            ))}
            
            {/* Load More Button - Mobile */}
            {pagination?.hasMore && onLoadMore && (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={onLoadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>Load More ({pagination.totalCount - equipment.length} remaining)</>
                )}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Desktop View - Table */}
      <Card className="hidden md:block">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Equipment List</CardTitle>
              <CardDescription>
                {equipment.length}{pagination ? ` of ${pagination.totalCount}` : ""} items
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="w-16">Photo</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden lg:table-cell">SKU</TableHead>
                  <TableHead className="hidden xl:table-cell">Type</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead className="hidden lg:table-cell">Used In</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEquipment.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      {equipment.length === 0 && !searchValue ? (
                        <div className="space-y-2">
                          <p>No equipment synced yet.</p>
                          <Button onClick={onSync} size="sm">
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Sync from BoxHero
                          </Button>
                        </div>
                      ) : (
                        <>No equipment found. {searchValue && "Try adjusting your search."}</>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEquipment.map((item) => {
                    const assembliesUsing = getAssembliesUsingEquipment(item.id);
                    const isLowStock = (item.inventory?.quantity || 0) < 10;
                    const isExpanded = expandedRows.has(item.id);

                    return (
                      <>
                        <TableRow key={item.id} className={cn(isExpanded && "border-b-0")}>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => toggleRow(item.id)}
                              disabled={assembliesUsing.length === 0}
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell>
                            {item.photoUrl ? (
                              <img 
                                src={item.photoUrl} 
                                alt={item.name}
                                className="h-10 w-10 rounded-lg object-cover border"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                                <Package className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium max-w-[200px] lg:max-w-[300px]">
                            <p className="truncate">{item.name}</p>
                            {/* Show SKU inline on smaller screens */}
                            <p className="text-xs text-muted-foreground font-mono lg:hidden">
                              {item.sku}
                            </p>
                          </TableCell>
                          <TableCell className="font-mono text-sm hidden lg:table-cell">
                            {item.sku}
                          </TableCell>
                          <TableCell className="hidden xl:table-cell">{item.unitType}</TableCell>
                          <TableCell>{formatCurrency(item.pricePerUnit)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <span className={cn(
                                "font-medium tabular-nums",
                                isLowStock && "text-red-600"
                              )}>
                                {item.inventory?.quantity || 0}
                              </span>
                              {isLowStock && (
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {assembliesUsing.length > 0 ? (
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-primary"
                                onClick={() => onNavigateToAssemblies(item.name)}
                              >
                                <Layers className="mr-1 h-3 w-3" />
                                {assembliesUsing.length}
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                        {isExpanded && assembliesUsing.length > 0 && (
                          <TableRow key={`${item.id}-expanded`}>
                            <TableCell colSpan={8} className="bg-muted/50 py-3">
                              <div className="px-4">
                                <p className="text-sm font-medium mb-2">Used in assemblies:</p>
                                <div className="flex flex-wrap gap-2">
                                  {assembliesUsing.map((asm) => (
                                    <Button
                                      key={asm.id}
                                      variant="outline"
                                      size="sm"
                                      className="h-7"
                                      onClick={() => onNavigateToAssemblies(asm.name)}
                                    >
                                      {asm.name}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })
                )}
                {/* Load More Row - Desktop */}
                {pagination?.hasMore && onLoadMore && filteredEquipment.length > 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-4">
                      <Button 
                        variant="outline" 
                        onClick={onLoadMore}
                        disabled={isLoadingMore}
                      >
                        {isLoadingMore ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>Load More ({pagination.totalCount - equipment.length} remaining)</>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
