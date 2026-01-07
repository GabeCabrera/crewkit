"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TablePageSkeleton, PageContent } from "@/components/layout/page-skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Package, AlertTriangle, ChevronLeft, ChevronRight, Box, TrendingDown, XCircle } from "lucide-react";

interface InventoryItem {
  id: string;
  quantity: number;
  equipment: {
    id: string;
    name: string;
    sku: string;
    unitType: string;
    photoUrl?: string | null;
  };
}

interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasMore: boolean;
}

interface Summary {
  total: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
}

type StockStatus = "all" | "in_stock" | "low_stock" | "out_of_stock";

export default function FieldInventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [stockStatus, setStockStatus] = useState<StockStatus>("all");
  const [unitType, setUnitType] = useState<string>("all");
  const [unitTypes, setUnitTypes] = useState<string[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    totalCount: 0,
    totalPages: 0,
    hasMore: false,
  });
  const [summary, setSummary] = useState<Summary>({
    total: 0,
    inStock: 0,
    lowStock: 0,
    outOfStock: 0,
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchInventory = useCallback(async (page = 1) => {
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "50");
      
      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }
      if (stockStatus !== "all") {
        params.set("status", stockStatus);
      }
      if (unitType !== "all") {
        params.set("unitType", unitType);
      }

      const response = await fetch(`/api/inventory?${params.toString()}`);
      const data = await response.json();
      
      setInventory(data.data || []);
      setPagination(data.pagination || { page: 1, limit: 50, totalCount: 0, totalPages: 0, hasMore: false });
      setSummary(data.summary || { total: 0, inStock: 0, lowStock: 0, outOfStock: 0 });
      setUnitTypes(data.unitTypes || []);
    } catch (error) {
      console.error("Error fetching inventory:", error);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, stockStatus, unitType]);

  useEffect(() => {
    setLoading(true);
    fetchInventory(1);
  }, [fetchInventory]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setLoading(true);
      fetchInventory(newPage);
    }
  };

  if (loading && inventory.length === 0) {
    return <TablePageSkeleton />;
  }

  const getStatusBadge = (quantity: number) => {
    if (quantity === 0) {
      return <Badge variant="destructive" className="text-xs px-1.5 py-0">Out</Badge>;
    }
    if (quantity <= 5) {
      return <Badge className="bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 text-xs px-1.5 py-0">Low</Badge>;
    }
    return <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-600 text-xs px-1.5 py-0">OK</Badge>;
  };

  return (
    <PageContent>
      <div className="flex flex-col h-[calc(100vh-8rem)] gap-4">
        {/* Header with Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
            <p className="text-sm text-muted-foreground">
              {pagination.totalCount} items • Last updated just now
            </p>
          </div>
          
          {/* Compact Stats Row */}
          <div className="flex gap-2">
            <button
              onClick={() => setStockStatus("all")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                stockStatus === "all" 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              <Box className="h-4 w-4" />
              <span>{summary.total}</span>
            </button>
            <button
              onClick={() => setStockStatus("in_stock")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                stockStatus === "in_stock" 
                  ? "bg-emerald-600 text-white" 
                  : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
              }`}
            >
              <Package className="h-4 w-4" />
              <span>{summary.inStock}</span>
            </button>
            <button
              onClick={() => setStockStatus("low_stock")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                stockStatus === "low_stock" 
                  ? "bg-amber-600 text-white" 
                  : "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
              }`}
            >
              <TrendingDown className="h-4 w-4" />
              <span>{summary.lowStock}</span>
            </button>
            <button
              onClick={() => setStockStatus("out_of_stock")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                stockStatus === "out_of_stock" 
                  ? "bg-red-600 text-white" 
                  : "bg-red-500/10 text-red-600 hover:bg-red-500/20"
              }`}
            >
              <XCircle className="h-4 w-4" />
              <span>{summary.outOfStock}</span>
            </button>
          </div>
        </div>

        {/* Search and Filters - Compact Row */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={unitType} onValueChange={setUnitType}>
            <SelectTrigger className="w-full sm:w-[130px] h-9">
              <SelectValue placeholder="Unit type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {unitTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(search || stockStatus !== "all" || unitType !== "all") && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => { setSearch(""); setDebouncedSearch(""); setStockStatus("all"); setUnitType("all"); }}
              className="h-9 px-3"
            >
              Clear
            </Button>
          )}
        </div>

        {/* Main Content - Scrollable Table */}
        <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[40%]">Equipment</TableHead>
                  <TableHead className="hidden md:table-cell w-[20%]">SKU</TableHead>
                  <TableHead className="w-[15%] text-center">Type</TableHead>
                  <TableHead className="w-[12%] text-right">Qty</TableHead>
                  <TableHead className="w-[13%] text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5} className="h-12">
                        <div className="h-4 bg-muted rounded animate-pulse" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : inventory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Package className="h-8 w-8 opacity-50" />
                        <p>No equipment found</p>
                        {(search || stockStatus !== "all" || unitType !== "all") && (
                          <Button variant="link" size="sm" onClick={() => { setSearch(""); setStockStatus("all"); setUnitType("all"); }}>
                            Clear filters
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  inventory.map((item) => (
                    <TableRow key={item.id} className="group">
                      <TableCell className="py-2">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate leading-tight">{item.equipment.name}</p>
                            <p className="text-xs text-muted-foreground md:hidden">{item.equipment.sku}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell py-2">
                        <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {item.equipment.sku}
                        </code>
                      </TableCell>
                      <TableCell className="py-2 text-center">
                        <span className="text-xs text-muted-foreground">{item.equipment.unitType}</span>
                      </TableCell>
                      <TableCell className="py-2 text-right">
                        <span className={`font-mono text-sm font-semibold ${
                          item.quantity === 0 ? "text-red-600" : 
                          item.quantity <= 5 ? "text-amber-600" : ""
                        }`}>
                          {item.quantity}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 text-center">
                        {getStatusBadge(item.quantity)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Fixed Footer with Pagination */}
          {pagination.totalPages > 0 && (
            <div className="border-t bg-card px-4 py-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.totalCount)} of {pagination.totalCount}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1 || loading}
                  className="h-7 px-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-2 text-muted-foreground">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={!pagination.hasMore || loading}
                  className="h-7 px-2"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Mobile: Low Stock Alerts (only if there are any) */}
        {summary.lowStock > 0 || summary.outOfStock > 0 ? (
          <div className="sm:hidden">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              <span>{summary.lowStock} low stock</span>
              <span>•</span>
              <span className="text-red-500">{summary.outOfStock} out of stock</span>
            </div>
          </div>
        ) : null}
      </div>
    </PageContent>
  );
}
