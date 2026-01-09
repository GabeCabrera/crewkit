"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Package, 
  Layers, 
  ArrowRight,
  Hash,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { matchesWithSynonyms, expandSearchQuery } from "@/lib/equipment-synonyms";
import type { Equipment, Assembly } from "@/app/admin/inventory/page";

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: Equipment[];
  assemblies: Assembly[];
  onSelectEquipment: (equipment: Equipment) => void;
  onSelectAssembly: (assembly: Assembly) => void;
}

interface SearchResult {
  type: "equipment" | "assembly";
  item: Equipment | Assembly;
  matchedField: string;
}

export function GlobalSearch({
  open,
  onOpenChange,
  equipment,
  assemblies,
  onSelectEquipment,
  onSelectAssembly,
}: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  // Search results (with synonym support)
  const { results, usedSynonyms } = useMemo(() => {
    if (!query.trim()) return { results: [], usedSynonyms: false };

    const searchTerm = query.toLowerCase();
    const expandedTerms = expandSearchQuery(query);
    const hasSynonyms = expandedTerms.length > 1;
    const matches: SearchResult[] = [];

    // Search equipment with synonym support
    equipment.forEach((eq) => {
      if (matchesWithSynonyms(eq, query)) {
        // Determine which field matched for display purposes
        let matchedField = "synonym";
        if (eq.name.toLowerCase().includes(searchTerm)) {
          matchedField = "name";
        } else if (eq.sku.toLowerCase().includes(searchTerm)) {
          matchedField = "sku";
        } else if (eq.description?.toLowerCase().includes(searchTerm)) {
          matchedField = "description";
        }
        matches.push({ type: "equipment", item: eq, matchedField });
      }
    });

    // Search assemblies
    assemblies.forEach((asm) => {
      if (asm.name.toLowerCase().includes(searchTerm)) {
        matches.push({ type: "assembly", item: asm, matchedField: "name" });
      } else if (asm.description?.toLowerCase().includes(searchTerm)) {
        matches.push({ type: "assembly", item: asm, matchedField: "description" });
      } else if (asm.items.some(item => matchesWithSynonyms({
        name: item.equipment.name,
        sku: item.equipment.sku,
        description: null,
      }, query))) {
        matches.push({ type: "assembly", item: asm, matchedField: "equipment" });
      }
    });

    return { 
      results: matches.slice(0, 15), // Limit to 15 results
      usedSynonyms: hasSynonyms && matches.length > 0,
    };
  }, [query, equipment, assemblies]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (results[selectedIndex]) {
            handleSelect(results[selectedIndex]);
          }
          break;
        case "Escape":
          onOpenChange(false);
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, results, selectedIndex]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const handleSelect = (result: SearchResult) => {
    if (result.type === "equipment") {
      onSelectEquipment(result.item as Equipment);
    } else {
      onSelectAssembly(result.item as Assembly);
    }
  };

  // Group results by type
  const equipmentResults = results.filter(r => r.type === "equipment");
  const assemblyResults = results.filter(r => r.type === "assembly");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-lg overflow-hidden" aria-describedby={undefined}>
        {/* Visually hidden title for accessibility */}
        <DialogTitle className="sr-only">
          Search equipment and assemblies
        </DialogTitle>
        {/* Search Input */}
        <div className="flex items-center border-b px-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            placeholder="Search equipment and assemblies..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-12"
            autoFocus
          />
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {query.trim() === "" ? (
            <div className="p-8 text-center text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Start typing to search...</p>
              <p className="text-xs mt-1">Try &quot;14 inch bolt&quot;, &quot;ethernet&quot;, &quot;fiber&quot;, or equipment names</p>
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p className="text-sm">No results found for &quot;{query}&quot;</p>
              <p className="text-xs mt-1">Try a different term or check spelling</p>
            </div>
          ) : (
            <div className="py-2">
              {/* Synonym indicator */}
              {usedSynonyms && (
                <div className="px-3 py-2 text-xs text-muted-foreground border-b flex items-center gap-1.5 bg-muted/30">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  <span>Showing results for related terms</span>
                </div>
              )}
              
              {/* Equipment Results */}
              {equipmentResults.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-2">
                    <Package className="h-3 w-3" />
                    Equipment
                  </div>
                  {equipmentResults.map((result, index) => {
                    const eq = result.item as Equipment;
                    const globalIndex = index;
                    const isSelected = selectedIndex === globalIndex;

                    return (
                      <button
                        key={eq.id}
                        className={cn(
                          "w-full px-3 py-2 flex items-center gap-3 text-left hover:bg-accent transition-colors",
                          isSelected && "bg-accent"
                        )}
                        onClick={() => handleSelect(result)}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-orange-100">
                          <Package className="h-4 w-4 text-orange-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{eq.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            {eq.sku}
                          </p>
                        </div>
                        {isSelected && (
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Assembly Results */}
              {assemblyResults.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-2 mt-2">
                    <Layers className="h-3 w-3" />
                    Assemblies
                  </div>
                  {assemblyResults.map((result, index) => {
                    const asm = result.item as Assembly;
                    const globalIndex = equipmentResults.length + index;
                    const isSelected = selectedIndex === globalIndex;

                    return (
                      <button
                        key={asm.id}
                        className={cn(
                          "w-full px-3 py-2 flex items-center gap-3 text-left hover:bg-accent transition-colors",
                          isSelected && "bg-accent"
                        )}
                        onClick={() => handleSelect(result)}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100">
                          <Layers className="h-4 w-4 text-slate-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{asm.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {asm.items.length} items • {asm.status.replace("_", " ").toLowerCase()}
                          </p>
                        </div>
                        {isSelected && (
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-3 py-2 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↵</kbd>
              select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">esc</kbd>
              close
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

