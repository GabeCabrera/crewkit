"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Cable,
  Package,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Map as MapIcon,
  Loader2,
  Trash2,
  ChevronRight,
  Settings2,
  FileText,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobPlanData } from "../../job-lifecycle-view";
import { JobSheet } from "./job-sheet";

interface MaterialsStepProps {
  job: JobPlanData;
  updateJob: (updates: Partial<JobPlanData>) => void;
  refreshJob?: () => Promise<void>;
  canEdit: boolean;
}

// Format number with commas
function formatNumber(num: number): string {
  return Math.round(num).toLocaleString();
}

// Get infrastructure counts from assemblies - returns count and optional tail footage
interface InfraCount {
  count: number;
  tailFootage?: number;
}

function getInfraCounts(assemblies: JobPlanData["requiredAssemblies"]): Record<string, InfraCount> {
  const counts: Record<string, InfraCount> = {};
  
  for (const assembly of assemblies || []) {
    const type = assembly.assemblyType.toLowerCase();
    
    if (type.includes("pole")) {
      counts["Poles"] = counts["Poles"] || { count: 0 };
      counts["Poles"].count += assembly.quantity;
    } else if (type === "mst 2-port") {
      counts["MST 2-Port"] = counts["MST 2-Port"] || { count: 0, tailFootage: 0 };
      counts["MST 2-Port"].count += assembly.quantity;
    } else if (type === "mst 6-port") {
      counts["MST 6-Port"] = counts["MST 6-Port"] || { count: 0, tailFootage: 0 };
      counts["MST 6-Port"].count += assembly.quantity;
    } else if (type.includes("mst")) {
      // Generic MST (unknown port count)
      counts["MST"] = counts["MST"] || { count: 0, tailFootage: 0 };
      counts["MST"].count += assembly.quantity;
    } else if (type.includes("splice")) {
      counts["Splices"] = counts["Splices"] || { count: 0 };
      counts["Splices"].count += assembly.quantity;
    } else if (type.includes("riser")) {
      counts["Risers"] = counts["Risers"] || { count: 0 };
      counts["Risers"].count += assembly.quantity;
    } else if (type.includes("anchor") || type.includes("guy")) {
      counts["Anchors"] = counts["Anchors"] || { count: 0 };
      counts["Anchors"].count += assembly.quantity;
    }
  }
  
  return counts;
}

// Aggregate equipment totals across all assemblies
function getEquipmentTotals(assemblies: JobPlanData["requiredAssemblies"]) {
  const totals = new Map<string, { name: string; sku: string; total: number }>();
  
  for (const assemblyRecord of assemblies || []) {
    if (!assemblyRecord.assembly?.items) continue;
    
    for (const item of assemblyRecord.assembly.items) {
      const key = item.equipment.id;
      const quantity = item.quantity * assemblyRecord.quantity;
      const existing = totals.get(key);
      
      if (existing) {
        existing.total += quantity;
      } else {
        totals.set(key, {
          name: item.equipment.name,
          sku: item.equipment.sku,
          total: quantity,
        });
      }
    }
  }
  
  return Array.from(totals.values()).sort((a, b) => b.total - a.total);
}

type ViewMode = "dashboard" | "jobsheet";

export function MaterialsStep({ job, updateJob, refreshJob, canEdit }: MaterialsStepProps) {
  const [showOverrides, setShowOverrides] = useState(false);
  const [showEquipment, setShowEquipment] = useState(false);
  const [isClearingAssemblies, setIsClearingAssemblies] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("jobsheet");

  // Calculate totals
  const totalCable = job.aerialFootage + job.undergroundFootage + job.slackLoopFootage;
  const hasData = totalCable > 0 || (job.requiredAssemblies && job.requiredAssemblies.length > 0);
  
  // Get infrastructure counts
  const infraCounts = useMemo(() => 
    getInfraCounts(job.requiredAssemblies),
    [job.requiredAssemblies]
  );
  
  // Get equipment totals
  const equipmentTotals = useMemo(() => 
    getEquipmentTotals(job.requiredAssemblies),
    [job.requiredAssemblies]
  );

  // Assembly stats
  const assemblyStats = useMemo(() => {
    const total = job.requiredAssemblies?.length || 0;
    const linked = job.requiredAssemblies?.filter(a => a.assembly).length || 0;
    const totalQty = job.requiredAssemblies?.reduce((sum, a) => sum + a.quantity, 0) || 0;
    return { total, linked, unlinked: total - linked, totalQty };
  }, [job.requiredAssemblies]);

  // Handle clearing assemblies
  const handleClearAssemblies = useCallback(async () => {
    if (!confirm("Clear all required assemblies?")) return;
    setIsClearingAssemblies(true);
    try {
      const response = await fetch(`/api/job-plans/${job.id}/assemblies`, { method: "DELETE" });
      if (response.ok && refreshJob) await refreshJob();
    } catch (error) {
      console.error("Error clearing assemblies:", error);
    } finally {
      setIsClearingAssemblies(false);
    }
  }, [job.id, refreshJob]);

  // Empty state
  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12">
        <div className="h-14 w-14 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
          <Package className="h-7 w-7 text-slate-400" />
        </div>
        <h3 className="text-base font-semibold text-slate-700 mb-1">No materials applied</h3>
        <p className="text-sm text-slate-500 text-center max-w-xs mb-4">
          Select features in Route Design and apply to BOM
        </p>
        <Button variant="outline" size="sm" className="gap-2">
          <MapIcon className="h-4 w-4" />
          Go to Route Design
        </Button>
      </div>
    );
  }

  // View toggle component to avoid TypeScript narrowing issues
  const ViewToggle = ({ activeView, className }: { activeView: ViewMode; className?: string }) => (
    <div className={cn("flex items-center gap-1 print:hidden", className)}>
      <button
        onClick={() => setViewMode("dashboard")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
          activeView === "dashboard"
            ? "bg-slate-100 text-slate-900"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
        )}
      >
        <LayoutDashboard className="h-4 w-4" />
        Dashboard
      </button>
      <button
        onClick={() => setViewMode("jobsheet")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
          activeView === "jobsheet"
            ? "bg-slate-100 text-slate-900"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
        )}
      >
        <FileText className="h-4 w-4" />
        Job Sheet
      </button>
    </div>
  );

  // Job Sheet view (printable)
  if (viewMode === "jobsheet") {
    return (
      <div className="flex flex-col">
        <ViewToggle activeView={viewMode} className="mb-4" />
        <JobSheet job={job} />
      </div>
    );
  }

  // Dashboard view (original)
  return (
    <div className="space-y-4">
      <ViewToggle activeView={viewMode} className="-mt-2 mb-4" />
      
      {/* ============================================ */}
      {/* HERO: CABLE SUMMARY - Compact horizontal */}
      {/* ============================================ */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Cable className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-600">Cable Requirements</span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-slate-800">{formatNumber(totalCable)}</span>
            <span className="text-sm text-slate-500 ml-1">ft</span>
          </div>
        </div>
        
        {/* Compact metric row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5 text-center">
            <p className="text-lg font-bold text-blue-700">{formatNumber(job.aerialFootage)}</p>
            <p className="text-[10px] text-blue-600 uppercase tracking-wide">Aerial</p>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5 text-center">
            <p className="text-lg font-bold text-amber-700">{formatNumber(job.undergroundFootage)}</p>
            <p className="text-[10px] text-amber-600 uppercase tracking-wide">Underground</p>
          </div>
          <div className="bg-purple-50 border border-purple-100 rounded-lg p-2.5 text-center">
            <p className="text-lg font-bold text-purple-700">{formatNumber(job.slackLoopFootage)}</p>
            <p className="text-[10px] text-purple-600 uppercase tracking-wide">Slack</p>
          </div>
        </div>

        {/* Strand/Fiber footer */}
        <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-slate-100 text-xs">
          <span className="text-slate-500">
            Strand: <span className="text-slate-700 font-medium">{formatNumber(job.strandFootage)}</span>
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500">
            Fiber: <span className="text-slate-700 font-medium">{formatNumber(job.fiberFootage)}</span>
          </span>
        </div>
      </div>

      {/* ============================================ */}
      {/* INFRASTRUCTURE - Inline pill badges */}
      {/* ============================================ */}
      {Object.keys(infraCounts).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(infraCounts).map(([label, data]) => (
            <div
              key={label}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs",
                label.includes("MST") ? "bg-teal-50 border border-teal-100" : "bg-slate-100"
              )}
            >
              <span className={cn(
                "font-bold",
                label.includes("MST") ? "text-teal-800" : "text-slate-800"
              )}>
                {data.count}
              </span>
              <span className={cn(
                label.includes("MST") ? "text-teal-600" : "text-slate-600"
              )}>
                {label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ============================================ */}
      {/* ASSEMBLIES - Compact grid */}
      {/* ============================================ */}
      {job.requiredAssemblies && job.requiredAssemblies.length > 0 && (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-xs font-semibold text-slate-700">Assemblies</span>
              <span className="text-[10px] text-slate-500">
                {assemblyStats.totalQty} items • {assemblyStats.total} types
              </span>
            </div>
            <div className="flex items-center gap-1">
              {assemblyStats.unlinked > 0 && (
                <span className="text-[10px] text-amber-600 mr-1">{assemblyStats.unlinked} unlinked</span>
              )}
              {canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-slate-400 hover:text-red-500"
                  onClick={handleClearAssemblies}
                  disabled={isClearingAssemblies}
                >
                  {isClearingAssemblies ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Assembly chips - horizontal wrap */}
          <div className="p-2 flex flex-wrap gap-1.5">
            {job.requiredAssemblies.map((a) => (
              <div
                key={a.id}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs",
                  a.assembly 
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                    : "bg-amber-50 text-amber-700 border border-amber-100"
                )}
              >
                <span className="font-medium">{a.assemblyType}</span>
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] font-bold",
                  a.assembly ? "bg-emerald-100" : "bg-amber-100"
                )}>
                  ×{a.quantity}
                </span>
                {a.assembly ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                ) : (
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                )}
              </div>
            ))}
          </div>

          {/* Equipment toggle */}
          {equipmentTotals.length > 0 && (
            <div className="border-t border-slate-100">
              <button
                onClick={() => setShowEquipment(!showEquipment)}
                className="w-full px-3 py-2 flex items-center justify-between text-xs text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <Wrench className="h-3 w-3" />
                  <span>Equipment Totals</span>
                </div>
                <ChevronRight className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  showEquipment && "rotate-90"
                )} />
              </button>
              
              {showEquipment && (
                <div className="px-3 pb-2 space-y-1">
                  {equipmentTotals.slice(0, 6).map((eq) => (
                    <div key={eq.sku} className="flex items-center justify-between py-1 text-xs">
                      <span className="text-slate-600 truncate">{eq.name}</span>
                      <span className="font-bold text-slate-800 ml-2">{eq.total}</span>
                    </div>
                  ))}
                  {equipmentTotals.length > 6 && (
                    <p className="text-[10px] text-slate-400 pt-1">
                      +{equipmentTotals.length - 6} more items
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================ */}
      {/* MANUAL OVERRIDES - Compact toggle */}
      {/* ============================================ */}
      <button
        onClick={() => setShowOverrides(!showOverrides)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <Settings2 className="h-3.5 w-3.5" />
          <span>Manual Overrides</span>
        </div>
        <ChevronRight className={cn(
          "h-3.5 w-3.5 transition-transform",
          showOverrides && "rotate-90"
        )} />
      </button>

      {showOverrides && (
        <div className="p-3 border border-slate-200 rounded-lg space-y-3 bg-slate-50">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-slate-500">Strand ft</Label>
              <Input
                type="number"
                value={job.strandFootage || ""}
                onChange={(e) => updateJob({ strandFootage: Number(e.target.value) || 0 })}
                className="h-8 text-xs"
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-slate-500">Fiber ft</Label>
              <Input
                type="number"
                value={job.fiberFootage || ""}
                onChange={(e) => updateJob({ fiberFootage: Number(e.target.value) || 0 })}
                className="h-8 text-xs"
                disabled={!canEdit}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-slate-500">Dead-ends</Label>
              <Input
                type="number"
                value={job.deadEnds || ""}
                onChange={(e) => updateJob({ deadEnds: Number(e.target.value) || 0 })}
                className="h-8 text-xs"
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-slate-500">Tangents</Label>
              <Input
                type="number"
                value={job.tangents || ""}
                onChange={(e) => updateJob({ tangents: Number(e.target.value) || 0 })}
                className="h-8 text-xs"
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-slate-500">Anchors</Label>
              <Input
                type="number"
                value={job.anchors || ""}
                onChange={(e) => updateJob({ anchors: Number(e.target.value) || 0 })}
                className="h-8 text-xs"
                disabled={!canEdit}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
