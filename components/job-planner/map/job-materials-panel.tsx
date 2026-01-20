"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  ChevronDown, 
  ChevronUp, 
  Package, 
  Cable, 
  Minus,
  RefreshCw,
  Download,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MaterialAllocation {
  id: string;
  quantity: number;
  unit: string;
  equipment: {
    id: string;
    name: string;
    sku: string;
    unitType: string;
  };
}

interface FiberSummary {
  [count: number]: number; // count -> total footage
}

interface JobMaterialsPanelProps {
  totalStrandFootage: number;
  fiberByCount: FiberSummary;
  allocations: MaterialAllocation[];
  nodeCount: number;
  routeCount: number;
  onRecalculate: () => Promise<void>;
  isCalculating?: boolean;
}

// Fiber count colors
const FIBER_COLORS: Record<number, string> = {
  12: "#10B981",
  24: "#3B82F6",
  48: "#8B5CF6",
  96: "#EC4899",
  144: "#F97316",
  288: "#EF4444",
};

export function JobMaterialsPanel({
  totalStrandFootage,
  fiberByCount,
  allocations,
  nodeCount,
  routeCount,
  onRecalculate,
  isCalculating = false,
}: JobMaterialsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  
  // Format footage
  const formatFootage = (footage: number) => {
    return footage.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };
  
  // Calculate total fiber footage
  const totalFiberFootage = Object.values(fiberByCount).reduce((sum, ft) => sum + ft, 0);
  
  // Group allocations by type
  const assemblyMaterials = allocations.filter(a => !a.equipment.sku.startsWith("FIBER-"));
  const fiberMaterials = allocations.filter(a => a.equipment.sku.startsWith("FIBER-"));
  
  // Export materials list
  const handleExport = () => {
    let csv = "Material,SKU,Quantity,Unit\n";
    
    // Add strand
    if (totalStrandFootage > 0) {
      csv += `Strand,STRAND,${formatFootage(totalStrandFootage)},ft\n`;
    }
    
    // Add fiber by count
    Object.entries(fiberByCount).forEach(([count, footage]) => {
      if (footage > 0) {
        csv += `Fiber ${count}-count,FIBER-${count},${formatFootage(footage)},ft\n`;
      }
    });
    
    // Add other materials
    assemblyMaterials.forEach(alloc => {
      csv += `"${alloc.equipment.name}",${alloc.equipment.sku},${alloc.quantity},${alloc.unit}\n`;
    });
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "materials-list.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-lg border overflow-hidden w-80">
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/50 border-b hover:bg-muted/70 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-sm">Job Materials</span>
          <span className="text-xs text-muted-foreground">
            ({nodeCount} nodes, {routeCount} routes)
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      
      {isExpanded && (
        <>
          {/* Summary Section */}
          <div className="p-3 space-y-3">
            {/* Strand Summary */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Minus className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <div className="text-sm font-medium">Strand</div>
                  <div className="text-xs text-muted-foreground">Total footage</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono font-medium">
                  {formatFootage(totalStrandFootage)}
                </div>
                <div className="text-xs text-muted-foreground">ft</div>
              </div>
            </div>
            
            {/* Fiber Summary */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                  <Cable className="w-4 h-4 text-violet-600" />
                </div>
                <div>
                  <div className="text-sm font-medium">Fiber</div>
                  <div className="text-xs text-muted-foreground">
                    {Object.keys(fiberByCount).length} types
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono font-medium">
                  {formatFootage(totalFiberFootage)}
                </div>
                <div className="text-xs text-muted-foreground">ft total</div>
              </div>
            </div>
            
            {/* Fiber by count breakdown */}
            {Object.entries(fiberByCount).length > 0 && (
              <div className="pl-10 space-y-1.5">
                {Object.entries(fiberByCount)
                  .sort(([a], [b]) => parseInt(a) - parseInt(b))
                  .map(([count, footage]) => (
                    <div key={count} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: FIBER_COLORS[parseInt(count)] || "#8B5CF6" }}
                        />
                        <span>{count}-count</span>
                      </div>
                      <span className="font-mono">{formatFootage(footage)} ft</span>
                    </div>
                  ))}
              </div>
            )}
            
            {/* Divider */}
            {assemblyMaterials.length > 0 && (
              <>
                <div className="border-t pt-3">
                  <button
                    className="flex items-center justify-between w-full text-sm"
                    onClick={() => setShowDetails(!showDetails)}
                  >
                    <span className="font-medium">Assembly Materials</span>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <span className="text-xs">{assemblyMaterials.length} items</span>
                      {showDetails ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </div>
                  </button>
                </div>
                
                {/* Materials Details */}
                {showDetails && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {assemblyMaterials.map((alloc) => (
                      <div 
                        key={alloc.id}
                        className="flex items-center justify-between text-xs px-2 py-1.5 bg-muted/30 rounded"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{alloc.equipment.name}</div>
                          <div className="text-muted-foreground">{alloc.equipment.sku}</div>
                        </div>
                        <div className="text-right font-mono">
                          {alloc.quantity} {alloc.unit.toLowerCase()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Footer Actions */}
          <div className="px-3 py-2 border-t bg-muted/30 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={onRecalculate}
              disabled={isCalculating}
            >
              {isCalculating ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              )}
              Recalculate
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={handleExport}
              disabled={isCalculating || (totalStrandFootage === 0 && allocations.length === 0)}
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Export CSV
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default JobMaterialsPanel;
