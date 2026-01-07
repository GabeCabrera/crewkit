"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Minus, 
  Plus, 
  Package, 
  Check, 
  Loader2,
  X,
  AlertTriangle,
  Layers,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import type { AssemblyCardData, AssemblyCardItem } from "./assembly-card";
import { EquipmentCombobox } from "./equipment-combobox";

interface ExtraEquipment {
  id: string;
  name: string;
  sku: string;
  pricePerUnit: number;
  photoUrl?: string | null;
  inventory?: { quantity: number } | null;
}

interface Modifier {
  equipmentId: string;
  quantity: number;
}

interface AssemblyUsageDialogProps {
  assembly: AssemblyCardData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (assemblyId: string, quantity: number, modifiers: Modifier[]) => Promise<void>;
  availableEquipment?: ExtraEquipment[];
}

export function AssemblyUsageDialog({
  assembly,
  open,
  onOpenChange,
  onConfirm,
  availableEquipment = [],
}: AssemblyUsageDialogProps) {
  const [quantity, setQuantity] = useState(1);
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setQuantity(1);
    setModifiers([]);
    setError(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async () => {
    if (!assembly) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const validModifiers = modifiers.filter(m => m.equipmentId && m.quantity > 0);
      await onConfirm(assembly.id, quantity, validModifiers);
      handleOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Failed to log usage");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addModifier = () => {
    setModifiers([...modifiers, { equipmentId: "", quantity: 1 }]);
  };

  const removeModifier = (index: number) => {
    setModifiers(modifiers.filter((_, i) => i !== index));
  };

  const updateModifier = (index: number, field: keyof Modifier, value: string | number) => {
    const newModifiers = [...modifiers];
    newModifiers[index] = { ...newModifiers[index], [field]: value };
    setModifiers(newModifiers);
  };

  if (!assembly) return null;

  // Calculate total cost
  const assemblyCost = assembly.items.reduce((total, item) => {
    return total + (item.equipment.pricePerUnit * item.quantity);
  }, 0);

  const modifiersCost = modifiers.reduce((total, mod) => {
    const eq = availableEquipment.find(e => e.id === mod.equipmentId);
    return total + (eq ? eq.pricePerUnit * mod.quantity : 0);
  }, 0);

  const totalCost = (assemblyCost * quantity) + modifiersCost;

  // Filter out equipment already in assembly or already added as modifier
  const usedEquipmentIds = new Set([
    ...assembly.items.map(i => i.equipmentId),
    ...modifiers.map(m => m.equipmentId).filter(Boolean),
  ]);
  const availableForModifiers = availableEquipment.filter(
    eq => !usedEquipmentIds.has(eq.id) && (eq.inventory?.quantity || 0) > 0
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            Log Assembly Usage
          </DialogTitle>
          <DialogDescription>
            Record usage of <strong>{assembly.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Quantity Selector */}
          <div className="space-y-2">
            <Label>How many assemblies?</Label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 text-center text-lg font-semibold"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Assembly Contents Preview */}
          <div className="space-y-2">
            <Label>Equipment to be used:</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
              {assembly.items.map((item) => {
                const totalNeeded = item.quantity * quantity;
                const available = item.equipment.inventory?.quantity || 0;
                const isInsufficient = available < totalNeeded;

                return (
                  <div 
                    key={item.id}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg text-sm",
                      isInsufficient ? "bg-red-50 border border-red-200" : "bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {item.equipment.photoUrl ? (
                        <img 
                          src={item.equipment.photoUrl} 
                          alt={item.equipment.name}
                          className="h-8 w-8 rounded object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <span className="font-medium">{item.equipment.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "font-medium",
                        isInsufficient && "text-red-600"
                      )}>
                        ×{totalNeeded}
                      </span>
                      {isInsufficient && (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Extra Equipment (Modifiers) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Extra equipment (optional)</Label>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={addModifier}
                disabled={availableForModifiers.length === 0}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            
            {modifiers.length > 0 && (
              <div className="space-y-2">
                {modifiers.map((mod, index) => {
                  return (
                    <div key={index} className="flex gap-2 items-start">
                      <div className="flex-1">
                        <EquipmentCombobox
                          equipment={availableForModifiers}
                          value={mod.equipmentId}
                          onValueChange={(value) => updateModifier(index, "equipmentId", value)}
                          placeholder="Search equipment..."
                        />
                      </div>
                      <Input
                        type="number"
                        min="1"
                        value={mod.quantity}
                        onChange={(e) => updateModifier(index, "quantity", parseInt(e.target.value) || 1)}
                        className="w-20"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeModifier(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
            
            {modifiers.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Add extra equipment not in the assembly
              </p>
            )}
          </div>

          {/* Cost Summary */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Assembly ({quantity}×)
              </span>
              <span>{formatCurrency(assemblyCost * quantity)}</span>
            </div>
            {modifiersCost > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Extra equipment</span>
                <span>{formatCurrency(modifiersCost)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-lg pt-2 border-t">
              <span>Total</span>
              <span>{formatCurrency(totalCost)}</span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logging...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Confirm Usage
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

