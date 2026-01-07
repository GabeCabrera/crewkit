"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Package, Sparkles, Search, AlertTriangle, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { matchesWithSynonyms, expandSearchQuery } from "@/lib/equipment-synonyms"

interface Equipment {
  id: string
  name: string
  sku: string
  pricePerUnit: number
  description?: string | null
  photoUrl?: string | null
  inventory?: { quantity: number } | null
}

interface EquipmentComboboxProps {
  equipment: Equipment[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  loading?: boolean
}

// Stock status helper
function getStockStatus(quantity: number): { label: string; color: string; bgColor: string } {
  if (quantity === 0) {
    return { label: "Out of stock", color: "text-red-600", bgColor: "bg-red-50" }
  }
  if (quantity <= 10) {
    return { label: "Low stock", color: "text-amber-600", bgColor: "bg-amber-50" }
  }
  return { label: "In stock", color: "text-emerald-600", bgColor: "bg-emerald-50" }
}

// Equipment item component for consistent rendering
function EquipmentItem({ 
  eq, 
  isSelected,
  showStockBadge = true,
}: { 
  eq: Equipment
  isSelected: boolean
  showStockBadge?: boolean
}) {
  const quantity = eq.inventory?.quantity || 0
  const stockStatus = getStockStatus(quantity)
  
  return (
    <>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Thumbnail - always show consistently */}
        <div className="relative shrink-0">
          {eq.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={eq.photoUrl} 
              alt="" 
              className="h-10 w-10 rounded-lg object-cover border border-border/50" 
            />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-muted/80 flex items-center justify-center border border-border/50">
              <Package className="h-5 w-5 text-muted-foreground/70" />
            </div>
          )}
          {/* Stock indicator dot */}
          {quantity <= 10 && (
            <div className={cn(
              "absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-white",
              quantity === 0 ? "bg-red-500" : "bg-amber-500"
            )} />
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0 py-0.5">
          <p className="font-medium text-sm leading-tight truncate" title={eq.name}>
            {eq.name}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground font-mono">{eq.sku}</span>
            <span className="text-muted-foreground/50">•</span>
            <span className={cn("text-xs font-medium", stockStatus.color)}>
              {quantity.toLocaleString()} {showStockBadge && quantity > 0 ? "available" : ""}
            </span>
          </div>
        </div>
      </div>
      
      <Check
        className={cn(
          "ml-2 h-4 w-4 shrink-0 transition-opacity",
          isSelected ? "opacity-100 text-primary" : "opacity-0"
        )}
      />
    </>
  )
}

// Loading skeleton for equipment items
function EquipmentSkeleton() {
  return (
    <div className="flex items-center gap-3 px-2 py-2">
      <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
        <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
      </div>
    </div>
  )
}

export function EquipmentCombobox({
  equipment,
  value,
  onValueChange,
  placeholder = "Select equipment",
  disabled = false,
  loading = false,
}: EquipmentComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  const selectedEquipment = equipment.find((eq) => eq.id === value)
  
  // Check if equipment is still loading
  const isLoading = loading || equipment.length === 0

  // Filter equipment based on search query (with synonym support)
  const { filteredEquipment, usedSynonyms, matchedTerms } = React.useMemo(() => {
    if (!searchQuery) {
      // Show first 50 items when no search (sorted by name)
      const sorted = [...equipment].sort((a, b) => a.name.localeCompare(b.name))
      return { 
        filteredEquipment: sorted.slice(0, 50), 
        usedSynonyms: false,
        matchedTerms: []
      }
    }
    
    const query = searchQuery.toLowerCase()
    const expandedTerms = expandSearchQuery(query)
    const hasSynonyms = expandedTerms.length > 1
    
    const filtered = equipment.filter((eq) => matchesWithSynonyms(eq, query))
    
    // Sort by relevance: exact matches first, then by name
    filtered.sort((a, b) => {
      const aName = a.name.toLowerCase()
      const bName = b.name.toLowerCase()
      const aExact = aName.includes(query)
      const bExact = bName.includes(query)
      
      if (aExact && !bExact) return -1
      if (!aExact && bExact) return 1
      return aName.localeCompare(bName)
    })
    
    return { 
      filteredEquipment: filtered.slice(0, 100), // Limit to 100 results
      usedSynonyms: hasSynonyms && filtered.length > 0,
      matchedTerms: hasSynonyms ? expandedTerms.slice(1, 4) : [] // Show up to 3 related terms
    }
  }, [equipment, searchQuery])

  // Get suggested search terms for empty state
  const searchSuggestions = React.useMemo(() => {
    return ["bolt", "clamp", "cable", "splice", "pigtail", "mount"]
  }, [])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal h-auto min-h-10 py-2",
            !selectedEquipment && "text-muted-foreground"
          )}
          disabled={disabled || isLoading}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading equipment...</span>
            </div>
          ) : selectedEquipment ? (
            <div className="flex items-center gap-2 truncate">
              {selectedEquipment.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={selectedEquipment.photoUrl} 
                  alt="" 
                  className="h-6 w-6 rounded object-cover shrink-0 border border-border/50" 
                />
              ) : (
                <div className="h-6 w-6 rounded bg-muted flex items-center justify-center shrink-0">
                  <Package className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              )}
              <span className="truncate font-medium text-foreground">{selectedEquipment.name}</span>
              <span className={cn(
                "text-xs shrink-0 px-1.5 py-0.5 rounded",
                getStockStatus(selectedEquipment.inventory?.quantity || 0).bgColor,
                getStockStatus(selectedEquipment.inventory?.quantity || 0).color
              )}>
                {selectedEquipment.inventory?.quantity || 0}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <span>{placeholder}</span>
            </div>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[calc(100vw-2rem)] sm:w-[450px] max-w-[450px] p-0" 
        align="start"
        side="bottom"
        sideOffset={4}
      >
        <Command shouldFilter={false} className="rounded-lg">
          <div className="flex items-center border-b px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <CommandInput 
              placeholder="Search by name, SKU, or common terms..." 
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="border-0 focus:ring-0"
            />
            {searchQuery && (
              <span className="text-xs text-muted-foreground shrink-0">
                {filteredEquipment.length} results
              </span>
            )}
          </div>
          
          {/* Header with equipment count */}
          {!searchQuery && equipment.length > 0 && (
            <div className="px-3 py-2 border-b bg-muted/30">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{equipment.length.toLocaleString()} items available</span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">↑↓</kbd>
                  <span>to navigate</span>
                </span>
              </div>
            </div>
          )}
          
          <CommandList className="max-h-[350px]">
            {isLoading ? (
              <div className="p-2 space-y-1">
                {[...Array(5)].map((_, i) => (
                  <EquipmentSkeleton key={i} />
                ))}
              </div>
            ) : (
              <>
                <CommandEmpty>
                  <div className="py-6 text-center px-4">
                    <div className="h-12 w-12 rounded-full bg-muted/80 flex items-center justify-center mx-auto mb-3">
                      <Package className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                    <p className="font-medium text-sm">No equipment found for &quot;{searchQuery}&quot;</p>
                    <p className="text-xs text-muted-foreground mt-1 mb-3">
                      Try a different term or check spelling
                    </p>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      <span className="text-xs text-muted-foreground">Try:</span>
                      {searchSuggestions.slice(0, 4).map((term) => (
                        <button
                          key={term}
                          type="button"
                          onClick={() => setSearchQuery(term)}
                          className="text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80 transition-colors"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                </CommandEmpty>
                
                {/* Synonym indicator */}
                {usedSynonyms && searchQuery && (
                  <div className="px-3 py-2 text-xs border-b bg-primary/5">
                    <div className="flex items-center gap-1.5 text-primary">
                      <Sparkles className="h-3 w-3" />
                      <span className="font-medium">Smart search:</span>
                      <span className="text-muted-foreground">
                        Also searching for {matchedTerms.slice(0, 3).map((t, i) => (
                          <span key={t}>
                            <span className="text-foreground">&quot;{t}&quot;</span>
                            {i < Math.min(matchedTerms.length, 3) - 1 && ", "}
                          </span>
                        ))}
                      </span>
                    </div>
                  </div>
                )}
                
                <CommandGroup className="p-1">
                  {filteredEquipment.map((eq) => {
                    const isOutOfStock = (eq.inventory?.quantity || 0) === 0
                    
                    return (
                      <CommandItem
                        key={eq.id}
                        value={eq.id}
                        onSelect={(currentValue) => {
                          onValueChange(currentValue === value ? "" : currentValue)
                          setOpen(false)
                          setSearchQuery("")
                        }}
                        className={cn(
                          "cursor-pointer rounded-md mx-1 py-2",
                          "transition-colors",
                          "aria-selected:bg-accent",
                          isOutOfStock && "opacity-60"
                        )}
                        disabled={isOutOfStock}
                      >
                        <EquipmentItem 
                          eq={eq} 
                          isSelected={value === eq.id}
                        />
                        {isOutOfStock && (
                          <span className="ml-2 text-xs text-red-500 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                          </span>
                        )}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
                
                {/* Show more indicator */}
                {searchQuery && filteredEquipment.length >= 100 && (
                  <div className="px-3 py-2 text-xs text-center text-muted-foreground border-t bg-muted/30">
                    Showing first 100 results. Refine your search for more specific results.
                  </div>
                )}
                
                {!searchQuery && equipment.length > 50 && (
                  <div className="px-3 py-2 text-xs text-center text-muted-foreground border-t bg-muted/30">
                    Start typing to search all {equipment.length.toLocaleString()} items
                  </div>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
