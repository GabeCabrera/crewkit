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
  Package,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
      const url = selectedCategoryId 
        ? `/api/assembly-types?categoryId=${selectedCategoryId}`
        : "/api/assembly-types";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTypes(data);
      }
    } catch (error) {
      console.error("Error fetching types:", error);
    }
  }, [selectedCategoryId]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchCategories(), fetchTypes()]);
      setLoading(false);
    };
    init();
  }, [fetchCategories, fetchTypes]);

  // Refresh types when category filter changes
  useEffect(() => {
    fetchTypes();
  }, [selectedCategoryId, fetchTypes]);

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
          <h3 className="text-lg font-semibold">Categories & Types</h3>
          <p className="text-sm text-muted-foreground">
            Organize assemblies into categories and types for easier field selection
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
        {/* Categories Column */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <FolderTree className="h-4 w-4" />
                  Categories
                </CardTitle>
                <CardDescription>{categories.length} categories</CardDescription>
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
                No categories yet. Create one to get started.
              </p>
            ) : (
              categories.map((category) => (
                <div
                  key={category.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer",
                    selectedCategoryId === category.id 
                      ? "bg-primary/5 border-primary/30" 
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => setSelectedCategoryId(
                    selectedCategoryId === category.id ? null : category.id
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ChevronRight className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      selectedCategoryId === category.id && "rotate-90"
                    )} />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{category.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {category._count.types} types · {category._count.assemblies} assemblies
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditCategory(category)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget({ type: "category", item: category })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
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
                <CardDescription>{filteredTypes.length} types</CardDescription>
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
                Create a category first, then add types.
              </p>
            ) : filteredTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {selectedCategoryId 
                  ? "No types in this category. Add one to get started."
                  : "No types yet. Create one to get started."}
              </p>
            ) : (
              filteredTypes.map((type) => (
                <div
                  key={type.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{type.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {type.category.name} · {type._count.assemblies} assemblies
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditType(type)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget({ type: "type", item: type })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Category" : "Create Category"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory 
                ? "Update category details. Changes will cascade to all assemblies."
                : "Create a new category for organizing assemblies."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="cat-name">Name *</Label>
              <Input
                id="cat-name"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="e.g., Fiber, Strand, Underground"
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
            <div className="grid gap-2">
              <Label htmlFor="cat-order">Display Order</Label>
              <Input
                id="cat-order"
                type="number"
                min="0"
                value={categoryForm.order}
                onChange={(e) => setCategoryForm({ ...categoryForm, order: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveCategory} disabled={!categoryForm.name.trim()}>
              {editingCategory ? "Save Changes" : "Create Category"}
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
                ? "Update type details. Changes will cascade to all assemblies."
                : "Create a new type within a category."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="type-cat">Category *</Label>
              <Select
                value={typeForm.categoryId}
                onValueChange={(value) => setTypeForm({ ...typeForm, categoryId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
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
            <div className="grid gap-2">
              <Label htmlFor="type-order">Display Order</Label>
              <Input
                id="type-order"
                type="number"
                min="0"
                value={typeForm.order}
                onChange={(e) => setTypeForm({ ...typeForm, order: parseInt(e.target.value) || 0 })}
              />
            </div>
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
              Delete {deleteTarget?.type === "category" ? "Category" : "Type"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "category" 
                ? `Are you sure you want to delete "${(deleteTarget?.item as AssemblyCategory)?.name}"? This action cannot be undone.`
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
