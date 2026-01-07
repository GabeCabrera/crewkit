"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
  Send,
  Layers,
  Package,
  X,
  Clock,
  CheckCircle,
  XCircle,
  FileEdit,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { AssemblyCard, AssemblyCardData, AssemblyCardSkeleton } from "@/components/assembly/assembly-card";
import { EquipmentCombobox } from "@/components/assembly/equipment-combobox";

interface Equipment {
  id: string;
  name: string;
  sku: string;
  pricePerUnit: number;
  unitType: string;
  photoUrl?: string | null;
  inventory?: { quantity: number } | null;
}

interface ItemInput {
  equipmentId: string;
  quantity: number;
}

const statusColors = {
  DRAFT: "bg-gray-100 text-gray-700 border-gray-200",
  PENDING_APPROVAL: "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
};

const statusIcons = {
  DRAFT: FileEdit,
  PENDING_APPROVAL: Clock,
  APPROVED: CheckCircle,
  REJECTED: XCircle,
};

export default function ManagerAssembliesPage() {
  const [assemblies, setAssemblies] = useState<AssemblyCardData[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AssemblyCardData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("my-assemblies");
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [items, setItems] = useState<ItemInput[]>([{ equipmentId: "", quantity: 1 }]);

  const fetchData = async () => {
    try {
      const [assembliesRes, equipmentRes] = await Promise.all([
        fetch("/api/assemblies?all=true"),
        fetch("/api/equipment?all=true"),
      ]);
      
      const assembliesData = await assembliesRes.json();
      const equipmentData = await equipmentRes.json();
      
      if (Array.isArray(assembliesData)) {
        setAssemblies(assembliesData);
      }
      if (Array.isArray(equipmentData)) {
        setEquipment(equipmentData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setEditing(null);
    setFormData({ name: "", description: "" });
    setItems([{ equipmentId: "", quantity: 1 }]);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    setDialogOpen(open);
  };

  const handleEdit = (assembly: AssemblyCardData) => {
    setEditing(assembly);
    setFormData({
      name: assembly.name,
      description: assembly.description || "",
    });
    setItems(
      assembly.items.map(item => ({
        equipmentId: item.equipmentId,
        quantity: item.quantity,
      }))
    );
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this assembly?")) return;

    try {
      const response = await fetch(`/api/assemblies/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Error deleting assembly:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent, asDraft: boolean = false) => {
    e.preventDefault();
    
    const validItems = items.filter(item => item.equipmentId && item.quantity > 0);
    if (validItems.length === 0) {
      alert("Please add at least one equipment item");
      return;
    }

    setSubmitting(true);

    try {
      const url = editing ? `/api/assemblies/${editing.id}` : "/api/assemblies";
      const method = editing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          status: asDraft ? "DRAFT" : "PENDING_APPROVAL",
          items: validItems,
        }),
      });

      if (response.ok) {
        handleOpenChange(false);
        fetchData();
      }
    } catch (error) {
      console.error("Error saving assembly:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitForApproval = async (assembly: AssemblyCardData) => {
    try {
      const response = await fetch(`/api/assemblies/${assembly.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PENDING_APPROVAL" }),
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Error submitting assembly:", error);
    }
  };

  const addItem = () => {
    setItems([...items, { equipmentId: "", quantity: 1 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof ItemInput, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  // Filter assemblies by current user (in a real app, compare with session user)
  const myAssemblies = assemblies.filter(a => 
    a.status === "DRAFT" || a.status === "PENDING_APPROVAL" || a.status === "REJECTED"
  );
  const approvedAssemblies = assemblies.filter(a => a.status === "APPROVED");

  // Stats
  const draftCount = assemblies.filter(a => a.status === "DRAFT").length;
  const pendingCount = assemblies.filter(a => a.status === "PENDING_APPROVAL").length;
  const approvedCount = assemblies.filter(a => a.status === "APPROVED").length;
  const rejectedCount = assemblies.filter(a => a.status === "REJECTED").length;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Assemblies" 
        description="Create and manage equipment assemblies"
        action={
          <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Assembly
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={(e) => handleSubmit(e, false)}>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5" />
                    {editing ? "Edit Assembly" : "Create Assembly"}
                  </DialogTitle>
                  <DialogDescription>
                    {editing 
                      ? "Update your assembly details and equipment"
                      : "Create a new assembly and submit for approval"
                    }
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
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
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Equipment Items *</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addItem}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Item
                      </Button>
                    </div>
                    
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                      {items.map((item, index) => {
                        return (
                          <div key={index} className="flex gap-2 items-start">
                            <div className="flex-1">
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
                              className="w-20"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(index)}
                              disabled={items.length === 1}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Cost preview */}
                    {items.some(i => i.equipmentId) && (
                      <div className="bg-muted/50 rounded-lg p-3 mt-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Estimated cost</span>
                          <span className="font-semibold">
                            {formatCurrency(
                              items.reduce((total, item) => {
                                const eq = equipment.find(e => e.id === item.equipmentId);
                                return total + (eq ? eq.pricePerUnit * item.quantity : 0);
                              }, 0)
                            )}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => handleOpenChange(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="button" 
                    variant="secondary"
                    onClick={(e) => handleSubmit(e, true)}
                    disabled={submitting}
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save as Draft"}
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Submit for Approval
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Status Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                <FileEdit className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{draftCount}</p>
                <p className="text-sm text-muted-foreground">Drafts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{approvedCount}</p>
                <p className="text-sm text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rejectedCount}</p>
                <p className="text-sm text-muted-foreground">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="my-assemblies">My Assemblies</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
        </TabsList>

        <TabsContent value="my-assemblies" className="space-y-4">
          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <AssemblyCardSkeleton key={i} />
              ))}
            </div>
          ) : myAssemblies.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto mb-4">
                  <Layers className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No assemblies yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first assembly to get started
                </p>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Assembly
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {myAssemblies.map((assembly) => {
                const StatusIcon = statusIcons[assembly.status];
                
                return (
                  <Card key={assembly.id} className="border-0 shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Layers className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{assembly.name}</CardTitle>
                            {assembly.description && (
                              <CardDescription className="line-clamp-1">
                                {assembly.description}
                              </CardDescription>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className={statusColors[assembly.status]}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {assembly.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Package className="h-4 w-4" />
                          {assembly.items.length} items
                        </span>
                        <span>
                          {formatCurrency(
                            assembly.items.reduce((t, i) => t + i.equipment.pricePerUnit * i.quantity, 0)
                          )}
                        </span>
                      </div>
                      
                      <div className="flex gap-2">
                        {assembly.status === "DRAFT" && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => handleEdit(assembly)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              size="sm" 
                              className="flex-1"
                              onClick={() => handleSubmitForApproval(assembly)}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Submit
                            </Button>
                          </>
                        )}
                        {assembly.status === "REJECTED" && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => handleEdit(assembly)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Revise
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(assembly.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {assembly.status === "PENDING_APPROVAL" && (
                          <Button variant="outline" size="sm" className="flex-1" disabled>
                            <Clock className="h-4 w-4 mr-1" />
                            Awaiting Review
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <AssemblyCardSkeleton key={i} />
              ))}
            </div>
          ) : approvedAssemblies.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No approved assemblies</h3>
                <p className="text-muted-foreground">
                  Approved assemblies will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {approvedAssemblies.map((assembly) => (
                <AssemblyCard
                  key={assembly.id}
                  assembly={assembly}
                  onView={(a) => {
                    // Could open a detail dialog
                  }}
                  showCreatedBy
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
