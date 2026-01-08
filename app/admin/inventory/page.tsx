"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  Layers, 
  Search, 
  Command,
} from "lucide-react";
import { TablePageSkeleton, PageContent } from "@/components/layout/page-skeleton";
import { StatsCards } from "@/components/inventory/stats-cards";
import { EquipmentTable } from "@/components/inventory/equipment-table";
import { AssembliesTable } from "@/components/inventory/assemblies-table";
import { GlobalSearch } from "@/components/inventory/global-search";
import { matchesWithSynonyms } from "@/lib/equipment-synonyms";

export interface Equipment {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  pricePerUnit: number;
  unitType: string;
  photoUrl?: string | null;
  boxheroId?: number | null;
  lastSyncedAt?: string | null;
  inventory: {
    quantity: number;
  } | null;
}

export interface AssemblyItem {
  id: string;
  equipmentId: string;
  quantity: number;
  equipment: {
    id: string;
    name: string;
    sku: string;
    unitType: string;
    pricePerUnit: number;
  };
}

export interface Assembly {
  id: string;
  name: string;
  description: string | null;
  status: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  createdAt: string;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
  items: AssemblyItem[];
}

interface SyncResult {
  success: boolean;
  created: number;
  updated: number;
  archived: number;
  errors: string[];
  syncedAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasMore: boolean;
}

export default function InventoryPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || "equipment");
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [allEquipment, setAllEquipment] = useState<Equipment[]>([]); // For global search and assemblies
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  
  // Pagination state
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 0,
    hasMore: false,
  });
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  
  // Filters
  const [equipmentSearch, setEquipmentSearch] = useState("");
  const [assemblySearch, setAssemblySearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search for API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(equipmentSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [equipmentSearch]);

  // Fetch data on mount, sync in background
  useEffect(() => {
    const init = async () => {
      try {
        // Fetch local data first (non-blocking)
        await Promise.all([
          fetchEquipment(1), 
          fetchAllEquipment(), // For global search and dropdowns
          fetchAssemblies()
        ]);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Refetch when search changes
  useEffect(() => {
    if (!loading) {
      fetchEquipment(1, debouncedSearch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Keyboard shortcut for global search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setGlobalSearchOpen(true);
      }
    };
    
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const performSync = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch("/api/boxhero/sync", { method: "POST" });
      const result: SyncResult = await response.json();
      
      if (result.success) {
        setLastSyncedAt(new Date(result.syncedAt));
        setLastSyncResult(result);
        // Refresh equipment after sync
        await fetchEquipment();
      } else {
        console.error("Sync failed:", result.errors);
        setLastSyncResult(result);
      }
    } catch (error) {
      console.error("Error syncing with BoxHero:", error);
      setLastSyncResult({
        success: false,
        created: 0,
        updated: 0,
        archived: 0,
        errors: [String(error)],
        syncedAt: new Date().toISOString(),
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSync = async () => {
    await performSync();
    await fetchAllEquipment(); // Also refresh all equipment for dropdowns
  };

  const fetchEquipment = async (page: number = 1, search?: string) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });
      if (search) {
        params.set("search", search);
      }
      
      const response = await fetch(`/api/equipment?${params}`);
      const result = await response.json();
      
      // Handle paginated response
      if (result.data && result.pagination) {
        if (page === 1) {
          setEquipment(result.data);
        } else {
          // Append for "load more"
          setEquipment(prev => [...prev, ...result.data]);
        }
        setPagination(result.pagination);
        
        // Update last synced from the equipment data
        if (result.data.length > 0) {
          const latestSync = result.data
            .filter((e: Equipment) => e.lastSyncedAt)
            .sort((a: Equipment, b: Equipment) => 
              new Date(b.lastSyncedAt!).getTime() - new Date(a.lastSyncedAt!).getTime()
            )[0];
          if (latestSync?.lastSyncedAt) {
            setLastSyncedAt(new Date(latestSync.lastSyncedAt));
          }
        }
      } else if (Array.isArray(result)) {
        // Fallback for old response format
        setEquipment(result);
      } else {
        console.error("Equipment API returned unexpected format:", result);
        setEquipment([]);
      }
    } catch (error) {
      console.error("Error fetching equipment:", error);
      setEquipment([]);
    }
  };

  const fetchAllEquipment = async () => {
    try {
      const response = await fetch("/api/equipment?all=true");
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setAllEquipment(data);
      } else {
        console.error("All equipment API returned non-array:", data);
        setAllEquipment([]);
      }
    } catch (error) {
      console.error("Error fetching all equipment:", error);
      setAllEquipment([]);
    }
  };

  const loadMoreEquipment = async () => {
    if (!pagination.hasMore || isLoadingMore) return;
    
    setIsLoadingMore(true);
    try {
      await fetchEquipment(pagination.page + 1, debouncedSearch);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const fetchAssemblies = async () => {
    try {
      const response = await fetch("/api/assemblies?all=true");
      const data = await response.json();
      
      // Ensure data is an array before setting state
      if (!Array.isArray(data)) {
        console.error("Assemblies API returned non-array:", data);
        setAssemblies([]);
        return;
      }
      
      setAssemblies(data);
    } catch (error) {
      console.error("Error fetching assemblies:", error);
      setAssemblies([]);
    }
  };

  // Calculate stats (use allEquipment for accurate totals)
  const stats = {
    totalEquipment: pagination.totalCount || allEquipment.length,
    totalAssemblies: assemblies.length,
    approvedAssemblies: assemblies.filter(a => a.status === "APPROVED").length,
    pendingAssemblies: assemblies.filter(a => a.status === "PENDING_APPROVAL").length,
    lowStockItems: allEquipment.filter(e => (e.inventory?.quantity || 0) < 10).length,
    totalInventoryValue: allEquipment.reduce((sum, e) => sum + (e.pricePerUnit * (e.inventory?.quantity || 0)), 0),
  };

  // Equipment is already filtered by the API - use directly
  const filteredEquipment = equipment;

  // Filter assemblies (with synonym support for equipment names)
  const filteredAssemblies = assemblies.filter(assembly => {
    if (!assemblySearch.trim()) return true;
    const search = assemblySearch.toLowerCase();
    
    // Check assembly name and description
    if (assembly.name.toLowerCase().includes(search)) return true;
    if (assembly.description?.toLowerCase().includes(search)) return true;
    
    // Check equipment items with synonym support
    return assembly.items.some(item => 
      matchesWithSynonyms({
        name: item.equipment.name,
        sku: item.equipment.sku,
        description: null,
      }, assemblySearch)
    );
  });

  // Cross-reference: get assemblies that use a specific equipment
  const getAssembliesUsingEquipment = useCallback((equipmentId: string) => {
    return assemblies.filter(assembly => 
      assembly.items.some(item => item.equipmentId === equipmentId)
    );
  }, [assemblies]);

  // Navigate to equipment from assembly
  const navigateToEquipment = (equipmentId: string) => {
    const eq = allEquipment.find(e => e.id === equipmentId);
    if (eq) {
      setEquipmentSearch(eq.name);
      setActiveTab("equipment");
    }
  };

  // Navigate to assemblies filtered by equipment
  const navigateToAssembliesWithEquipment = (equipmentName: string) => {
    setAssemblySearch(equipmentName);
    setActiveTab("assemblies");
  };

  if (loading) {
    return <TablePageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white -m-4 sm:-m-6 lg:-m-8">
      {/* Header */}
      <div className="bg-white border-b border-slate-100">
        <div className="px-4 py-6 sm:px-6 sm:py-8 max-w-6xl mx-auto">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Inventory</h1>
                <p className="text-slate-500 text-sm sm:text-base">
                  Equipment &amp; assemblies management
                </p>
              </div>
            </div>
            
            {/* Global Search Button */}
            <Button
              variant="outline"
              className="w-full sm:w-auto justify-start text-slate-500 border-slate-200 rounded-xl h-11"
              onClick={() => setGlobalSearchOpen(true)}
            >
              <Search className="mr-2 h-4 w-4" />
              <span>Search inventory...</span>
              <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-slate-100 px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                <Command className="h-3 w-3" />K
              </kbd>
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6 sm:py-8 max-w-6xl mx-auto space-y-6">
        {/* Stats Cards */}
        <StatsCards stats={stats} />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
            <TabsTrigger value="equipment" className="gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Equipment</span>
              <span className="sm:hidden">Equip</span>
            </TabsTrigger>
            <TabsTrigger value="assemblies" className="gap-2">
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline">Assemblies</span>
              <span className="sm:hidden">Assem</span>
            </TabsTrigger>
          </TabsList>

          {/* Equipment Tab */}
          <TabsContent value="equipment" className="space-y-4">
            <EquipmentTable
              equipment={filteredEquipment}
              searchValue={equipmentSearch}
              onSearchChange={setEquipmentSearch}
              onRefresh={() => fetchEquipment(1, debouncedSearch)}
              onSync={handleSync}
              syncStatus={{
                isSyncing,
                lastSyncedAt,
                lastSyncResult,
              }}
              getAssembliesUsingEquipment={getAssembliesUsingEquipment}
              onNavigateToAssemblies={navigateToAssembliesWithEquipment}
              pagination={pagination}
              onLoadMore={loadMoreEquipment}
              isLoadingMore={isLoadingMore}
            />
          </TabsContent>

          {/* Assemblies Tab */}
          <TabsContent value="assemblies" className="space-y-4">
            <AssembliesTable
              assemblies={filteredAssemblies}
              equipment={allEquipment}
              searchValue={assemblySearch}
              onSearchChange={setAssemblySearch}
              onRefresh={fetchAssemblies}
              onNavigateToEquipment={navigateToEquipment}
            />
          </TabsContent>
        </Tabs>

        {/* Global Search Modal */}
        <GlobalSearch
          open={globalSearchOpen}
          onOpenChange={setGlobalSearchOpen}
          equipment={allEquipment}
          assemblies={assemblies}
          onSelectEquipment={(eq) => {
            setEquipmentSearch(eq.name);
            setActiveTab("equipment");
            setGlobalSearchOpen(false);
          }}
          onSelectAssembly={(asm) => {
            setAssemblySearch(asm.name);
            setActiveTab("assemblies");
            setGlobalSearchOpen(false);
          }}
        />
      </div>
    </div>
  );
}
