"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Car, TreePine, Bug, Waves } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobPlanData } from "../../job-lifecycle-view";

interface HazardsStepProps {
  job: JobPlanData;
  updateJob: (updates: Partial<JobPlanData>) => void;
  canEdit: boolean;
}

export function HazardsStep({ job, updateJob, canEdit }: HazardsStepProps) {
  const hazards = [
    { id: "trafficControl", label: "Traffic Control Required", icon: Car, checked: job.trafficControl },
    { id: "treeTrimming", label: "Tree Trimming Required", icon: TreePine, checked: job.treeTrimming },
    { id: "animalHazards", label: "Animal Hazards", icon: Bug, checked: job.animalHazards },
    { id: "waterRailCrossing", label: "Water/Rail Crossing", icon: Waves, checked: job.waterRailCrossing },
  ];

  const activeHazards = hazards.filter((h) => h.checked);

  return (
    <div className="space-y-6">
      {/* Animated hazards summary banner - always rendered, animates in/out */}
      <div
        className={cn(
          "rounded-xl overflow-hidden transition-all duration-200 ease-out",
          activeHazards.length > 0
            ? "bg-amber-50 p-4 opacity-100 max-h-40"
            : "bg-transparent p-0 opacity-0 max-h-0"
        )}
      >
        <p className="text-sm font-medium text-amber-800 mb-2">
          {activeHazards.length} hazard{activeHazards.length !== 1 ? "s" : ""} identified
        </p>
        <div className="flex flex-wrap gap-2">
          {activeHazards.map((hazard) => (
            <span
              key={hazard.id}
              className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium"
            >
              {hazard.label}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {hazards.map((hazard) => {
          const Icon = hazard.icon;
          return (
            <label
              key={hazard.id}
              className={cn(
                "flex items-center gap-4 p-4 bg-slate-50 rounded-xl transition-colors",
                canEdit && "cursor-pointer hover:bg-slate-100"
              )}
            >
              <Checkbox
                checked={hazard.checked}
                disabled={!canEdit}
                onCheckedChange={(checked) =>
                  updateJob({ [hazard.id]: checked === true })
                }
              />
              <Icon className="h-5 w-5 text-slate-500" />
              <span className="font-medium text-slate-700">{hazard.label}</span>
            </label>
          );
        })}
      </div>

      <div className="space-y-2 pt-4">
        <Label htmlFor="foremanNotes">Foreman Notes</Label>
        <Textarea
          id="foremanNotes"
          value={job.foremanNotes || ""}
          onChange={(e) => updateJob({ foremanNotes: e.target.value })}
          placeholder="Enter any additional notes or special instructions..."
          className="min-h-[120px] rounded-xl"
          disabled={!canEdit}
        />
        <p className="text-xs text-slate-500">
          Add any special instructions, warnings, or notes for the crew.
        </p>
      </div>
    </div>
  );
}
