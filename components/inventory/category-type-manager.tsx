"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  FolderTree,
  RefreshCw,
  ChevronRight,
  Layers,
  GripVertical,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CategoryBadge } from "@/components/ui/filter-chips";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface AssemblyCategory {
  id: string;
  name: string;
  description: string | null;
  order: number;
  _count: {
    types: number;
    assemblies: number;
  };
}

interface AssemblyType {
  id: string;
  name: string;
  description: string | null;
  order: number;
  categoryId: string;
  category: {
    id: string;
    name: string;
  };
  _count: {
    assemblies: number;
  };
}

// Sortable Category Item Component
function SortableCategoryItem({
  category,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
}: {
  category: AssemblyCategory;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between p-3 rounded-lg border transition-colors",
        isDragging && "opacity-50 shadow-lg bg-white z-50",
        isSelected 
          ? "bg-primary/5 border-primary/30" 
          : "hover:bg-muted/50"
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <button
          className="cursor-grab active:cursor-grabbing touch-none p-1 -ml-1 text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div 
          className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
          onClick={onSelect}
        >
          <ChevronRight className={cn(
            "h-4 w-4 text-muted-foreground transition-transform shrink-0",
            isSelected && "rotate-90"
          )} />
          <div className="min-w-0">
            <p className="font-medium truncate">{category.name}</p>
            <p className="text-xs text-muted-foreground">
              {category._count.types} types · {category._count.assemblies} assemblies
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Sortable Type Item Component
function SortableTypeItem({
  type,
  onEdit,
  onDelete,
}: {
  type: AssemblyType;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: type.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors",
        isDragging && "opacity-50 shadow-lg bg-white z-50"
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <button
          className="cursor-grab active:cursor-grabbing touch-none p-1 -ml-1 text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{type.name}</p>
            <CategoryBadge category={type.category.name} className="shrink-0" />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {type._count.assemblies} assemblies
            {type.description && ` · ${type.description}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
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
  );
}

export function CategoryTypeManager() {
  const [categories, setCategories] = useState<AssemblyCategory[]>([]);
  const [types, setTypes] = useState<AssemblyType[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Category dialog state
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AssemblyCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "", order: 0 });
  
  // Type dialog state
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<AssemblyType | null>(null);
  const [typeForm, setTypeForm] = useState({ name: "", description: "", categoryId: "", order: 0 });
  
  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ type: "category" | "type"; item: AssemblyCategory | AssemblyType } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  // Selected category for filtering types
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/assembly-categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  }, []);

  const fetchTypes = useCallback(async () => {
    try {
      const res = await fetch("/api/assembly-types");
      if (res.ok) {
        const data = await res.json();
        setTypes(data);
      }
    } catch (error) {
      console.error("Error fetching types:", error);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchCategories(), fetchTypes()]);
      setLoading(false);
    };
    init();
  }, [fetchCategories, fetchTypes]);

  // Category CRUD
  const openCreateCategory = () => {
    setEditingCategory(null);
    setCategoryForm({ name: "", description: "", order: categories.length });
    setCategoryDialogOpen(true);
  };

  const openEditCategory = (category: AssemblyCategory) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description || "",
      order: category.order,
    });
    setCategoryDialogOpen(true);
  };

  const saveCategory = async () => {
    try {
      const url = editingCategory 
        ? `/api/assembly-categories/${editingCategory.id}`
        : "/api/assembly-categories";
      const method = editingCategory ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(categoryForm),
      });

      if (res.ok) {
        setCategoryDialogOpen(false);
        fetchCategories();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to save category");
      }
    } catch (error) {
      console.error("Error saving category:", error);
    }
  };

  const deleteCategory = async (category: AssemblyCategory) => {
    try {
      const res = await fetch(`/api/assembly-categories/${category.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setDeleteTarget(null);
        fetchCategories();
      } else {
        const error = await res.json();
        setDeleteError(error.error || "Failed to delete category");
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      setDeleteError("Failed to delete category");
    }
  };

  // Type CRUD
  const openCreateType = (categoryId?: string) => {
    setEditingType(null);
    setTypeForm({
      name: "",
      description: "",
      categoryId: categoryId || selectedCategoryId || (categories[0]?.id ?? ""),
      order: types.filter(t => t.categoryId === (categoryId || selectedCategoryId)).length,
    });
    setTypeDialogOpen(true);
  };

  const openEditType = (type: AssemblyType) => {
    setEditingType(type);
    setTypeForm({
      name: type.name,
      description: type.description || "",
      categoryId: type.categoryId,
      order: type.order,
    });
    setTypeDialogOpen(true);
  };

  const saveType = async () => {
    try {
      const url = editingType 
        ? `/api/assembly-types/${editingType.id}`
        : "/api/assembly-types";
      const method = editingType ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(typeForm),
      });

      if (res.ok) {
        setTypeDialogOpen(false);
        fetchTypes();
        fetchCategories(); // Refresh counts
      } else {
        const error = await res.json();
        alert(error.error || "Failed to save type");
      }
    } catch (error) {
      console.error("Error saving type:", error);
    }
  };

  const deleteType = async (type: AssemblyType) => {
    try {
      const res = await fetch(`/api/assembly-types/${type.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setDeleteTarget(null);
        fetchTypes();
        fetchCategories(); // Refresh counts
      } else {
        const error = await res.json();
        setDeleteError(error.error || "Failed to delete type");
      }
    } catch (error) {
      console.error("Error deleting type:", error);
      setDeleteError("Failed to delete type");
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    if (deleteTarget.type === "category") {
      deleteCategory(deleteTarget.item as AssemblyCategory);
    } else {
      deleteType(deleteTarget.item as AssemblyType);
    }
  };

  // Handle category drag end
  const handleCategoryDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = categories.findIndex((c) => c.id === active.id);
      const newIndex = categories.findIndex((c) => c.id === over.id);

      const newCategories = arrayMove(categories, oldIndex, newIndex);
      setCategories(newCategories);

      // Persist the new order
      try {
        await fetch("/api/assembly-categories", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: newCategories.map((c, i) => ({ id: c.id, order: i })),
          }),
        });
      } catch (error) {
        console.error("Failed to save category order:", error);
        // Revert on error
        fetchCategories();
      }
    }
  };

  // Handle type drag end
  const handleTypeDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = filteredTypes.findIndex((t) => t.id === active.id);
      const newIndex = filteredTypes.findIndex((t) => t.id === over.id);

      const newFilteredTypes = arrayMove(filteredTypes, oldIndex, newIndex);
      
      // Update the full types array
      const otherTypes = types.filter(t => !filteredTypes.some(ft => ft.id === t.id));
      const newTypes = [...otherTypes, ...newFilteredTypes];
      setTypes(newTypes);

      // Persist the new order (only for the filtered types)
      try {
        await fetch("/api/assembly-types", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: newFilteredTypes.map((t, i) => ({ id: t.id, order: i })),
          }),
        });
      } catch (error) {
        console.error("Failed to save type order:", error);
        // Revert on error
        fetchTypes();
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const filteredTypes = selectedCategoryId 
    ? types.filter(t => t.categoryId === selectedCategoryId)
    : types;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Assembly Types</h3>
          <p className="text-sm text-muted-foreground">
            Manage assembly types. Groups are for visual organization in dropdowns.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { fetchCategories(); fetchTypes(); }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Groups Column */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <FolderTree className="h-4 w-4" />
                  Groups
                </CardTitle>
                <CardDescription>
                  {categories.length} groups for visual organization
                  {categories.length > 1 && (
                    <span className="ml-1">· drag to reorder</span>
                  )}
                </CardDescription>
              </div>
              <Button size="sm" onClick={openCreateCategory}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No groups yet. Create one to organize types.
              </p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleCategoryDragEnd}
              >
                <SortableContext
                  items={categories.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {categories.map((category) => (
                      <SortableCategoryItem
                        key={category.id}
                        category={category}
                        isSelected={selectedCategoryId === category.id}
                        onSelect={() => setSelectedCategoryId(
                          selectedCategoryId === category.id ? null : category.id
                        )}
                        onEdit={() => openEditCategory(category)}
                        onDelete={() => setDeleteTarget({ type: "category", item: category })}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </CardContent>
        </Card>

        {/* Types Column */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Types
                  {selectedCategoryId && (
                    <span className="text-xs font-normal text-muted-foreground">
                      (in {categories.find(c => c.id === selectedCategoryId)?.name})
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  {filteredTypes.length} types
                  {filteredTypes.length > 1 && (
                    <span className="ml-1">· drag to reorder</span>
                  )}
                </CardDescription>
              </div>
              <Button 
                size="sm" 
                onClick={() => openCreateType()}
                disabled={categories.length === 0}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Create a group first, then add types.
              </p>
            ) : filteredTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {selectedCategoryId 
                  ? "No types in this group. Add one to get started."
                  : "No types yet. Create one to get started."}
              </p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleTypeDragEnd}
              >
                <SortableContext
                  items={filteredTypes.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {filteredTypes.map((type) => (
                      <SortableTypeItem
                        key={type.id}
                        type={type}
                        onEdit={() => openEditType(type)}
                        onDelete={() => setDeleteTarget({ type: "type", item: type })}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Group Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Group" : "Create Group"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory 
                ? "Update group details. Groups organize types in dropdowns."
                : "Create a new group for visual organization of assembly types."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="cat-name">Name *</Label>
              <Input
                id="cat-name"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="e.g., Strand, Fiber, Underground"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cat-desc">Description</Label>
              <Input
                id="cat-desc"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Tip: Drag groups to reorder them after creation.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveCategory} disabled={!categoryForm.name.trim()}>
              {editingCategory ? "Save Changes" : "Create Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Type Dialog */}
      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingType ? "Edit Type" : "Create Type"}
            </DialogTitle>
            <DialogDescription>
              {editingType 
                ? "Update type details. This affects all assemblies using this type."
                : "Create a new assembly type within a group."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="type-cat">Group *</Label>
              <Select
                value={typeForm.categoryId}
                onValueChange={(value) => setTypeForm({ ...typeForm, categoryId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type-name">Name *</Label>
              <Input
                id="type-name"
                value={typeForm.name}
                onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                placeholder="e.g., Terminal Pole, Intermediate Pole"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type-desc">Description</Label>
              <Input
                id="type-desc"
                value={typeForm.description}
                onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Tip: Drag types to reorder them after creation.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTypeDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={saveType} 
              disabled={!typeForm.name.trim() || !typeForm.categoryId}
            >
              {editingType ? "Save Changes" : "Create Type"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={deleteTarget !== null} 
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteTarget?.type === "category" ? "Group" : "Type"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "category" 
                ? `Are you sure you want to delete the group "${(deleteTarget?.item as AssemblyCategory)?.name}"? Types in this group will need to be reassigned.`
                : `Are you sure you want to delete "${(deleteTarget?.item as AssemblyType)?.name}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {deleteError}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
