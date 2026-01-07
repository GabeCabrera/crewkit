"use client";

import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  CheckCircle2,
  Package,
  ChevronRight,
  ChevronDown,
  Minus,
  Plus,
  Check,
  Loader2,
  X,
  Clock,
  Repeat,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn, formatCurrency } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";

interface Equipment {
  id: string;
  name: string;
  sku: string;
  pricePerUnit: number;
  unitType?: string;
}

interface AssemblyItem {
  id: string;
  equipmentId?: string;
  quantity: number;
  equipment: Equipment;
}

interface Assembly {
  id: string;
  name: string;
  description: string | null;
  status?: string;
  categories?: string[];
  items: AssemblyItem[];
  lastUsed?: string;
  totalUsed?: number;
}

export default function FieldAssembliesPage() {
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [recentAssemblies, setRecentAssemblies] = useState<Assembly[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedAssembly, setSelectedAssembly] = useState<Assembly | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAllItems, setShowAllItems] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [assembliesRes, recentRes] = await Promise.all([
          fetch("/api/assemblies?approved=true&all=true"),
          fetch("/api/assemblies/recent?limit=4"),
        ]);
        
        const assembliesData = await assembliesRes.json();
        const recentData = await recentRes.json();
        
        if (Array.isArray(assembliesData)) {
          setAssemblies(assembliesData);
        }
        if (Array.isArray(recentData)) {
          setRecentAssemblies(recentData);
        }
      } catch (error) {
        console.error("Error fetching assemblies:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    assemblies.forEach(a => a.categories?.forEach(c => cats.add(c)));
    return Array.from(cats).sort();
  }, [assemblies]);

  // Filter assemblies
  const filteredAssemblies = useMemo(() => {
    return assemblies.filter(assembly => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query || 
        assembly.name.toLowerCase().includes(query) ||
        assembly.description?.toLowerCase().includes(query);
      const matchesCategory = !selectedCategory || 
        assembly.categories?.includes(selectedCategory);
      return matchesSearch && matchesCategory;
    });
  }, [assemblies, searchQuery, selectedCategory]);

  // Calculate assembly total
  const getAssemblyTotal = (assembly: Assembly) => {
    return assembly.items.reduce((sum, item) => 
      sum + (item.equipment.pricePerUnit * item.quantity), 0
    );
  };

  const handleSelectAssembly = (assembly: Assembly) => {
    setSelectedAssembly(assembly);
    setQuantity(1);
    setShowAllItems(false);
  };

  const handleQuickLog = async (assembly: Assembly, qty: number = 1) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/assemblies/usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          assemblyId: assembly.id, 
          quantity: qty,
          modifiers: [] 
        }),
      });

      if (!response.ok) throw new Error("Failed to log usage");

      setSuccess(`${qty}× ${assembly.name}`);
      setSelectedAssembly(null);
      
      // Refresh recent assemblies
      const recentRes = await fetch("/api/assemblies/recent?limit=4");
      const recentData = await recentRes.json();
      if (Array.isArray(recentData)) {
        setRecentAssemblies(recentData);
      }
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmUsage = async () => {
    if (!selectedAssembly) return;
    await handleQuickLog(selectedAssembly, quantity);
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // IDs of recent assemblies for highlighting in list
  const recentIds = useMemo(() => new Set(recentAssemblies.map(a => a.id)), [recentAssemblies]);

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background border-b">
        <div className="px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4">
          {/* Search */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assemblies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-11 sm:h-10 bg-muted/50 border-0 rounded-xl text-base sm:text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-muted rounded-full"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Category Pills */}
          {categories.length > 0 && !searchQuery && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1 -mx-4 px-4 sm:-mx-6 sm:px-6 scrollbar-hide max-w-2xl sm:mx-auto">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all shrink-0",
                  !selectedCategory 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground"
                )}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all shrink-0",
                    selectedCategory === cat 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Success Toast */}
      {success && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-medium text-sm">{success}</span>
            <button
              onClick={() => router.push("/field/today")}
              className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium hover:bg-white/30 transition-colors"
            >
              View
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-4 py-5 sm:px-6 sm:py-6 max-w-2xl mx-auto pb-24">
        {loading ? (
          <div className="space-y-5">
            <div className="h-5 w-24 bg-muted rounded animate-pulse" />
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 sm:h-28 bg-muted rounded-2xl animate-pulse" />
              ))}
            </div>
            <div className="h-5 w-32 bg-muted rounded animate-pulse mt-6" />
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Recent Assemblies - Quick Access */}
            {recentAssemblies.length > 0 && !searchQuery && !selectedCategory && (
              <section className="mb-6 sm:mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-medium text-muted-foreground">Recent</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {recentAssemblies.map((assembly) => (
                    <button
                      key={assembly.id}
                      onClick={() => handleSelectAssembly(assembly)}
                      disabled={isSubmitting}
                      className="relative text-left bg-card border rounded-2xl p-3 sm:p-4 hover:border-primary/50 hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      {/* Quick repeat button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickLog(assembly, 1);
                        }}
                        disabled={isSubmitting}
                        className="absolute top-2 right-2 h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
                        title="Quick log 1×"
                      >
                        <Repeat className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
                      </button>
                      
                      <div className="pr-7 sm:pr-8">
                        <p className="font-semibold text-sm leading-tight line-clamp-2">
                          {assembly.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5 sm:mt-2 text-xs text-muted-foreground">
                          <span>{assembly.items.length} items</span>
                          <span>•</span>
                          <span className="font-medium text-foreground">
                            {formatCurrency(getAssemblyTotal(assembly))}
                          </span>
                        </div>
                        {assembly.lastUsed && (
                          <p className="text-[10px] text-muted-foreground mt-1 sm:mt-1.5 flex items-center gap-1">
                            <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            {formatTimeAgo(assembly.lastUsed)}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* All Assemblies */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Package className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-medium text-muted-foreground">
                  {searchQuery ? "Results" : recentAssemblies.length > 0 && !selectedCategory ? "All Assemblies" : "Assemblies"}
                </h2>
                <span className="text-xs text-muted-foreground">
                  ({filteredAssemblies.length})
                </span>
              </div>

              {filteredAssemblies.length === 0 ? (
                <div className="text-center py-12 sm:py-16">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <Package className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-medium">No assemblies found</p>
                  {(searchQuery || selectedCategory) && (
                    <button 
                      onClick={() => { setSearchQuery(""); setSelectedCategory(null); }}
                      className="text-primary text-sm mt-2 hover:underline"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAssemblies.map((assembly) => (
                    <button
                      key={assembly.id}
                      onClick={() => handleSelectAssembly(assembly)}
                      className="w-full text-left bg-card border rounded-xl p-3 sm:p-4 hover:border-primary/50 transition-all active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium truncate text-sm sm:text-base">{assembly.name}</h3>
                            {recentIds.has(assembly.id) && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                                Recent
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span>{assembly.items.length} items</span>
                            <span>•</span>
                            <span className="font-medium text-foreground">
                              {formatCurrency(getAssemblyTotal(assembly))}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                      {assembly.categories && assembly.categories.length > 0 && (
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {assembly.categories.slice(0, 2).map(cat => (
                            <Badge 
                              key={cat} 
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0"
                            >
                              {cat}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* Bottom Sheet for Assembly Details */}
      <Sheet open={!!selectedAssembly} onOpenChange={() => setSelectedAssembly(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl px-0 pb-0 max-h-[85vh]">
          {selectedAssembly && (
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="px-5 sm:px-6 pb-4 border-b">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Package className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg sm:text-xl font-semibold truncate">{selectedAssembly.name}</h2>
                    {selectedAssembly.description && (
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                        {selectedAssembly.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 sm:py-5">
                {/* Quantity Selector */}
                <div className="mb-5 sm:mb-6">
                  <label className="text-sm font-medium text-muted-foreground mb-3 block">
                    Quantity
                  </label>
                  <div className="flex items-center justify-center gap-3 sm:gap-4">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-muted hover:bg-muted/80 disabled:opacity-40 flex items-center justify-center transition-colors active:scale-95"
                    >
                      <Minus className="h-5 w-5" />
                    </button>
                    <span className="text-4xl sm:text-5xl font-bold tabular-nums w-16 sm:w-20 text-center">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors active:scale-95"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                  {/* Quick quantity buttons */}
                  <div className="flex justify-center gap-2 mt-3">
                    {[1, 2, 3, 5, 10].map((q) => (
                      <button
                        key={q}
                        onClick={() => setQuantity(q)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors min-w-[40px]",
                          quantity === q 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted hover:bg-muted/80"
                        )}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Items Preview */}
                <div>
                  <button
                    onClick={() => setShowAllItems(!showAllItems)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
                  >
                    <ChevronDown className={cn("h-4 w-4 transition-transform", showAllItems && "rotate-180")} />
                    {selectedAssembly.items.length} items included
                  </button>
                  
                  {showAllItems && (
                    <div className="bg-muted/50 rounded-xl p-3 space-y-2 max-h-40 overflow-y-auto">
                      {selectedAssembly.items.map(item => (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground truncate flex-1 mr-2">
                            {item.equipment.name}
                          </span>
                          <span className="font-medium tabular-nums shrink-0">
                            ×{item.quantity * quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Fixed Footer */}
              <div className="border-t bg-background px-5 sm:px-6 py-4 space-y-3">
                {/* Total */}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="text-xl sm:text-2xl font-bold">
                    {formatCurrency(getAssemblyTotal(selectedAssembly) * quantity)}
                  </span>
                </div>

                {/* Action Button */}
                <Button
                  className="w-full h-12 sm:h-14 rounded-2xl text-base font-semibold"
                  onClick={handleConfirmUsage}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-5 w-5 mr-2" />
                      Log {quantity}× {selectedAssembly.name}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
