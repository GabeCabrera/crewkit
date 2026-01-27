"use client";

import { useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Printer,
  Package,
  CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobPlanData } from "../../job-lifecycle-view";

interface JobSheetProps {
  job: JobPlanData;
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

export function JobSheet({ job }: JobSheetProps) {
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

  // Hazard flags
  const hazards = [];
  if (job.trafficControl) hazards.push("Traffic");
  if (job.treeTrimming) hazards.push("Trees");
  if (job.animalHazards) hazards.push("Animals");
  if (job.waterRailCrossing) hazards.push("Crossing");

  return (
    <div>
      {/* Print Controls - Hidden when printing */}
      <div className="print:hidden flex items-center justify-between p-2 mb-3 bg-slate-50 border border-slate-200 rounded-lg">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">Job Prep Sheet</span>
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
        <div className="flex items-start justify-between pb-2 mb-2 border-b-2 border-slate-800">
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">{job.jobName}</h1>
            <div className="flex items-center gap-3 text-slate-600 mt-0.5">
              {job.jobNumber && <span className="font-mono">#{job.jobNumber}</span>}
              {job.locationName && <span>{job.locationName}</span>}
            </div>
          </div>
          <div className="text-right text-[10px] text-slate-500">
            <div className="font-semibold text-slate-700">JOB PREP SHEET</div>
            <div>{printDate}</div>
          </div>
        </div>

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

            {/* Cable Requirements - Inline */}
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

            {/* Infrastructure - Inline badges */}
            {Object.keys(infraCounts).length > 0 && (
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
      </div>
    </div>
  );
}
