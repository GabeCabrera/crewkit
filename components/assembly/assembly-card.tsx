"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  DollarSign, 
  ChevronDown, 
  ChevronUp,
  PlayCircle,
  Eye,
  Layers,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { useState } from "react";

export interface AssemblyCardItem {
  id: string;
  equipmentId: string;
  quantity: number;
  equipment: {
    id: string;
    name: string;
    sku: string;
    unitType: string;
    pricePerUnit: number;
    photoUrl?: string | null;
    inventory?: { quantity: number } | null;
  };
}

export interface AssemblyCardData {
  id: string;
  name: string;
  description: string | null;
  status: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  items: AssemblyCardItem[];
  createdBy?: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface AssemblyCardProps {
  assembly: AssemblyCardData;
  onUse?: (assembly: AssemblyCardData) => void;
  onView?: (assembly: AssemblyCardData) => void;
  showCreatedBy?: boolean;
  variant?: "compact" | "expanded";
  selected?: boolean;
}

const statusColors = {
  DRAFT: "bg-gray-100 text-gray-700 border-gray-200",
  PENDING_APPROVAL: "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
};

const statusLabels = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export function AssemblyCard({
  assembly,
  onUse,
  onView,
  showCreatedBy = false,
  variant = "compact",
  selected = false,
}: AssemblyCardProps) {
  const [isExpanded, setIsExpanded] = useState(variant === "expanded");

  // Calculate total cost
  const totalCost = assembly.items.reduce((total, item) => {
    return total + (item.equipment.pricePerUnit * item.quantity);
  }, 0);

  // Check if assembly can be used (stock check removed for field users)
  const canUse = assembly.status === "APPROVED" && onUse;

  return (
    <Card 
      className={cn(
        "border-0 shadow-sm transition-all duration-200 hover:shadow-md",
        selected && "ring-2 ring-primary shadow-md"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Layers className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg truncate">{assembly.name}</CardTitle>
                {showCreatedBy && assembly.createdBy && (
                  <p className="text-xs text-muted-foreground">
                    by {assembly.createdBy.name || assembly.createdBy.email}
                  </p>
                )}
              </div>
            </div>
            {assembly.description && (
              <CardDescription className="line-clamp-2 mt-2">
                {assembly.description}
              </CardDescription>
            )}
          </div>
          <Badge 
            variant="outline" 
            className={cn("shrink-0", statusColors[assembly.status])}
          >
            {statusLabels[assembly.status]}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats Row */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Package className="h-4 w-4" />
            <span>{assembly.items.length} items</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            <span>{formatCurrency(totalCost)}</span>
          </div>
        </div>

        {/* Expandable Items List */}
        <div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Hide equipment
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Show equipment
              </>
            )}
          </button>
          
          {isExpanded && (
            <div className="mt-3 space-y-2">
              {assembly.items.map((item) => {
                const available = item.equipment.inventory?.quantity || 0;
                
                return (
                  <div 
                    key={item.id} 
                    className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm"
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
                      <div>
                        <p className="font-medium">{item.equipment.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.equipment.sku}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">×{item.quantity}</p>
                      <p className="text-xs text-muted-foreground">
                        {available} avail
                      </p>
                    </div>
                  </div>
                );
              })}
              
              {/* Total */}
              <div className="flex justify-between pt-2 border-t mt-2 text-sm">
                <span className="text-muted-foreground">Est. cost</span>
                <span className="font-semibold">{formatCurrency(totalCost)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {onView && (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => onView(assembly)}
            >
              <Eye className="mr-2 h-4 w-4" />
              View
            </Button>
          )}
          {onUse && (
            <Button 
              size="sm" 
              className="flex-1"
              onClick={() => onUse(assembly)}
              disabled={!canUse}
            >
              <PlayCircle className="mr-2 h-4 w-4" />
              Use Assembly
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Loading skeleton for the card
export function AssemblyCardSkeleton() {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />
            <div className="space-y-2">
              <div className="h-5 w-32 bg-muted rounded animate-pulse" />
              <div className="h-3 w-24 bg-muted rounded animate-pulse" />
            </div>
          </div>
          <div className="h-5 w-16 bg-muted rounded-full animate-pulse" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <div className="h-4 w-20 bg-muted rounded animate-pulse" />
          <div className="h-4 w-16 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-9 w-full bg-muted rounded animate-pulse" />
      </CardContent>
    </Card>
  );
}
