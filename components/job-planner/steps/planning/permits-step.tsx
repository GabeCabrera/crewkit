"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobPlanData } from "../../job-lifecycle-view";

interface PermitsStepProps {
  job: JobPlanData;
  updateJob: (updates: Partial<JobPlanData>) => void;
  canEdit: boolean;
}

export function PermitsStep({ job, updateJob, canEdit }: PermitsStepProps) {
  const checks = [
    { id: "rmpPermitApproved", label: "RMP Permit Approved", checked: job.rmpPermitApproved },
    { id: "sesdPermitApproved", label: "SESD Permit Approved", checked: job.sesdPermitApproved },
    { id: "makeReadyComplete", label: "Make-Ready Complete", checked: job.makeReadyComplete },
    { id: "easementsClear", label: "Easements Clear", checked: job.easementsClear },
  ];

  const allChecked = checks.every((check) => check.checked);

  return (
    <div className="space-y-6">
      {!allChecked && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-xl text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="font-medium">STOP: Job not ready. All items must be checked.</span>
        </div>
      )}

      {allChecked && (
        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-3 rounded-xl text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span className="font-medium">All permits verified. Job is ready to proceed.</span>
        </div>
      )}

      <div className="space-y-3">
        {checks.map((check) => (
          <label
            key={check.id}
            className={cn(
              "flex items-center gap-4 p-4 bg-slate-50 rounded-xl transition-colors",
              canEdit && "cursor-pointer hover:bg-slate-100"
            )}
          >
            <Checkbox
              checked={check.checked}
              disabled={!canEdit}
              onCheckedChange={(checked) =>
                updateJob({ [check.id]: checked === true })
              }
            />
            <span className="font-medium text-slate-700">{check.label}</span>
            {check.checked && (
              <CheckCircle2 className="h-5 w-5 text-emerald-500 ml-auto" />
            )}
          </label>
        ))}
      </div>

      <p className="text-sm text-slate-500">
        All permits and prerequisites must be verified before construction can begin.
        The job status will automatically update to &quot;Ready&quot; when all items are checked.
      </p>
    </div>
  );
}
