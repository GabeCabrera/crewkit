"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Check,
  X,
  RefreshCw,
  Package,
  DollarSign,
  Layers,
  Copy,
  FileText,
  Tag,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { formatCurrency, cn } from "@/lib/utils";
import type { Equipment, Assembly, AssemblyItem } from "@/app/admin/inventory/page";
import { EquipmentCombobox } from "@/components/assembly/equipment-combobox";

interface AssembliesTableProps {
  assemblies: Assembly[];
  equipment: Equipment[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  onNavigateToEquipment: (equipmentId: string) => void;
}

interface ItemInput {
  equipmentId: string;
  quantity: number;
}

const statusColors = {
  DRAFT: "bg-gray-100 text-gray-700 border-gray-200",
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

// Mobile Assembly Card
function AssemblyCard({
  assembly,
  totalCost,
  onEdit,
  onDelete,
  onStatusChange,
  onToggle,
  isExpanded,
  onNavigateToEquipment,
}: {
  assembly: Assembly;
  totalCost: number;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: Assembly["status"]) => void;
  onToggle: () => void;
  isExpanded: boolean;
  onNavigateToEquipment: (equipmentId: string) => void;
}) {
  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="font-medium text-sm truncate">{assembly.name}</h4>
            {assembly.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {assembly.description}
              </p>
            )}
          </div>
          <span className={cn(
            "shrink-0 px-2 py-0.5 rounded-full text-xs font-medium border",
            statusColors[assembly.status]
          )}>
            {statusLabels[assembly.status]}
          </span>
        </div>
        
        {/* Stats */}
        <div className="flex items-center gap-4 mt-2 text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Package className="h-3.5 w-3.5" />
            <span>{assembly.items.length} items</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <DollarSign className="h-3.5 w-3.5" />
            <span>{formatCurrency(totalCost)}</span>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            className="h-8 flex-1"
            onClick={onToggle}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Hide Items
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                View Items
              </>
            )}
          </Button>
          
          {assembly.status === "PENDING_APPROVAL" && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={() => onStatusChange("APPROVED")}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => onStatusChange("REJECTED")}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onEdit}
          >
            <Edit className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Expanded Items */}
      {isExpanded && (
        <div className="border-t bg-muted/30 p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">Equipment breakdown:</p>
          <div className="space-y-2">
            {assembly.items.map((item) => (
              <div 
                key={item.id}
                className="flex items-center justify-between p-2 bg-background rounded border text-sm"
              >
                <button
                  onClick={() => onNavigateToEquipment(item.equipmentId)}
                  className="text-left font-medium text-primary hover:underline truncate max-w-[60%]"
                >
                  {item.equipment.name}
                </button>
                <span className="text-muted-foreground whitespace-nowrap">
                  {item.quantity} × {formatCurrency(item.equipment.pricePerUnit)}
                </span>
              </div>
            ))}
            <div className="flex justify-end pt-2 border-t text-sm">
              <span className="font-semibold">Total: {formatCurrency(totalCost)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function AssembliesTable({
  assemblies,
  equipment,
  searchValue,
  onSearchChange,
  onRefresh,
  onNavigateToEquipment,
}: AssembliesTableProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Assembly | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [flairFilter, setFlairFilter] = useState<string>("all");
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [formData, setFormData] = useState<{ name: string; description: string; status: Assembly["status"]; categories: string[] }>({
    name: "",
    description: "",
    status: "APPROVED" as Assembly["status"],
    categories: [],
  });
  const [items, setItems] = useState<ItemInput[]>([{ equipmentId: "", quantity: 1 }]);
  const [existingCategories, setExistingCategories] = useState<string[]>([]);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryInput, setCategoryInput] = useState("");

  // Fetch existing categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/assemblies/categories");
        if (response.ok) {
          const data = await response.json();
          setExistingCategories(data);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };
    fetchCategories();
  }, []);

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validItems = items.filter(item => item.equipmentId && item.quantity > 0);
    if (validItems.length === 0) {
      alert("Please add at least one equipment item");
      return;
    }

    try {
      const url = editing ? `/api/assemblies/${editing.id}` : "/api/assemblies";
      const method = editing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          status: formData.status,
          categories: formData.categories,
          items: validItems,
        }),
      });

      if (response.ok) {
        setDialogOpen(false);
        resetForm();
        onRefresh();
      }
    } catch (error) {
      console.error("Error saving assembly:", error);
    }
  };

  const handleEdit = (assembly: Assembly) => {
    setEditing(assembly);
    setFormData({
      name: assembly.name,
      description: assembly.description || "",
      status: assembly.status,
      categories: (assembly as any).categories || [],
    });
    setItems(
      assembly.items.map(item => ({
        equipmentId: item.equipmentId,
        quantity: item.quantity,
      }))
    );
    setDialogOpen(true);
  };

  const handleDuplicate = (assembly: Assembly) => {
    // Set up form with duplicated data but new name
    setEditing(null); // This is a new assembly, not editing
    setFormData({
      name: `${assembly.name} (Copy)`,
      description: assembly.description || "",
      status: "DRAFT" as Assembly["status"], // New copies start as draft
    });
    setItems([
      ...assembly.items.map(item => ({
        equipmentId: item.equipmentId,
        quantity: item.quantity,
      })),
      { equipmentId: "", quantity: 1 } // Add empty row for new items
    ]);
    setDuplicateDialogOpen(false);
    setDialogOpen(true);
  };

  const handleCreateNew = () => {
    setEditing(null);
    resetForm();
    setCreateMenuOpen(false);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this assembly?")) return;

    try {
      const response = await fetch(`/api/assemblies/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        onRefresh();
      }
    } catch (error) {
      console.error("Error deleting assembly:", error);
    }
  };

  const handleStatusChange = async (id: string, status: Assembly["status"]) => {
    try {
      const response = await fetch(`/api/assemblies/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        onRefresh();
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const resetForm = () => {
    setEditing(null);
    setFormData({
      name: "",
      description: "",
      status: "APPROVED",
      categories: [],
    });
    setItems([{ equipmentId: "", quantity: 1 }]);
  };

  const removeItem = (index: number) => {
    // Always keep at least one row
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      // If we removed the last item and there's no empty row, add one
      if (newItems.every(item => item.equipmentId)) {
        newItems.push({ equipmentId: "", quantity: 1 });
      }
      setItems(newItems);
    }
  };

  const updateItem = (index: number, field: keyof ItemInput, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto-add a new empty row when the last item gets an equipment selected
    if (field === "equipmentId" && value && index === newItems.length - 1) {
      newItems.push({ equipmentId: "", quantity: 1 });
    }
    
    setItems(newItems);
  };

  // Calculate total cost of an assembly
  const calculateAssemblyCost = (assembly: Assembly): number => {
    return assembly.items.reduce((total, item) => {
      return total + (item.equipment.pricePerUnit * item.quantity);
    }, 0);
  };

  // Calculate total cost of the form items being created/edited
  const calculateFormTotal = (): number => {
    return items.reduce((sum, item) => {
      const eq = equipment.find(e => e.id === item.equipmentId);
      return sum + (eq ? eq.pricePerUnit * item.quantity : 0);
    }, 0);
  };

  // Apply filters
  const filteredAssemblies = assemblies.filter(assembly => {
    if (statusFilter !== "all" && assembly.status !== statusFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search assemblies..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="flex-1 sm:flex-none sm:w-[140px] h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="PENDING_APPROVAL">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>

          {/* Create Assembly Menu */}
          <Popover open={createMenuOpen} onOpenChange={setCreateMenuOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" className="h-9 whitespace-nowrap">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Create Assembly</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="end">
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start h-9"
                  onClick={handleCreateNew}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Create New
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start h-9"
                  onClick={() => {
                    setCreateMenuOpen(false);
                    setDuplicateDialogOpen(true);
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  From Existing
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Duplicate Assembly Selection Dialog */}
          <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
            <DialogContent className="w-full max-w-md">
              <DialogHeader>
                <DialogTitle>Duplicate Assembly</DialogTitle>
                <DialogDescription>
                  Select an existing assembly to use as a template
                </DialogDescription>
              </DialogHeader>
              <Command className="rounded-lg border">
                <CommandInput placeholder="Search assemblies..." />
                <CommandList className="max-h-[300px]">
                  <CommandEmpty>No assemblies found.</CommandEmpty>
                  <CommandGroup>
                    {assemblies.map((assembly) => (
                      <CommandItem
                        key={assembly.id}
                        value={assembly.name}
                        onSelect={() => handleDuplicate(assembly)}
                        className="cursor-pointer"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{assembly.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {assembly.items.length} items · {formatCurrency(
                              assembly.items.reduce((sum, item) => 
                                sum + item.quantity * item.equipment.pricePerUnit, 0
                              )
                            )}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </DialogContent>
          </Dialog>

          {/* Create/Edit Assembly Sheet (Side Panel) */}
          <Sheet open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <SheetContent side="right">
              <form onSubmit={handleSubmit} className="flex flex-col h-full">
                <SheetHeader>
                  <SheetTitle>{editing ? "Edit Assembly" : "Create Assembly"}</SheetTitle>
                  <SheetDescription>
                    {editing ? "Update assembly details and equipment items" : "Create a new equipment assembly"}
                  </SheetDescription>
                </SheetHeader>
                
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Standard Installation Kit"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Optional description"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value as Assembly["status"] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                        <SelectItem value="APPROVED">Approved</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Flairs (Categories)</Label>
                    {/* Display selected flairs */}
                    {formData.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {formData.categories.map((cat) => (
                          <span
                            key={cat}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                          >
                            <Tag className="h-3 w-3" />
                            {cat}
                            <button
                              type="button"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  categories: formData.categories.filter((c) => c !== cat),
                                });
                              }}
                              className="ml-0.5 hover:bg-primary/20 rounded-full p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={categoryOpen}
                          className="justify-between font-normal"
                        >
                          <span className="text-muted-foreground">
                            {formData.categories.length === 0
                              ? "Add flairs..."
                              : `Add more flairs (${formData.categories.length} selected)`}
                          </span>
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0" align="start">
                        <Command>
                          <CommandInput
                            placeholder="Search or create flair..."
                            value={categoryInput}
                            onValueChange={setCategoryInput}
                          />
                          <CommandList>
                            <CommandEmpty>
                              {categoryInput ? (
                                <button
                                  className="w-full px-2 py-3 text-sm text-left hover:bg-accent rounded-sm flex items-center gap-2"
                                  onClick={() => {
                                    if (!formData.categories.includes(categoryInput)) {
                                      setFormData({
                                        ...formData,
                                        categories: [...formData.categories, categoryInput],
                                      });
                                    }
                                    setCategoryInput("");
                                  }}
                                >
                                  <Plus className="h-4 w-4" />
                                  Create &quot;{categoryInput}&quot;
                                </button>
                              ) : (
                                <span className="text-muted-foreground">
                                  Type to create a new flair
                                </span>
                              )}
                            </CommandEmpty>
                            {existingCategories.filter(
                              (cat) => !formData.categories.includes(cat)
                            ).length > 0 && (
                              <CommandGroup heading="Existing Flairs">
                                {existingCategories
                                  .filter((cat) => !formData.categories.includes(cat))
                                  .map((cat) => (
                                    <CommandItem
                                      key={cat}
                                      value={cat}
                                      onSelect={() => {
                                        setFormData({
                                          ...formData,
                                          categories: [...formData.categories, cat],
                                        });
                                        setCategoryInput("");
                                      }}
                                    >
                                      <Tag className="mr-2 h-4 w-4" />
                                      {cat}
                                    </CommandItem>
                                  ))}
                              </CommandGroup>
                            )}
                            {categoryInput &&
                              !existingCategories.some(
                                (c) => c.toLowerCase() === categoryInput.toLowerCase()
                              ) &&
                              !formData.categories.some(
                                (c) => c.toLowerCase() === categoryInput.toLowerCase()
                              ) && (
                                <CommandGroup heading="Create New">
                                  <CommandItem
                                    value={categoryInput}
                                    onSelect={() => {
                                      setFormData({
                                        ...formData,
                                        categories: [...formData.categories, categoryInput],
                                      });
                                      setCategoryInput("");
                                    }}
                                  >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create &quot;{categoryInput}&quot;
                                  </CommandItem>
                                </CommandGroup>
                              )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Equipment Items *</Label>
                      <span className="text-xs text-muted-foreground">
                        {items.filter(i => i.equipmentId).length} items
                      </span>
                    </div>
                    
                    {/* Equipment items - no scroll constraint in sheet */}
                    <div className="space-y-2">
                      {items.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <EquipmentCombobox
                              equipment={equipment}
                              value={item.equipmentId}
                              onValueChange={(value) => updateItem(index, "equipmentId", value)}
                              placeholder="Search equipment..."
                            />
                          </div>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                            placeholder="Qty"
                            className="w-16 sm:w-20 shrink-0"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0 h-9 w-9"
                            onClick={() => removeItem(index)}
                            disabled={items.length === 1 || (!item.equipmentId && index === items.length - 1)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    
                    {/* Added Items Summary */}
                    {items.some(item => item.equipmentId) && (
                      <div className="border rounded-lg p-3 bg-muted/30">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-sm font-medium">Added Items</Label>
                          <span className="text-xs text-muted-foreground">
                            {items.filter(i => i.equipmentId).length} items
                          </span>
                        </div>
                        <div className="space-y-1">
                          {items
                            .filter(item => item.equipmentId)
                            .map((item, idx) => {
                              const eq = equipment.find(e => e.id === item.equipmentId);
                              if (!eq) return null;
                              const lineTotal = eq.pricePerUnit * item.quantity;
                              return (
                                <div key={idx} className="flex justify-between text-sm gap-2">
                                  <span className="truncate flex-1">
                                    {item.quantity}× {eq.name}
                                  </span>
                                  <span className="text-muted-foreground shrink-0">
                                    {formatCurrency(lineTotal)}
                                  </span>
                                </div>
                              );
                            })}
                        </div>
                        <div className="border-t mt-2 pt-2 flex justify-between font-medium text-sm">
                          <span>Total</span>
                          <span>{formatCurrency(calculateFormTotal())}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <SheetFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editing ? "Save Changes" : "Create Assembly"}
                  </Button>
                </SheetFooter>
              </form>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Mobile View - Card List */}
      <div className="md:hidden space-y-2">
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-muted-foreground">
            {filteredAssemblies.length} of {assemblies.length} assemblies
          </p>
          <Button variant="ghost" size="sm" onClick={onRefresh} className="h-8">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        
        {filteredAssemblies.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No assemblies found. {searchValue && "Try adjusting your search."}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredAssemblies.map((assembly) => (
              <AssemblyCard
                key={assembly.id}
                assembly={assembly}
                totalCost={calculateAssemblyCost(assembly)}
                onEdit={() => handleEdit(assembly)}
                onDelete={() => handleDelete(assembly.id)}
                onStatusChange={(status) => handleStatusChange(assembly.id, status)}
                onToggle={() => toggleRow(assembly.id)}
                isExpanded={expandedRows.has(assembly.id)}
                onNavigateToEquipment={onNavigateToEquipment}
              />
            ))}
          </div>
        )}
      </div>

      {/* Desktop View - Table */}
      <Card className="hidden md:block">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Assemblies</CardTitle>
              <CardDescription>
                {filteredAssemblies.length} of {assemblies.length} assemblies
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Est. Cost</TableHead>
                <TableHead className="hidden lg:table-cell">Created By</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssemblies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No assemblies found. {searchValue && "Try adjusting your search."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAssemblies.map((assembly) => {
                  const isExpanded = expandedRows.has(assembly.id);
                  const totalCost = calculateAssemblyCost(assembly);

                  return (
                    <>
                      <TableRow key={assembly.id} className={cn(isExpanded && "border-b-0")}>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => toggleRow(assembly.id)}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div>
                            <p>{assembly.name}</p>
                            {assembly.description && (
                              <p className="text-sm text-muted-foreground truncate max-w-xs">
                                {assembly.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                            statusColors[assembly.status]
                          )}>
                            {statusLabels[assembly.status]}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            {assembly.items.length}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            {formatCurrency(totalCost)}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-sm">
                            {assembly.createdBy.name || assembly.createdBy.email}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            {assembly.status === "PENDING_APPROVAL" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleStatusChange(assembly.id, "APPROVED")}
                                  title="Approve"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleStatusChange(assembly.id, "REJECTED")}
                                  title="Reject"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(assembly)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(assembly.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`${assembly.id}-expanded`}>
                          <TableCell colSpan={7} className="bg-muted/50 py-4">
                            <div className="px-4">
                              <p className="text-sm font-medium mb-3">Equipment breakdown:</p>
                              <div className="grid gap-2 max-w-2xl">
                                {assembly.items.map((item) => (
                                  <div 
                                    key={item.id} 
                                    className="flex items-center justify-between p-2 bg-background rounded-lg border"
                                  >
                                    <Button
                                      variant="link"
                                      className="h-auto p-0 font-medium"
                                      onClick={() => onNavigateToEquipment(item.equipmentId)}
                                    >
                                      {item.equipment.name}
                                    </Button>
                                    <div className="flex items-center gap-4 text-sm">
                                      <span className="text-muted-foreground">
                                        {item.quantity} × {formatCurrency(item.equipment.pricePerUnit)}
                                      </span>
                                      <span className="font-medium">
                                        {formatCurrency(item.quantity * item.equipment.pricePerUnit)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                                <div className="flex justify-end pt-2 border-t mt-2">
                                  <span className="font-semibold">
                                    Total: {formatCurrency(totalCost)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
