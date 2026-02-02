"use client";

import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FilterChips, CategoryBadge } from "@/components/ui/filter-chips";
import { 
  Search, 
  CheckCircle2,
  Package,
  ChevronDown,
  Minus,
  Plus,
  Check,
  Loader2,
  X,
  Clock,
  Repeat,
  Sparkles,
  Calendar,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn, formatCurrency } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { DatePicker } from "@/components/ui/date-picker";

interface Equipment {
  id: string;
  name: string;
  sku: string;
  pricePerUnit: number;
  unitType?: string;
  inventory?: { quantity: number } | null;
}

interface Modifier {
  equipmentId: string;
  quantity: number;
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
  categoryId?: string;
  typeId?: string;
  category?: { id: string; name: string } | null;
  type?: { id: string; name: string; slug?: string } | null;
  items: AssemblyItem[];
  lastUsed?: string;
  totalUsed?: number;
}

interface AssemblyCategory {
  id: string;
  name: string;
  description: string | null;
  _count: { types: number; assemblies: number };
}

interface AssemblyType {
  id: string;
  name: string;
  slug?: string;
  description: string | null;
  categoryId: string;
  category?: { id: string; name: string };
  _count: { assemblies: number };
}

export default function FieldAssembliesPage() {
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [categories, setCategories] = useState<AssemblyCategory[]>([]);
  const [types, setTypes] = useState<AssemblyType[]>([]);
  const [recentAssemblies, setRecentAssemblies] = useState<Assembly[]>([]);
  const [allEquipment, setAllEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  
  // Assembly selection
  const [selectedAssembly, setSelectedAssembly] = useState<Assembly | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [showModifiers, setShowModifiers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAllItems, setShowAllItems] = useState(false);
  const [usageDate, setUsageDate] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [assembliesRes, categoriesRes, typesRes, recentRes, equipmentRes] = await Promise.all([
          fetch("/api/assemblies?approved=true&all=true"),
          fetch("/api/assembly-categories"),
          fetch("/api/assembly-types"),
          fetch("/api/assemblies/recent?limit=4"),
          fetch("/api/equipment?all=true"),
        ]);
        
        const assembliesData = await assembliesRes.json();
        const categoriesData = await categoriesRes.json();
        const typesData = await typesRes.json();
        const recentData = await recentRes.json();
        const equipmentData = await equipmentRes.json();
        
        if (Array.isArray(assembliesData)) setAssemblies(assembliesData);
        if (Array.isArray(categoriesData)) setCategories(categoriesData);
        if (Array.isArray(typesData)) setTypes(typesData);
        if (Array.isArray(recentData)) setRecentAssemblies(recentData);
        if (Array.isArray(equipmentData)) setAllEquipment(equipmentData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Category filter options with counts
  const categoryFilterOptions = useMemo(() => {
    return categories.map((cat) => ({
      id: cat.id,
      label: cat.name,
      count: assemblies.filter((a) => a.categoryId === cat.id).length,
    }));
  }, [categories, assemblies]);

  // Filter assemblies by search and category
  const filteredAssemblies = useMemo(() => {
    return assemblies.filter((assembly) => {
      // Category filter
      if (selectedCategories.length > 0 && !selectedCategories.includes(assembly.categoryId || "")) {
        return false;
      }
      
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          assembly.name.toLowerCase().includes(query) ||
          assembly.description?.toLowerCase().includes(query) ||
          assembly.type?.name.toLowerCase().includes(query) ||
          assembly.category?.name.toLowerCase().includes(query)
        );
      }
      
      return true;
    });
  }, [assemblies, selectedCategories, searchQuery]);

  // Calculate assembly total
  const getAssemblyTotal = (assembly: Assembly) => {
    return assembly.items.reduce((sum, item) => 
      sum + (item.equipment.pricePerUnit * item.quantity), 0
    );
  };

  const handleSelectAssembly = (assembly: Assembly) => {
    setSelectedAssembly(assembly);
    setQuantity(1);
    setModifiers([]);
    setShowModifiers(false);
    setShowAllItems(false);
    setShowDatePicker(false);
    // Reset to today when opening new assembly
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setUsageDate(today);
  };

  const handleQuickLog = async (assembly: Assembly, qty: number = 1, mods: Modifier[] = []) => {
    setIsSubmitting(true);
    try {
      const validModifiers = mods.filter(m => m.equipmentId && m.quantity > 0);
      
      // Include date if not today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isToday = usageDate.getTime() === today.getTime();
      const dateStr = !isToday ? usageDate.toISOString().slice(0, 10) + 'T00:00:00.000Z' : undefined;
      
      const response = await fetch("/api/assemblies/usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          assemblyId: assembly.id, 
          quantity: qty,
          modifiers: validModifiers,
          ...(dateStr && { date: dateStr }),
        }),
      });

      if (!response.ok) throw new Error("Failed to log usage");

      const modifierText = validModifiers.length > 0 ? ` + ${validModifiers.length} extras` : "";
      setSuccess(`${qty}× ${assembly.name}${modifierText}`);
      setSelectedAssembly(null);
      setModifiers([]);
      
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

  // Modifier helpers
  const addModifier = () => {
    setModifiers([...modifiers, { equipmentId: "", quantity: 1 }]);
    setShowModifiers(true);
  };

  const removeModifier = (index: number) => {
    setModifiers(modifiers.filter((_, i) => i !== index));
  };

  const updateModifier = (index: number, field: keyof Modifier, value: string | number) => {
    const newModifiers = [...modifiers];
    newModifiers[index] = { ...newModifiers[index], [field]: value };
    setModifiers(newModifiers);
  };

  // Get available equipment for modifiers (not already in assembly or selected)
  const availableForModifiers = useMemo(() => {
    if (!selectedAssembly) return allEquipment;
    const usedIds = new Set([
      ...selectedAssembly.items.map(i => i.equipment.id),
      ...modifiers.map(m => m.equipmentId).filter(Boolean),
    ]);
    return allEquipment.filter(eq => !usedIds.has(eq.id));
  }, [allEquipment, selectedAssembly, modifiers]);

  // Calculate modifier cost
  const modifiersCost = useMemo(() => {
    return modifiers.reduce((total, mod) => {
      const eq = allEquipment.find(e => e.id === mod.equipmentId);
      return total + (eq ? eq.pricePerUnit * mod.quantity : 0);
    }, 0);
  }, [modifiers, allEquipment]);

  const handleConfirmUsage = async () => {
    if (!selectedAssembly) return;
    await handleQuickLog(selectedAssembly, quantity, modifiers);
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

  // Get type display name (short version for list)
  const getTypeShortName = (type?: { name: string; slug?: string } | null) => {
    if (!type) return null;
    // If name has ":" prefix like "Strand: Terminal", take the part after
    if (type.name.includes(":")) {
      return type.name.split(":")[1].trim();
    }
    return type.name;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background border-b">
        <div className="px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4 space-y-3">
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

          {/* Category filter chips */}
          {categoryFilterOptions.length > 0 && (
            <div className="max-w-2xl mx-auto">
              <FilterChips
                options={categoryFilterOptions}
                selected={selectedCategories}
                onChange={setSelectedCategories}
                allowMultiple={true}
                showAll={true}
                allLabel="All"
              />
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
                <div key={i} className="h-28 sm:h-32 bg-muted rounded-2xl animate-pulse" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Recent Assemblies - Only show when no filters active */}
            {recentAssemblies.length > 0 && !searchQuery && selectedCategories.length === 0 && (
              <section className="mb-6 sm:mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-medium text-muted-foreground">Quick Access</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {recentAssemblies.map((assembly) => (
                    <button
                      key={assembly.id}
                      onClick={() => handleSelectAssembly(assembly)}
                      disabled={isSubmitting}
                      className="relative text-left bg-card border rounded-2xl p-3 sm:p-4 hover:border-primary/50 hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
                    >
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

            {/* All Assemblies List */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Package className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-medium text-muted-foreground">
                  {searchQuery ? "Search Results" : selectedCategories.length > 0 ? "Filtered" : "All Assemblies"}
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
                  {(searchQuery || selectedCategories.length > 0) && (
                    <button 
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedCategories([]);
                      }}
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
                          <h3 className="font-medium truncate text-sm sm:text-base">{assembly.name}</h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span>{assembly.items.length} items</span>
                            <span>•</span>
                            <span className="font-medium text-foreground">
                              {formatCurrency(getAssemblyTotal(assembly))}
                            </span>
                          </div>
                        </div>
                        {/* Type badge on the right */}
                        {assembly.category && (
                          <CategoryBadge 
                            category={assembly.category.name} 
                            className="shrink-0"
                          />
                        )}
                      </div>
                      {/* Type shown below if present and different from category */}
                      {assembly.type && (
                        <div className="mt-2 pl-12 sm:pl-[52px]">
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {getTypeShortName(assembly.type)}
                          </Badge>
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
        <SheetContent side="bottom" className="rounded-t-3xl px-0 pb-0 max-h-[85vh]" aria-describedby={undefined}>
          {selectedAssembly && (
            <div className="flex flex-col h-full">
              <SheetTitle className="sr-only">
                Log Assembly: {selectedAssembly.name}
              </SheetTitle>
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
                    {(selectedAssembly.category || selectedAssembly.type) && (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {selectedAssembly.category && (
                          <CategoryBadge category={selectedAssembly.category.name} />
                        )}
                        {selectedAssembly.type && (
                          <Badge variant="secondary" className="text-xs">
                            {getTypeShortName(selectedAssembly.type)}
                          </Badge>
                        )}
                      </div>
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

                {/* Usage Date (collapsible) */}
                <div className="mb-5">
                  <button
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronDown className={cn("h-4 w-4 transition-transform", showDatePicker && "rotate-180")} />
                    Log for a different date?
                    {(() => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const isToday = usageDate.getTime() === today.getTime();
                      return !isToday && (
                        <Badge variant="secondary" className="text-xs">
                          {usageDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </Badge>
                      );
                    })()}
                  </button>
                  {showDatePicker && (
                    <div className="mt-3">
                      <DatePicker
                        date={usageDate}
                        onDateChange={(date) => date && setUsageDate(date)}
                        placeholder="Select date"
                        className="h-10"
                      />
                    </div>
                  )}
                </div>

                {/* Items Preview */}
                <div className="mb-5">
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

                {/* Extra Equipment (Modifiers) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={() => setShowModifiers(!showModifiers)}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronDown className={cn("h-4 w-4 transition-transform", showModifiers && "rotate-180")} />
                      Extra equipment
                      {modifiers.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {modifiers.filter(m => m.equipmentId).length}
                        </Badge>
                      )}
                    </button>
                    <button
                      onClick={addModifier}
                      className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </button>
                  </div>
                  
                  {(showModifiers || modifiers.length > 0) && (
                    <div className="space-y-2">
                      {modifiers.map((mod, index) => {
                        const selectedEquipment = allEquipment.find(e => e.id === mod.equipmentId);
                        return (
                          <div key={index} className="flex items-center gap-2 bg-muted/50 rounded-xl p-2">
                            <select
                              value={mod.equipmentId}
                              onChange={(e) => updateModifier(index, "equipmentId", e.target.value)}
                              className="flex-1 bg-background border rounded-lg px-2 py-1.5 text-sm min-w-0"
                            >
                              <option value="">Select equipment...</option>
                              {selectedEquipment && (
                                <option value={selectedEquipment.id}>
                                  {selectedEquipment.name}
                                </option>
                              )}
                              {availableForModifiers.map(eq => (
                                <option key={eq.id} value={eq.id}>
                                  {eq.name} ({formatCurrency(eq.pricePerUnit)})
                                </option>
                              ))}
                            </select>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => updateModifier(index, "quantity", Math.max(1, mod.quantity - 1))}
                                className="h-7 w-7 rounded-lg bg-background flex items-center justify-center"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-6 text-center text-sm font-medium">{mod.quantity}</span>
                              <button
                                onClick={() => updateModifier(index, "quantity", mod.quantity + 1)}
                                className="h-7 w-7 rounded-lg bg-background flex items-center justify-center"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            <button
                              onClick={() => removeModifier(index)}
                              className="h-7 w-7 rounded-lg text-destructive hover:bg-destructive/10 flex items-center justify-center shrink-0"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                      
                      {modifiers.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          Add extra equipment not included in the assembly
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Fixed Footer */}
              <div className="border-t bg-background px-5 sm:px-6 py-4 space-y-3">
                {/* Cost Breakdown */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Assembly ({quantity}×)</span>
                    <span>{formatCurrency(getAssemblyTotal(selectedAssembly) * quantity)}</span>
                  </div>
                  {modifiersCost > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Extra equipment</span>
                      <span>{formatCurrency(modifiersCost)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="font-medium">Total</span>
                    <span className="text-xl sm:text-2xl font-bold">
                      {formatCurrency(getAssemblyTotal(selectedAssembly) * quantity + modifiersCost)}
                    </span>
                  </div>
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
                      {modifiers.filter(m => m.equipmentId).length > 0 && (
                        <span className="ml-1 text-primary-foreground/80">
                          + {modifiers.filter(m => m.equipmentId).length} extra
                        </span>
                      )}
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
