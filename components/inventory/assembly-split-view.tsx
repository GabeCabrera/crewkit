"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FilterChips, CategoryBadge } from "@/components/ui/filter-chips";
import {
  Search,
  Layers,
  Plus,
  X,
  Trash2,
  Check,
  Package,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  Archive,
  Eye,
  EyeOff,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { formatCurrency, cn } from "@/lib/utils";
import { EquipmentCombobox } from "@/components/assembly/equipment-combobox";
import type { Equipment, Assembly, AssemblyItem } from "./inventory-layout";

interface AssemblySplitViewProps {
  assemblies: Assembly[];
  allEquipment: Equipment[];
  selectedAssemblyId: string | null;
  onSelectAssembly: (id: string | null) => void;
  onRefresh: () => void;
  isCreating: boolean;
  onCancelCreate: () => void;
}

interface AssemblyCategory {
  id: string;
  name: string;
}

interface AssemblyType {
  id: string;
  name: string;
  slug?: string;
  description?: string | null;
  categoryId: string;
  category: {
    id: string;
    name: string;
  };
}

interface ItemInput {
  equipmentId: string;
  quantity: number;
}

const statusColors = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  PENDING_APPROVAL: "bg-yellow-50 text-yellow-700 border-yellow-200",
  APPROVED: "bg-green-50 text-green-700 border-green-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
};

const statusLabels = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

// Assembly List Item Component
function AssemblyListItem({
  assembly,
  isSelected,
  onClick,
  equipment,
}: {
  assembly: Assembly;
  isSelected: boolean;
  onClick: () => void;
  equipment: Equipment[];
}) {
  const totalCost = assembly.items.reduce((sum, item) => {
    const eq = equipment.find((e) => e.id === item.equipmentId);
    return sum + (eq?.pricePerUnit || 0) * item.quantity;
  }, 0);

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-3 rounded-lg border transition-all",
        isSelected
          ? "bg-orange-50 border-orange-200 ring-1 ring-orange-200"
          : assembly.isLegacy
          ? "bg-slate-50 border-slate-200 opacity-60 hover:opacity-100"
          : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {assembly.isLegacy && (
              <Archive className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            )}
            <p className={cn(
              "font-medium text-sm truncate",
              assembly.isLegacy && "text-slate-500"
            )}>
              {assembly.name}
            </p>
          </div>
          {assembly.description && (
            <p className="text-xs text-slate-500 truncate mt-0.5">
              {assembly.description}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge
            variant="outline"
            className={cn("text-xs", statusColors[assembly.status])}
          >
            {statusLabels[assembly.status]}
          </Badge>
          {assembly.isLegacy && (
            <Badge variant="outline" className="text-xs bg-slate-100 text-slate-500 border-slate-200">
              Legacy
            </Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Package className="h-3 w-3" />
          {assembly.items.length} items
        </span>
        <span className="flex items-center gap-1">
          <DollarSign className="h-3 w-3" />
          {formatCurrency(totalCost)}
        </span>
      </div>
    </button>
  );
}

// Type Chip Selector Component
function TypeChipSelector({
  types,
  selectedTypeId,
  onSelectType,
}: {
  types: AssemblyType[];
  selectedTypeId: string | null;
  onSelectType: (typeId: string | null, categoryId: string | null) => void;
}) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Get unique categories from types
  const categories = useMemo(() => {
    const categoryMap = new Map<string, { id: string; name: string }>();
    types.forEach((type) => {
      if (type.category && !categoryMap.has(type.category.id)) {
        categoryMap.set(type.category.id, type.category);
      }
    });
    return Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [types]);

  // Filter types by selected category
  const filteredTypes = useMemo(() => {
    if (!selectedCategoryId) return types;
    return types.filter((t) => t.categoryId === selectedCategoryId);
  }, [types, selectedCategoryId]);

  // Category chip options with counts
  const categoryOptions = useMemo(() => {
    return categories.map((cat) => ({
      id: cat.id,
      label: cat.name,
      count: types.filter((t) => t.categoryId === cat.id).length,
    }));
  }, [categories, types]);

  // Handle category selection
  const handleCategoryChange = (selected: string[]) => {
    setSelectedCategoryId(selected[0] || null);
  };

  // Handle type selection
  const handleTypeClick = (type: AssemblyType) => {
    if (selectedTypeId === type.id) {
      onSelectType(null, null);
    } else {
      onSelectType(type.id, type.categoryId);
    }
  };

  const selectedType = selectedTypeId ? types.find((t) => t.id === selectedTypeId) : null;

  return (
    <div className="space-y-3">
      {/* Category filter chips */}
      <FilterChips
        options={categoryOptions}
        selected={selectedCategoryId ? [selectedCategoryId] : []}
        onChange={handleCategoryChange}
        allowMultiple={false}
        showAll={true}
        allLabel="All Groups"
      />

      {/* Type list */}
      <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
        {filteredTypes.length === 0 ? (
          <div className="p-4 text-center text-sm text-slate-500">
            No types available
          </div>
        ) : (
          filteredTypes.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => handleTypeClick(type)}
              className={cn(
                "w-full text-left px-3 py-2.5 transition-colors",
                selectedTypeId === type.id
                  ? "bg-orange-50"
                  : "hover:bg-slate-50"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {selectedTypeId === type.id && (
                      <Check className="h-4 w-4 text-orange-600 shrink-0" />
                    )}
                    <span className={cn(
                      "text-sm font-medium truncate",
                      selectedTypeId === type.id && "text-orange-700"
                    )}>
                      {type.name}
                    </span>
                  </div>
                  {type.description && (
                    <p className="text-xs text-slate-500 truncate mt-0.5 pl-6">
                      {type.description}
                    </p>
                  )}
                </div>
                <CategoryBadge category={type.category.name} className="shrink-0" />
              </div>
            </button>
          ))
        )}
      </div>

      {/* Selected type display */}
      {selectedType && (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Check className="h-4 w-4 text-green-600" />
          <span>Selected:</span>
          <span className="font-medium">{selectedType.name}</span>
        </div>
      )}
    </div>
  );
}

// Assembly Editor Component
function AssemblyEditor({
  assembly,
  equipment,
  types,
  onSave,
  onCancel,
  onStatusChange,
  onDelete,
  onBack,
  isNew,
  showBackButton = false,
}: {
  assembly: Assembly | null;
  equipment: Equipment[];
  types: AssemblyType[];
  onSave: (data: {
    name: string;
    description: string;
    categoryId: string | null;
    typeId: string | null;
    items: ItemInput[];
    status?: Assembly["status"];
    isLegacy?: boolean;
  }) => Promise<void>;
  onCancel: () => void;
  onStatusChange?: (status: Assembly["status"]) => Promise<void>;
  onDelete?: () => Promise<void>;
  onBack?: () => void;
  isNew: boolean;
  showBackButton?: boolean;
}) {
  const [name, setName] = useState(assembly?.name || "");
  const [description, setDescription] = useState(assembly?.description || "");
  const [categoryId, setCategoryId] = useState<string | null>(
    assembly?.categoryId || null
  );
  const [typeId, setTypeId] = useState<string | null>(assembly?.typeId || null);
  const [isLegacy, setIsLegacy] = useState(assembly?.isLegacy || false);
  const [items, setItems] = useState<ItemInput[]>(
    assembly?.items.map((i) => ({ equipmentId: i.equipmentId, quantity: i.quantity })) || [
      { equipmentId: "", quantity: 1 },
    ]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when assembly changes
  useEffect(() => {
    setName(assembly?.name || "");
    setDescription(assembly?.description || "");
    setCategoryId(assembly?.categoryId || null);
    setTypeId(assembly?.typeId || null);
    setIsLegacy(assembly?.isLegacy || false);
    setItems(
      assembly?.items.map((i) => ({ equipmentId: i.equipmentId, quantity: i.quantity })) || [
        { equipmentId: "", quantity: 1 },
      ]
    );
    setError(null);
  }, [assembly]);

  // Calculate total cost
  const totalCost = items.reduce((sum, item) => {
    if (!item.equipmentId) return sum;
    const eq = equipment.find((e) => e.id === item.equipmentId);
    return sum + (eq?.pricePerUnit || 0) * item.quantity;
  }, 0);

  // Handle item change
  const handleItemChange = (index: number, field: "equipmentId" | "quantity", value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto-add new row if last row is filled
    if (field === "equipmentId" && value && index === items.length - 1) {
      newItems.push({ equipmentId: "", quantity: 1 });
    }
    
    setItems(newItems);
  };

  // Remove item
  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Save handler
  const handleSave = async (status?: Assembly["status"]) => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    const validItems = items.filter((i) => i.equipmentId);
    if (validItems.length === 0) {
      setError("At least one equipment item is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        categoryId,
        typeId,
        items: validItems,
        status,
        isLegacy,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!assembly && !isNew) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 p-6">
        <div className="text-center">
          <Layers className="h-12 w-12 mx-auto mb-3 text-slate-300" />
          <p>Select an assembly to view details</p>
          <p className="text-sm mt-1">or create a new one</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 sm:px-6 sm:py-4 border-b bg-white">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {showBackButton && onBack && (
              <Button variant="ghost" size="sm" onClick={onBack} className="shrink-0 -ml-2 md:hidden mt-0.5">
                <ChevronLeft className="h-4 w-4 mr-1" />
                <span>Back</span>
              </Button>
            )}
            <div className="flex-1 min-w-0">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isNew ? "New Assembly Name" : "Assembly name"}
                className="font-semibold text-lg border-0 shadow-none px-0 h-auto py-0 focus-visible:ring-0 bg-transparent placeholder:text-slate-400 w-full"
              />
              {assembly && (
                <Badge variant="outline" className={cn("mt-2", statusColors[assembly.status])}>
                  {statusLabels[assembly.status]}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {!isNew && assembly?.status === "PENDING_APPROVAL" && onStatusChange && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onStatusChange("REJECTED")}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Reject</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => onStatusChange("APPROVED")}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Approve</span>
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8 hidden md:flex">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6 space-y-6 max-w-2xl">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Description Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description of this assembly"
                rows={2}
              />
            </div>
          </div>

          {/* Classification Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wide">
              Assembly Type
            </h4>
            
            <TypeChipSelector
              types={types}
              selectedTypeId={typeId}
              onSelectType={(newTypeId, newCategoryId) => {
                setTypeId(newTypeId);
                setCategoryId(newCategoryId);
              }}
            />
          </div>

          {/* Equipment Items Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wide">
              Equipment Items *
            </h4>
            
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <EquipmentCombobox
                      equipment={equipment}
                      value={item.equipmentId}
                      onValueChange={(id: string) => handleItemChange(index, "equipmentId", id)}
                      placeholder="Select equipment"
                    />
                  </div>
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) =>
                      handleItemChange(index, "quantity", parseInt(e.target.value) || 1)
                    }
                    className="w-16 sm:w-20 shrink-0"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveItem(index)}
                    disabled={items.length === 1}
                    className="shrink-0 h-10 w-10"
                  >
                    <Trash2 className="h-4 w-4 text-slate-400" />
                  </Button>
                </div>
              ))}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setItems([...items, { equipmentId: "", quantity: 1 }])}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Item
            </Button>
          </div>

          {/* Cost Summary */}
          <div className="p-4 rounded-lg bg-slate-50 border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Estimated Cost</span>
              <span className="text-lg font-semibold">{formatCurrency(totalCost)}</span>
            </div>
          </div>

          {/* Settings Section - Only show for existing assemblies */}
          {!isNew && (
            <div className="space-y-4 pt-2">
              <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                Settings
              </h4>
              
              <div className="p-4 rounded-lg border bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-9 w-9 rounded-lg flex items-center justify-center",
                      isLegacy ? "bg-slate-100" : "bg-slate-50"
                    )}>
                      <Archive className={cn(
                        "h-4 w-4",
                        isLegacy ? "text-slate-600" : "text-slate-400"
                      )} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Mark as Legacy</p>
                      <p className="text-xs text-slate-500">
                        Hide from default views without deleting
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={isLegacy}
                    onCheckedChange={setIsLegacy}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 px-4 py-3 sm:px-6 sm:py-4 border-t bg-white">
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
          {!isNew && onDelete ? (
            <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-600 w-full sm:w-auto">
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          ) : (
            <div />
          )}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2">
            <Button variant="outline" onClick={onCancel} disabled={saving} className="w-full sm:w-auto">
              Cancel
            </Button>
            {isNew ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleSave("DRAFT")}
                  disabled={saving}
                  className="w-full sm:w-auto"
                >
                  Save Draft
                </Button>
                <Button
                  onClick={() => handleSave("PENDING_APPROVAL")}
                  disabled={saving}
                  className="bg-orange-600 hover:bg-orange-700 w-full sm:w-auto"
                >
                  {saving && <RefreshCw className="h-4 w-4 mr-1 animate-spin" />}
                  Submit for Approval
                </Button>
              </>
            ) : (
              <Button
                onClick={() => handleSave()}
                disabled={saving}
                className="bg-orange-600 hover:bg-orange-700 w-full sm:w-auto"
              >
                {saving && <RefreshCw className="h-4 w-4 mr-1 animate-spin" />}
                Save Changes
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AssemblySplitView({
  assemblies,
  allEquipment,
  selectedAssemblyId,
  onSelectAssembly,
  onRefresh,
  isCreating,
  onCancelCreate,
}: AssemblySplitViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showLegacy, setShowLegacy] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string[]>([]);
  const [categories, setCategories] = useState<AssemblyCategory[]>([]);
  const [types, setTypes] = useState<AssemblyType[]>([]);

  // Determine if we should show the editor (on mobile, only show if something is selected)
  const showEditor = selectedAssemblyId !== null || isCreating;

  // Fetch categories and types
  useEffect(() => {
    const fetchCategoriesAndTypes = async () => {
      try {
        const [catRes, typeRes] = await Promise.all([
          fetch("/api/assembly-categories"),
          fetch("/api/assembly-types"),
        ]);
        const catData = await catRes.json();
        const typeData = await typeRes.json();
        setCategories(Array.isArray(catData) ? catData : []);
        setTypes(Array.isArray(typeData) ? typeData : []);
      } catch (error) {
        console.error("Failed to fetch categories/types:", error);
      }
    };
    fetchCategoriesAndTypes();
  }, []);

  // Category filter options with counts
  const categoryFilterOptions = useMemo(() => {
    return categories.map((cat) => ({
      id: cat.id,
      label: cat.name,
      count: assemblies.filter((a) => !a.isLegacy && a.categoryId === cat.id).length,
    }));
  }, [categories, assemblies]);

  // Filter assemblies
  const filteredAssemblies = useMemo(() => {
    return assemblies.filter((assembly) => {
      // Legacy filter
      if (!showLegacy && assembly.isLegacy) return false;
      
      // Category filter
      if (selectedCategoryFilter.length > 0 && !selectedCategoryFilter.includes(assembly.categoryId || "")) {
        return false;
      }
      
      // Search filter
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        assembly.name.toLowerCase().includes(query) ||
        assembly.description?.toLowerCase().includes(query)
      );
    });
  }, [assemblies, showLegacy, selectedCategoryFilter, searchQuery]);
  
  // Count legacy assemblies
  const legacyCount = assemblies.filter(a => a.isLegacy).length;

  const selectedAssembly = selectedAssemblyId
    ? assemblies.find((a) => a.id === selectedAssemblyId)
    : null;

  // Save assembly
  const handleSave = async (data: {
    name: string;
    description: string;
    categoryId: string | null;
    typeId: string | null;
    items: ItemInput[];
    status?: Assembly["status"];
    isLegacy?: boolean;
  }) => {
    const url = selectedAssemblyId
      ? `/api/assemblies/${selectedAssemblyId}`
      : "/api/assemblies";
    const method = selectedAssemblyId ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to save assembly");
    }

    onRefresh();
    if (isCreating) {
      onCancelCreate();
    }
  };

  // Change status
  const handleStatusChange = async (status: Assembly["status"]) => {
    if (!selectedAssemblyId) return;

    const response = await fetch(`/api/assemblies/${selectedAssemblyId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error("Failed to update status");
    }

    onRefresh();
  };

  // Delete assembly
  const handleDelete = async () => {
    if (!selectedAssemblyId) return;
    if (!confirm("Are you sure you want to delete this assembly?")) return;

    const response = await fetch(`/api/assemblies/${selectedAssemblyId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete assembly");
    }

    onSelectAssembly(null);
    onRefresh();
  };

  // Handle back button on mobile
  const handleBack = () => {
    if (isCreating) {
      onCancelCreate();
    } else {
      onSelectAssembly(null);
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-4">
      {/* List Panel - Hidden on mobile when editor is shown */}
      <div className={cn(
        "flex flex-col bg-white rounded-lg border overflow-hidden",
        "w-full md:w-80 md:shrink-0",
        showEditor ? "hidden md:flex" : "flex"
      )}>
        {/* Search */}
        <div className="p-3 border-b space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search assemblies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          {/* Category filter chips */}
          {categoryFilterOptions.length > 0 && (
            <FilterChips
              options={categoryFilterOptions}
              selected={selectedCategoryFilter}
              onChange={setSelectedCategoryFilter}
              allowMultiple={true}
              showAll={true}
              allLabel="All"
            />
          )}
          
          {legacyCount > 0 && (
            <button
              onClick={() => setShowLegacy(!showLegacy)}
              className={cn(
                "flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-colors w-full",
                showLegacy 
                  ? "bg-slate-100 text-slate-700" 
                  : "text-slate-500 hover:bg-slate-50"
              )}
            >
              {showLegacy ? (
                <Eye className="h-3 w-3" />
              ) : (
                <EyeOff className="h-3 w-3" />
              )}
              {showLegacy ? "Hiding" : "Show"} {legacyCount} legacy
            </button>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredAssemblies.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Layers className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No assemblies found</p>
            </div>
          ) : (
            filteredAssemblies.map((assembly) => (
              <AssemblyListItem
                key={assembly.id}
                assembly={assembly}
                isSelected={assembly.id === selectedAssemblyId && !isCreating}
                onClick={() => {
                  onSelectAssembly(assembly.id);
                  onCancelCreate();
                }}
                equipment={allEquipment}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-2 border-t">
          <p className="text-xs text-slate-500 text-center">
            {filteredAssemblies.length} assemblies
          </p>
        </div>
      </div>

      {/* Editor Panel - Takes full width on mobile when shown */}
      <div className={cn(
        "bg-white rounded-lg border overflow-hidden flex flex-col",
        "flex-1",
        showEditor ? "flex" : "hidden md:flex"
      )}>
        <AssemblyEditor
          assembly={isCreating ? null : selectedAssembly || null}
          equipment={allEquipment}
          types={types}
          onSave={handleSave}
          onCancel={() => {
            if (isCreating) {
              onCancelCreate();
            } else {
              onSelectAssembly(null);
            }
          }}
          onBack={handleBack}
          showBackButton={showEditor}
          onStatusChange={selectedAssembly ? handleStatusChange : undefined}
          onDelete={selectedAssembly ? handleDelete : undefined}
          isNew={isCreating}
        />
      </div>
    </div>
  );
}
