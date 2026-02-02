"use client";

import { useState, useMemo } from "react";
import {
  X,
  Cable,
  Milestone,
  Box,
  ChevronDown,
  ChevronUp,
  Check,
  AlertCircle,
  Zap,
  ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { SelectionBOM } from "../route-design-step";
import type { 
  DetectedAssembly, 
  AssemblyType 
} from "@/lib/assembly-detection";
import { 
  getAssemblyTypeCounts, 
  setAssemblyOverride,
  getEffectiveAssemblyType 
} from "@/lib/assembly-detection";
import {
  type JobBuildType,
  JOB_BUILD_TYPE_LABELS,
  filterAssembliesByBuildType,
  getFilteredAssemblyTypeCounts,
} from "@/lib/build-type-assemblies";

interface SelectionPreviewPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectionBOM: SelectionBOM;
  detectedAssemblies: DetectedAssembly[];
  jobBuildType: JobBuildType;
  onAssemblyOverride: (featureId: string, newType: AssemblyType) => void;
  onApplyToBOM: () => void;
  onClearSelection: () => void;
}

// Format number with commas
function formatNumber(num: number): string {
  return Math.round(num).toLocaleString();
}

// Available assembly types for override dropdown
const ASSEMBLY_TYPE_OPTIONS: AssemblyType[] = [
  // Strand
  "strand.terminal",
  "strand.tangent",
  "strand.corner",
  "strand.junction",
  // Fiber
  "fiber.terminal",
  "fiber.tangent",
  "fiber.corner",
  "fiber.junction",
  "fiber.splice",
  "fiber.slack",
  // Underground
  "underground.riser",
  "underground.vault",
  "underground.handhole",
  // Service
  "service.mst",
  "service.mst2",
  "service.mst6",
  "service.mst8",
  "service.pedestal",
  // Hardware
  "hardware.anchor",
  "hardware.crossing",
];

// Get display name for assembly type slug
function getAssemblyDisplayName(slug: AssemblyType): string {
  const names: Record<AssemblyType, string> = {
    "strand.terminal": "Terminal Pole",
    "strand.tangent": "Tangent Pole",
    "strand.corner": "Corner Pole",
    "strand.junction": "Junction Pole",
    "fiber.terminal": "Fiber Terminal",
    "fiber.tangent": "Fiber Tangent",
    "fiber.corner": "Fiber Corner",
    "fiber.junction": "Fiber Junction",
    "fiber.splice": "Splice Case",
    "fiber.slack": "Slack Loop",
    "underground.vault": "Vault",
    "underground.handhole": "Handhole",
    "underground.riser": "Riser",
    "service.mst": "MST",
    "service.mst2": "MST 2-Port",
    "service.mst6": "MST 6-Port",
    "service.mst8": "MST 8-Port",
    "service.pedestal": "Pedestal",
    "hardware.anchor": "Guy/Anchor",
    "hardware.crossing": "Crossing",
    "unknown": "Unknown",
  };
  return names[slug] || slug;
}

// Get icon for assembly type
function getAssemblyIcon(type: AssemblyType) {
  if (type.startsWith("strand.")) return Milestone;
  if (type.startsWith("fiber.")) {
    if (type === "fiber.splice") return Zap;
    return Milestone;
  }
  if (type === "underground.riser") return ArrowDown;
  if (type.startsWith("service.")) return Box;
  return Box;
}

export function SelectionPreviewPanel({
  isOpen,
  onClose,
  selectionBOM,
  detectedAssemblies,
  jobBuildType,
  onAssemblyOverride,
  onApplyToBOM,
  onClearSelection,
}: SelectionPreviewPanelProps) {
  const [showDetails, setShowDetails] = useState(false);
  
  // Filter assemblies by build type
  const filteredAssemblies = useMemo(() => 
    filterAssembliesByBuildType(detectedAssemblies, jobBuildType),
    [detectedAssemblies, jobBuildType]
  );
  
  // Calculate counts for filtered assemblies only
  const assemblyCounts = useMemo(() => 
    getFilteredAssemblyTypeCounts(detectedAssemblies, jobBuildType),
    [detectedAssemblies, jobBuildType]
  );
  
  // Count excluded assemblies
  const excludedCount = detectedAssemblies.length - filteredAssemblies.length;
  
  // Group assemblies by type for display
  const assemblyGroups = useMemo(() => {
    const groups: Record<AssemblyType, DetectedAssembly[]> = {} as Record<AssemblyType, DetectedAssembly[]>;
    for (const assembly of filteredAssemblies) {
      const type = getEffectiveAssemblyType(assembly);
      if (!groups[type]) groups[type] = [];
      groups[type].push(assembly);
    }
    return groups;
  }, [filteredAssemblies]);
  
  // Count overrides (from filtered assemblies only)
  const overrideCount = filteredAssemblies.filter(a => a.userOverride).length;

  if (!isOpen) return null;

  const totalFootage = selectionBOM.aerialFootage + selectionBOM.undergroundFootage + selectionBOM.slackFootage;

  return (
    <div className="absolute top-0 right-0 bottom-0 w-96 bg-white border-l border-slate-200 shadow-xl z-30 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
        <div>
          <h3 className="font-semibold text-slate-900">Selection Summary</h3>
          <p className="text-xs text-slate-500">
            {filteredAssemblies.length} of {detectedAssemblies.length} assemblies for {JOB_BUILD_TYPE_LABELS[jobBuildType]}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Build Type Filter Notice */}
      {excludedCount > 0 && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-100">
          <p className="text-xs text-amber-700">
            {excludedCount} assembly type{excludedCount !== 1 ? "s" : ""} excluded for {JOB_BUILD_TYPE_LABELS[jobBuildType]} build
          </p>
        </div>
      )}

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Footage Summary */}
        <div className="space-y-3">
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Footage (Calculated from Geometry)
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Aerial includes 2% sag/tension allowance
            </p>
          </div>
          
          <div className="space-y-2">
            {/* Aerial */}
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Cable className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-slate-700">Aerial (+2% sag)</span>
              </div>
              <span className="text-sm font-bold text-blue-700">
                {formatNumber(selectionBOM.aerialFootage)} ft
              </span>
            </div>
            
            {/* Underground */}
            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Box className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-slate-700">Underground</span>
              </div>
              <span className="text-sm font-bold text-amber-700">
                {formatNumber(selectionBOM.undergroundFootage)} ft
              </span>
            </div>
            
            {/* Slack */}
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-slate-700">
                  Slack ({selectionBOM.aerialSpliceCount + selectionBOM.undergroundSpliceCount} splices × 100′)
                </span>
              </div>
              <span className="text-sm font-bold text-purple-700">
                {formatNumber(selectionBOM.slackFootage)} ft
              </span>
            </div>
            
            {/* Total */}
            <div className="flex items-center justify-between p-3 bg-slate-100 rounded-lg border-2 border-slate-300">
              <span className="text-sm font-semibold text-slate-700">Total</span>
              <span className="text-lg font-bold text-slate-900">
                {formatNumber(totalFootage)} ft
              </span>
            </div>
          </div>
        </div>

        {/* Assembly Detection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Assemblies Detected
            </h4>
            {overrideCount > 0 && (
              <span className="text-xs text-amber-600 font-medium">
                {overrideCount} override{overrideCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
          
          <div className="space-y-2">
            {/* Poles Summary */}
            {(assemblyCounts["strand.terminal"] > 0 || 
              assemblyCounts["strand.tangent"] > 0 || 
              assemblyCounts["strand.corner"] > 0 || 
              assemblyCounts["strand.junction"] > 0) && (
              <div className="p-3 bg-slate-50 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <Milestone className="h-4 w-4 text-slate-600" />
                  <span className="text-sm font-medium text-slate-700">
                    Poles ({selectionBOM.poleCount})
                  </span>
                </div>
                <div className="pl-6 space-y-1">
                  {assemblyCounts["strand.terminal"] > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Terminal</span>
                      <span className="font-medium text-slate-800">{assemblyCounts["strand.terminal"]}</span>
                    </div>
                  )}
                  {assemblyCounts["strand.tangent"] > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Tangent</span>
                      <span className="font-medium text-slate-800">{assemblyCounts["strand.tangent"]}</span>
                    </div>
                  )}
                  {assemblyCounts["strand.corner"] > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Corner</span>
                      <span className="font-medium text-slate-800">{assemblyCounts["strand.corner"]}</span>
                    </div>
                  )}
                  {assemblyCounts["strand.junction"] > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Junction</span>
                      <span className="font-medium text-slate-800">{assemblyCounts["strand.junction"]}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Other Infrastructure */}
            {Object.entries(assemblyCounts)
              .filter(([type, count]) => count > 0 && !type.startsWith("strand."))
              .map(([type, count]) => (
                <div key={type} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const Icon = getAssemblyIcon(type as AssemblyType);
                      return <Icon className="h-4 w-4 text-slate-600" />;
                    })()}
                    <span className="text-sm font-medium text-slate-700">{type}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-800">{count}</span>
                </div>
              ))}
          </div>
          
          {/* View Details Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-slate-600 hover:text-slate-900"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Hide Details
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                View Details & Override
              </>
            )}
          </Button>
        </div>

        {/* Detailed List with Override */}
        {showDetails && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Individual Features ({filteredAssemblies.length})
            </h4>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredAssemblies.map((assembly) => (
                <div
                  key={assembly.featureId}
                  className={cn(
                    "p-2 rounded-lg border",
                    assembly.userOverride 
                      ? "bg-amber-50 border-amber-200" 
                      : "bg-white border-slate-200"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">
                        {assembly.label || `${assembly.featureType} #${assembly.featureId.slice(-6)}`}
                      </p>
                      <div className="flex items-center gap-1">
                        {assembly.confidence !== "high" && (
                          <AlertCircle className="h-3 w-3 text-amber-500" />
                        )}
                        <span className="text-xs text-slate-500 capitalize">
                          {assembly.confidence} confidence
                        </span>
                      </div>
                    </div>
                    
                    <Select
                      value={getEffectiveAssemblyType(assembly)}
                      onValueChange={(value) => onAssemblyOverride(assembly.featureId, value as AssemblyType)}
                    >
                      <SelectTrigger className="w-36 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSEMBLY_TYPE_OPTIONS.map((type) => (
                          <SelectItem key={type} value={type} className="text-xs">
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="border-t border-slate-200 p-4 space-y-2 bg-slate-50">
        <Button
          onClick={onApplyToBOM}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          <Check className="h-4 w-4 mr-2" />
          Apply to Job BOM
        </Button>
        <Button
          variant="outline"
          onClick={onClearSelection}
          className="w-full"
        >
          Clear Selection
        </Button>
      </div>
    </div>
  );
}

export default SelectionPreviewPanel;
