"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { 
  Search, 
  Command, 
  Menu,
  RefreshCw,
  Cloud,
  ExternalLink,
  Check,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { InventorySidebar, type SidebarSection } from "./inventory-sidebar";
import { GlobalSearch } from "./global-search";
import { QuickStatsBar } from "./quick-stats-bar";
import { EquipmentPanel } from "./equipment-panel";
import { AssemblySplitView } from "./assembly-split-view";
import { CategoryTypeManager } from "./category-type-manager";
import { ActivityFeed } from "./activity-feed";
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
    photoUrl?: string | null;
    inventory?: { quantity: number } | null;
  };
}

export interface Assembly {
  id: string;
  name: string;
  description: string | null;
  status: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  isLegacy?: boolean;
  categoryId?: string | null;
  typeId?: string | null;
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

export function InventoryLayout() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get initial section from URL or default
  const sectionParam = searchParams.get("section") as SidebarSection | null;
  const [activeSection, setActiveSection] = useState<SidebarSection>(sectionParam || "equipment-all");
  
  // Data state
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [allEquipment, setAllEquipment] = useState<Equipment[]>([]);
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI state
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedAssemblyId, setSelectedAssemblyId] = useState<string | null>(
    searchParams.get("id")
  );
  const [isCreatingAssembly, setIsCreatingAssembly] = useState(false);
  
  // Pagination state
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 0,
    hasMore: false,
  });
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const fetchAbortRef = useRef<AbortController | null>(null);
  
  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  // Update URL when section changes
  const handleSectionChange = (section: SidebarSection) => {
    setActiveSection(section);
    setSelectedAssemblyId(null);
    setIsCreatingAssembly(false);
    
    // Update URL
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", section);
    params.delete("id");
    router.push(`?${params.toString()}`, { scroll: false });
    
    // Close mobile menu
    setMobileMenuOpen(false);
  };

  // Fetch data on mount
  useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([
          fetchEquipment(1),
          fetchAllEquipment(),
          fetchAssemblies(),
        ]);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

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

  const fetchEquipment = async (page: number = 1) => {
    if (fetchAbortRef.current) {
      fetchAbortRef.current.abort();
    }
    fetchAbortRef.current = new AbortController();

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });
      
      const response = await fetch(`/api/equipment?${params}`, {
        signal: fetchAbortRef.current.signal,
      });
      const result = await response.json();
      
      if (result.data && result.pagination) {
        if (page === 1) {
          setEquipment(result.data);
        } else {
          setEquipment(prev => [...prev, ...result.data]);
        }
        setPagination(result.pagination);
        
        // Update last synced
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
        setEquipment(result);
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      console.error("Error fetching equipment:", error);
    }
  };

  const fetchAllEquipment = async () => {
    try {
      const response = await fetch("/api/equipment?all=true");
      const data = await response.json();
      if (Array.isArray(data)) {
        setAllEquipment(data);
      }
    } catch (error) {
      console.error("Error fetching all equipment:", error);
    }
  };

  const fetchAssemblies = async () => {
    try {
      const response = await fetch("/api/assemblies?all=true");
      const data = await response.json();
      if (Array.isArray(data)) {
        setAssemblies(data);
      }
    } catch (error) {
      console.error("Error fetching assemblies:", error);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch("/api/boxhero/sync", { method: "POST" });
      const result: SyncResult = await response.json();
      
      if (result.success) {
        setLastSyncedAt(new Date(result.syncedAt));
        setLastSyncResult(result);
        await Promise.all([fetchEquipment(1), fetchAllEquipment()]);
      } else {
        setLastSyncResult(result);
      }
    } catch (error) {
      console.error("Error syncing:", error);
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

  const loadMoreEquipment = async () => {
    if (!pagination.hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      await fetchEquipment(pagination.page + 1);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Calculate stats
  const stats = {
    totalEquipment: pagination.totalCount || allEquipment.length,
    lowStockCount: allEquipment.filter(e => {
      const qty = e.inventory?.quantity || 0;
      return qty > 0 && qty < 10;
    }).length,
    outOfStockCount: allEquipment.filter(e => (e.inventory?.quantity || 0) === 0).length,
    totalAssemblies: assemblies.length,
    pendingCount: assemblies.filter(a => a.status === "PENDING_APPROVAL").length,
    approvedCount: assemblies.filter(a => a.status === "APPROVED").length,
    draftCount: assemblies.filter(a => a.status === "DRAFT").length,
    rejectedCount: assemblies.filter(a => a.status === "REJECTED").length,
    totalInventoryValue: allEquipment.reduce(
      (sum, e) => sum + (e.pricePerUnit * (e.inventory?.quantity || 0)), 
      0
    ),
  };

  // Filter equipment based on section
  const getFilteredEquipment = () => {
    switch (activeSection) {
      case "equipment-low":
        return allEquipment.filter(e => {
          const qty = e.inventory?.quantity || 0;
          return qty > 0 && qty < 10;
        });
      case "equipment-out":
        return allEquipment.filter(e => (e.inventory?.quantity || 0) === 0);
      default:
        return equipment;
    }
  };

  // Filter assemblies based on section
  const getFilteredAssemblies = () => {
    switch (activeSection) {
      case "assemblies-pending":
        return assemblies.filter(a => a.status === "PENDING_APPROVAL");
      case "assemblies-approved":
        return assemblies.filter(a => a.status === "APPROVED");
      case "assemblies-draft":
        return assemblies.filter(a => a.status === "DRAFT");
      case "assemblies-rejected":
        return assemblies.filter(a => a.status === "REJECTED");
      default:
        return assemblies;
    }
  };

  // Get assemblies using equipment
  const getAssembliesUsingEquipment = useCallback((equipmentId: string) => {
    return assemblies.filter(assembly => 
      assembly.items.some(item => item.equipmentId === equipmentId)
    );
  }, [assemblies]);

  // Handle assembly selection
  const handleSelectAssembly = (assemblyId: string | null) => {
    setSelectedAssemblyId(assemblyId);
    setIsCreatingAssembly(false);
    
    // Update URL
    const params = new URLSearchParams(searchParams.toString());
    if (assemblyId) {
      params.set("id", assemblyId);
    } else {
      params.delete("id");
    }
    router.push(`?${params.toString()}`, { scroll: false });
  };

  // Handle create assembly
  const handleCreateAssembly = () => {
    setIsCreatingAssembly(true);
    setSelectedAssemblyId(null);
    if (!activeSection.startsWith("assemblies")) {
      handleSectionChange("assemblies-all");
    }
  };

  // Render main content based on active section
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      );
    }

    // Equipment sections
    if (activeSection.startsWith("equipment")) {
      return (
        <EquipmentPanel
          equipment={getFilteredEquipment()}
          allEquipment={allEquipment}
          syncStatus={{ isSyncing, lastSyncedAt, lastSyncResult }}
          onSync={handleSync}
          onRefresh={() => fetchEquipment(1)}
          getAssembliesUsingEquipment={getAssembliesUsingEquipment}
          pagination={activeSection === "equipment-all" ? pagination : undefined}
          onLoadMore={activeSection === "equipment-all" ? loadMoreEquipment : undefined}
          isLoadingMore={isLoadingMore}
          filter={activeSection}
        />
      );
    }

    // Assembly sections
    if (activeSection.startsWith("assemblies")) {
      return (
        <AssemblySplitView
          assemblies={getFilteredAssemblies()}
          allEquipment={allEquipment}
          selectedAssemblyId={selectedAssemblyId}
          onSelectAssembly={handleSelectAssembly}
          onRefresh={fetchAssemblies}
          isCreating={isCreatingAssembly}
          onCancelCreate={() => setIsCreatingAssembly(false)}
        />
      );
    }

    // Categories
    if (activeSection === "categories") {
      return <CategoryTypeManager />;
    }

    // Activity
    if (activeSection === "activity") {
      return <ActivityFeed />;
    }

    return null;
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col -m-4 sm:-m-6 lg:-m-8">
      {/* Top Bar */}
      <div className="h-14 border-b bg-white flex items-center justify-between px-4 shrink-0">
        {/* Left side - Mobile menu + Search */}
        <div className="flex items-center gap-2">
          {/* Mobile menu trigger */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <InventorySidebar
                activeSection={activeSection}
                onSectionChange={handleSectionChange}
                stats={stats}
                onCreateAssembly={handleCreateAssembly}
              />
            </SheetContent>
          </Sheet>

          {/* Search button */}
          <Button
            variant="outline"
            className="w-64 justify-start text-slate-500 hidden sm:flex"
            onClick={() => setGlobalSearchOpen(true)}
          >
            <Search className="mr-2 h-4 w-4" />
            <span>Search...</span>
            <kbd className="pointer-events-none ml-auto hidden sm:flex h-5 select-none items-center gap-1 rounded border bg-slate-100 px-1.5 font-mono text-[10px] font-medium">
              <Command className="h-3 w-3" />K
            </kbd>
          </Button>
          
          {/* Mobile search icon */}
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden"
            onClick={() => setGlobalSearchOpen(true)}
          >
            <Search className="h-5 w-5" />
          </Button>
        </div>

        {/* Right side - Sync status */}
        <div className="flex items-center gap-2">
          {/* Sync status indicator */}
          <div className="hidden md:flex items-center gap-2 text-sm text-slate-500">
            <Cloud className="h-4 w-4" />
            <span>
              {lastSyncedAt ? (
                <>Synced {formatRelativeTime(lastSyncedAt)}</>
              ) : (
                <>Never synced</>
              )}
            </span>
            {lastSyncResult && (
              lastSyncResult.success ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )
            )}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
          >
            <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
            <span className="hidden sm:inline ml-2">
              {isSyncing ? "Syncing..." : "Sync"}
            </span>
          </Button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Desktop only */}
        <div className="hidden lg:block shrink-0">
          <InventorySidebar
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
            stats={stats}
            onCreateAssembly={handleCreateAssembly}
          />
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          {/* Quick stats bar */}
          <QuickStatsBar 
            stats={stats} 
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
          />

          {/* Main content */}
          <div className="flex-1 overflow-auto p-4">
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Global Search Modal */}
      <GlobalSearch
        open={globalSearchOpen}
        onOpenChange={setGlobalSearchOpen}
        equipment={allEquipment}
        assemblies={assemblies}
        onSelectEquipment={(eq) => {
          handleSectionChange("equipment-all");
          setGlobalSearchOpen(false);
        }}
        onSelectAssembly={(asm) => {
          handleSectionChange("assemblies-all");
          handleSelectAssembly(asm.id);
          setGlobalSearchOpen(false);
        }}
      />
    </div>
  );
}

// Helper function
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
