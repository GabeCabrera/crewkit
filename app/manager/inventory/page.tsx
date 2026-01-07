"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TablePageSkeleton, PageContent } from "@/components/layout/page-skeleton";
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
import { Plus, Minus } from "lucide-react";

interface InventoryItem {
  id: string;
  quantity: number;
  equipment: {
    id: string;
    name: string;
    sku: string;
    unitType: string;
  };
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState({
    quantity: "",
    type: "ADD",
    notes: "",
  });

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const response = await fetch("/api/inventory?all=true");
      const result = await response.json();
      // Handle paginated response format
      setInventory(result.data || result);
    } catch (error) {
      console.error("Error fetching inventory:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjust = (item: InventoryItem, type: "ADD" | "REMOVE") => {
    setSelectedItem(item);
    setFormData({
      quantity: "",
      type,
      notes: "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    try {
      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipmentId: selectedItem.equipment.id,
          quantity: parseInt(formData.quantity),
          type: formData.type,
          notes: formData.notes || null,
        }),
      });

      if (response.ok) {
        setDialogOpen(false);
        setSelectedItem(null);
        setFormData({
          quantity: "",
          type: "ADD",
          notes: "",
        });
        fetchInventory();
      }
    } catch (error) {
      console.error("Error updating inventory:", error);
    }
  };

  if (loading) {
    return <TablePageSkeleton />;
  }

  return (
    <PageContent>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Inventory Management</h1>
        <p className="text-muted-foreground">View and adjust inventory levels</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Inventory</CardTitle>
          <CardDescription>All equipment in inventory</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipment</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Unit Type</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!Array.isArray(inventory) || inventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No inventory items found.
                  </TableCell>
                </TableRow>
              ) : (
                inventory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.equipment.name}</TableCell>
                    <TableCell>{item.equipment.sku}</TableCell>
                    <TableCell>{item.equipment.unitType}</TableCell>
                    <TableCell className="font-semibold">{item.quantity}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAdjust(item, "ADD")}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAdjust(item, "REMOVE")}
                        >
                          <Minus className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {formData.type === "ADD" ? "Add" : "Remove"} Inventory
              </DialogTitle>
              <DialogDescription>
                {selectedItem?.equipment.name} ({selectedItem?.equipment.sku})
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                  min="1"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional notes about this adjustment"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Confirm</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      </div>
    </PageContent>
  );
}


