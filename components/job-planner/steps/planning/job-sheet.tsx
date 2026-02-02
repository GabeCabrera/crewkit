"use client";

import { useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Printer,
  Package,
  CheckSquare,
  Download,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobPlanData } from "../../job-lifecycle-view";

type JobSheetMode = "planning" | "as-built";

interface JobSheetProps {
  job: JobPlanData;
  mode?: JobSheetMode;
}

// Format number with commas
function formatNumber(num: number): string {
  return Math.round(num).toLocaleString();
}

// Format date for display - compact
function formatDate(dateString: string | null): string {
  if (!dateString) return "TBD";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// Get infrastructure counts from assemblies
function getInfraCounts(assemblies: JobPlanData["requiredAssemblies"]): Record<string, number> {
  const counts: Record<string, number> = {};
  
  for (const assembly of assemblies || []) {
    const type = assembly.assemblyType.toLowerCase();
    
    if (type.includes("pole")) {
      counts["Poles"] = (counts["Poles"] || 0) + assembly.quantity;
    } else if (type.includes("mst")) {
      counts["MST"] = (counts["MST"] || 0) + assembly.quantity;
    } else if (type.includes("splice")) {
      counts["Splices"] = (counts["Splices"] || 0) + assembly.quantity;
    } else if (type.includes("riser")) {
      counts["Risers"] = (counts["Risers"] || 0) + assembly.quantity;
    } else if (type.includes("anchor") || type.includes("guy")) {
      counts["Anchors"] = (counts["Anchors"] || 0) + assembly.quantity;
    }
  }
  
  return counts;
}

// Aggregate equipment totals across all assemblies
interface EquipmentTotal {
  name: string;
  sku: string;
  total: number;
}

function getEquipmentTotals(assemblies: JobPlanData["requiredAssemblies"]): EquipmentTotal[] {
  const totals = new Map<string, EquipmentTotal>();
  
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
  
  return Array.from(totals.values()).sort((a, b) => a.name.localeCompare(b.name));
}

// Build type display name - short
function getBuildTypeLabel(buildType: string): string {
  const labels: Record<string, string> = {
    full_build: "Full",
    strand_build: "Strand",
    fiber_build: "Fiber",
    peripheral_build: "Peripheral",
  };
  return labels[buildType] || buildType;
}

// Calculate variance and status
interface VarianceResult {
  variance: number;
  percentVariance: number;
  status: "match" | "over" | "under";
}

function calculateVariance(planned: number, actual: number, tolerancePercent: number = 10): VarianceResult {
  const variance = actual - planned;
  const percentVariance = planned > 0 ? ((actual / planned) * 100) - 100 : 0;
  
  let status: "match" | "over" | "under" = "match";
  if (Math.abs(percentVariance) > tolerancePercent) {
    status = variance > 0 ? "over" : "under";
  }
  
  return { variance, percentVariance, status };
}

// Variance display helpers
function getVarianceColor(status: "match" | "over" | "under"): string {
  if (status === "over") return "text-red-600";
  if (status === "under") return "text-emerald-600";
  return "text-slate-600";
}

function getVarianceBgColor(status: "match" | "over" | "under"): string {
  if (status === "over") return "bg-red-50";
  if (status === "under") return "bg-emerald-50";
  return "bg-slate-50";
}

export function JobSheet({ job, mode = "planning" }: JobSheetProps) {
  const printRef = useRef<HTMLDivElement>(null);

  // Calculate totals
  const totalCable = job.aerialFootage + job.undergroundFootage + job.slackLoopFootage;
  
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

  // Calculate progress percentage for as-built mode
  const progressPercentage = job.totalDistance > 0 
    ? Math.min((job.actualFootage / job.totalDistance) * 100, 100) 
    : 0;

  // Calculate variances for as-built mode
  const footageVariance = calculateVariance(job.totalDistance, job.actualFootage);
  const strandVariance = calculateVariance(job.strandFootage, job.actualStrandUsed);
  const fiberVariance = calculateVariance(job.fiberFootage, job.actualFiberUsed);
  const deadEndsVariance = calculateVariance(job.deadEnds, job.actualDeadEnds, 20);
  const tangentsVariance = calculateVariance(job.tangents, job.actualTangents, 20);
  const anchorsVariance = calculateVariance(job.anchors, job.actualAnchors, 20);
  const polesVariance = calculateVariance(job.poleCount, job.actualPolesComplete, 20);

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  // Today's date for the sheet
  const printDate = new Date().toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
  });

  const isAsBuilt = mode === "as-built";

  // Hazard flags
  const hazards = [];
  if (job.trafficControl) hazards.push("Traffic");
  if (job.treeTrimming) hazards.push("Trees");
  if (job.animalHazards) hazards.push("Animals");
  if (job.waterRailCrossing) hazards.push("Crossing");

  return (
    <div>
      {/* Print Controls - Hidden when printing */}
      <div className={cn(
        "print:hidden flex items-center justify-between p-2 mb-3 border rounded-lg",
        isAsBuilt ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-200"
      )}>
        <div className="flex items-center gap-2">
          {isAsBuilt ? (
            <FileText className="h-4 w-4 text-blue-500" />
          ) : (
            <Package className="h-4 w-4 text-slate-500" />
          )}
          <span className={cn(
            "text-sm font-medium",
            isAsBuilt ? "text-blue-700" : "text-slate-700"
          )}>
            {isAsBuilt ? "As-Built Report" : "Job Prep Sheet"}
          </span>
          {isAsBuilt && (
            <span className={cn(
              "px-2 py-0.5 rounded text-xs font-medium",
              job.foremanSignoff ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
            )}>
              {job.foremanSignoff ? "FINAL" : "DRAFT"}
            </span>
          )}
        </div>
        <Button onClick={handlePrint} size="sm" className="gap-2 h-8">
          <Printer className="h-3.5 w-3.5" />
          Print
        </Button>
      </div>

      {/* Printable Content - Compact single page layout */}
      <div ref={printRef} className="text-xs print:text-[10pt]">
        {/* Print Styles */}
        <style jsx global>{`
          @media print {
            @page { size: letter; margin: 0.4in; }
            body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .print\\:hidden { display: none !important; }
          }
        `}</style>

        {/* HEADER ROW */}
        <div className={cn(
          "flex items-start justify-between pb-2 mb-2 border-b-2",
          isAsBuilt ? "border-blue-800" : "border-slate-800"
        )}>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">{job.jobName}</h1>
            <div className="flex items-center gap-3 text-slate-600 mt-0.5">
              {job.jobNumber && <span className="font-mono">#{job.jobNumber}</span>}
              {job.locationName && <span>{job.locationName}</span>}
            </div>
          </div>
          <div className="text-right text-[10px] text-slate-500">
            <div className={cn(
              "font-semibold",
              isAsBuilt ? "text-blue-700" : "text-slate-700"
            )}>
              {isAsBuilt ? "AS-BUILT REPORT" : "JOB PREP SHEET"}
              {isAsBuilt && !job.foremanSignoff && <span className="ml-1 text-amber-600">(DRAFT)</span>}
            </div>
            <div>{printDate}</div>
          </div>
        </div>

        {/* Progress Bar - As-Built Mode Only */}
        {isAsBuilt && (
          <div className="mb-3 p-2 bg-slate-100 rounded">
            <div className="flex items-center justify-between mb-1 text-[10px]">
              <span className="font-semibold text-slate-700">Overall Progress</span>
              <span className="font-bold text-slate-900">{progressPercentage.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-500",
                  progressPercentage >= 100 
                    ? "bg-emerald-500" 
                    : "bg-blue-500"
                )}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[9px] text-slate-500">
              <span>{formatNumber(job.actualFootage)} ft completed</span>
              <span>{formatNumber(job.totalDistance)} ft planned</span>
            </div>
          </div>
        )}

        {/* TWO COLUMN LAYOUT */}
        <div className="grid grid-cols-2 gap-3">
          {/* LEFT COLUMN */}
          <div className="space-y-2">
            {/* Job Info Bar */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 p-2 bg-slate-100 rounded text-[10px]">
              <div><span className="text-slate-500">Type:</span> <span className="font-semibold">{getBuildTypeLabel(job.jobBuildType)}</span></div>
              <div><span className="text-slate-500">Start:</span> <span className="font-semibold">{formatDate(job.plannedStartDate)}</span></div>
              {job.estimatedDuration && (
                <div><span className="text-slate-500">Duration:</span> <span className="font-semibold">{job.estimatedDuration} {job.durationUnit || "days"}</span></div>
              )}
              {job.assignments?.length > 0 && (
                <div><span className="text-slate-500">Crew:</span> <span className="font-semibold">{job.assignments.map(a => a.user.name || a.user.email.split("@")[0]).join(", ")}</span></div>
              )}
            </div>

            {/* Cable Requirements - Different layout for as-built */}
            {isAsBuilt ? (
              <div className="p-2 border border-slate-200 rounded">
                <div className="font-semibold text-slate-700 mb-1">Materials Comparison</div>
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-100">
                      <th className="text-left py-1">Item</th>
                      <th className="text-right py-1">Planned</th>
                      <th className="text-right py-1">Actual</th>
                      <th className="text-right py-1">Var</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className={getVarianceBgColor(footageVariance.status)}>
                      <td className="py-0.5 font-medium">Total Footage</td>
                      <td className="text-right font-mono">{formatNumber(job.totalDistance)}</td>
                      <td className="text-right font-mono font-semibold">{formatNumber(job.actualFootage)}</td>
                      <td className={cn("text-right font-mono font-semibold", getVarianceColor(footageVariance.status))}>
                        {footageVariance.variance >= 0 ? "+" : ""}{formatNumber(footageVariance.variance)}
                      </td>
                    </tr>
                    <tr className={getVarianceBgColor(strandVariance.status)}>
                      <td className="py-0.5 font-medium">Strand</td>
                      <td className="text-right font-mono">{formatNumber(job.strandFootage)}</td>
                      <td className="text-right font-mono font-semibold">{formatNumber(job.actualStrandUsed)}</td>
                      <td className={cn("text-right font-mono font-semibold", getVarianceColor(strandVariance.status))}>
                        {strandVariance.variance >= 0 ? "+" : ""}{formatNumber(strandVariance.variance)}
                      </td>
                    </tr>
                    <tr className={getVarianceBgColor(fiberVariance.status)}>
                      <td className="py-0.5 font-medium">Fiber</td>
                      <td className="text-right font-mono">{formatNumber(job.fiberFootage)}</td>
                      <td className="text-right font-mono font-semibold">{formatNumber(job.actualFiberUsed)}</td>
                      <td className={cn("text-right font-mono font-semibold", getVarianceColor(fiberVariance.status))}>
                        {fiberVariance.variance >= 0 ? "+" : ""}{formatNumber(fiberVariance.variance)}
                      </td>
                    </tr>
                    <tr className={getVarianceBgColor(deadEndsVariance.status)}>
                      <td className="py-0.5 font-medium">Dead-ends</td>
                      <td className="text-right font-mono">{job.deadEnds}</td>
                      <td className="text-right font-mono font-semibold">{job.actualDeadEnds}</td>
                      <td className={cn("text-right font-mono font-semibold", getVarianceColor(deadEndsVariance.status))}>
                        {deadEndsVariance.variance >= 0 ? "+" : ""}{deadEndsVariance.variance}
                      </td>
                    </tr>
                    <tr className={getVarianceBgColor(tangentsVariance.status)}>
                      <td className="py-0.5 font-medium">Tangents</td>
                      <td className="text-right font-mono">{job.tangents}</td>
                      <td className="text-right font-mono font-semibold">{job.actualTangents}</td>
                      <td className={cn("text-right font-mono font-semibold", getVarianceColor(tangentsVariance.status))}>
                        {tangentsVariance.variance >= 0 ? "+" : ""}{tangentsVariance.variance}
                      </td>
                    </tr>
                    <tr className={getVarianceBgColor(anchorsVariance.status)}>
                      <td className="py-0.5 font-medium">Anchors</td>
                      <td className="text-right font-mono">{job.anchors}</td>
                      <td className="text-right font-mono font-semibold">{job.actualAnchors}</td>
                      <td className={cn("text-right font-mono font-semibold", getVarianceColor(anchorsVariance.status))}>
                        {anchorsVariance.variance >= 0 ? "+" : ""}{anchorsVariance.variance}
                      </td>
                    </tr>
                    <tr className={getVarianceBgColor(polesVariance.status)}>
                      <td className="py-0.5 font-medium">Poles</td>
                      <td className="text-right font-mono">{job.poleCount}</td>
                      <td className="text-right font-mono font-semibold">{job.actualPolesComplete}</td>
                      <td className={cn("text-right font-mono font-semibold", getVarianceColor(polesVariance.status))}>
                        {polesVariance.variance >= 0 ? "+" : ""}{polesVariance.variance}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-2 border border-slate-200 rounded">
                <div className="font-semibold text-slate-700 mb-1">Cable</div>
                <div className="grid grid-cols-3 gap-1 text-[10px]">
                  <div className="flex justify-between"><span className="text-slate-500">Aerial</span><span className="font-mono font-semibold">{formatNumber(job.aerialFootage)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">UG</span><span className="font-mono font-semibold">{formatNumber(job.undergroundFootage)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Slack</span><span className="font-mono font-semibold">{formatNumber(job.slackLoopFootage)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Strand</span><span className="font-mono font-semibold">{formatNumber(job.strandFootage)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Fiber</span><span className="font-mono font-semibold">{formatNumber(job.fiberFootage)}</span></div>
                  <div className="flex justify-between bg-slate-100 px-1 rounded"><span className="font-semibold">Total</span><span className="font-mono font-bold">{formatNumber(totalCable)}</span></div>
                </div>
              </div>
            )}

            {/* Infrastructure - Inline badges (planning mode only) */}
            {!isAsBuilt && Object.keys(infraCounts).length > 0 && (
              <div className="p-2 border border-slate-200 rounded">
                <div className="font-semibold text-slate-700 mb-1">Infrastructure</div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(infraCounts).map(([label, count]) => (
                    <span key={label} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 rounded text-[10px]">
                      <span className="font-bold">{count}</span>
                      <span className="text-slate-600">{label}</span>
                    </span>
                  ))}
                  {job.deadEnds > 0 && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 rounded text-[10px]">
                      <span className="font-bold">{job.deadEnds}</span>
                      <span className="text-slate-600">Dead-ends</span>
                    </span>
                  )}
                  {job.tangents > 0 && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 rounded text-[10px]">
                      <span className="font-bold">{job.tangents}</span>
                      <span className="text-slate-600">Tangents</span>
                    </span>
                  )}
                  {job.anchors > 0 && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 rounded text-[10px]">
                      <span className="font-bold">{job.anchors}</span>
                      <span className="text-slate-600">Anchors</span>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Crew Hours Summary - As-Built mode only */}
            {isAsBuilt && job.totalCrewHours > 0 && (
              <div className="p-2 border border-blue-200 bg-blue-50 rounded">
                <div className="font-semibold text-blue-700 mb-1">Crew Hours</div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="bg-white rounded p-2 text-center">
                    <div className="text-lg font-bold text-blue-700">{job.totalCrewHours.toFixed(1)}</div>
                    <div className="text-slate-500">Total Hours</div>
                  </div>
                  <div className="bg-white rounded p-2 text-center">
                    <div className="text-lg font-bold text-blue-700">
                      {job.actualFootage > 0 && job.totalCrewHours > 0 
                        ? (job.actualFootage / job.totalCrewHours).toFixed(0) 
                        : "—"}
                    </div>
                    <div className="text-slate-500">Ft / Hour</div>
                  </div>
                </div>
              </div>
            )}

            {/* Hazards & Access - Combined compact */}
            {(hazards.length > 0 || job.gateCode || job.siteContactName || job.foremanNotes) && (
              <div className="p-2 border border-amber-200 bg-amber-50 rounded text-[10px]">
                {hazards.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1">
                    {hazards.map(h => (
                      <span key={h} className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-medium">{h}</span>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-slate-700">
                  {job.gateCode && <div><span className="text-slate-500">Gate:</span> <span className="font-mono font-semibold">{job.gateCode}</span></div>}
                  {job.siteContactName && <div><span className="text-slate-500">Contact:</span> <span className="font-semibold">{job.siteContactName}</span> {job.siteContactPhone && <span className="text-slate-500">{job.siteContactPhone}</span>}</div>}
                  {job.poleOwner && <div><span className="text-slate-500">Pole Owner:</span> <span className="font-semibold">{job.poleOwner}</span></div>}
                </div>
                {job.foremanNotes && (
                  <div className="mt-1 pt-1 border-t border-amber-200 text-slate-700">
                    <span className="font-semibold">Notes:</span> {job.foremanNotes}
                  </div>
                )}
              </div>
            )}

            {/* Assemblies - Compact list */}
            {job.requiredAssemblies && job.requiredAssemblies.length > 0 && (
              <div className="p-2 border border-slate-200 rounded">
                <div className="font-semibold text-slate-700 mb-1">Assemblies</div>
                <div className="flex flex-wrap gap-1">
                  {job.requiredAssemblies.map((a) => (
                    <span 
                      key={a.id} 
                      className={cn(
                        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]",
                        a.assembly ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                      )}
                    >
                      <span className="font-bold">{a.quantity}×</span>
                      <span>{a.assemblyType}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN - Equipment Checklist */}
          <div className="border border-slate-200 rounded overflow-hidden">
            <div className="px-2 py-1 bg-slate-100 font-semibold text-slate-700 flex items-center justify-between">
              <span>Equipment Checklist</span>
              <span className="text-[10px] text-slate-500 font-normal">{equipmentTotals.length} items</span>
            </div>
            {equipmentTotals.length > 0 ? (
              <div className="max-h-[400px] overflow-y-auto print:max-h-none print:overflow-visible">
                <table className="w-full text-[10px]">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="w-6 px-1 py-1 text-center">
                        <CheckSquare className="h-3 w-3 text-slate-400 mx-auto" />
                      </th>
                      <th className="text-left px-1 py-1 font-semibold text-slate-600">Item</th>
                      <th className="text-right px-1 py-1 font-semibold text-slate-600 w-12">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipmentTotals.map((eq, idx) => (
                      <tr 
                        key={eq.sku} 
                        className={cn(
                          "border-t border-slate-100",
                          idx % 2 === 1 && "bg-slate-50/50"
                        )}
                      >
                        <td className="px-1 py-0.5 text-center">
                          <input
                            type="checkbox"
                            className="h-3 w-3 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                            aria-label={`Mark ${eq.name} as loaded`}
                          />
                        </td>
                        <td className="px-1 py-0.5 text-slate-700 truncate max-w-[180px]" title={eq.name}>
                          {eq.name}
                          <span className="text-slate-400 ml-1 font-mono text-[9px]">{eq.sku}</span>
                        </td>
                        <td className="px-1 py-0.5 text-right font-mono font-semibold text-slate-900">
                          {eq.total}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 text-center text-slate-400 text-[10px]">
                No equipment items linked
              </div>
            )}
          </div>
        </div>

        {/* Signature Line - Print only */}
        {isAsBuilt ? (
          <div className="hidden print:block mt-4 pt-3 border-t border-slate-300">
            {job.foremanSignoff ? (
              <div className="text-[9px] text-emerald-700 text-center">
                <span className="font-semibold">SIGNED OFF</span>
                {job.signoffDate && (
                  <span> on {new Date(job.signoffDate).toLocaleDateString()}</span>
                )}
              </div>
            ) : (
              <div className="flex justify-between text-[9px] text-slate-500">
                <div className="flex-1">
                  <span>Foreman Sign-off: _______________________</span>
                </div>
                <div className="flex-1 text-right">
                  <span>Date: _______________</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="hidden print:flex mt-4 pt-3 border-t border-slate-300 justify-between text-[9px] text-slate-500">
            <div className="flex-1">
              <span>Prepared: _______________________</span>
            </div>
            <div className="flex-1 text-center">
              <span>Verified: _______________________</span>
            </div>
            <div className="flex-1 text-right">
              <span>Date: _______________</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
