"use client";

import { useSession } from "next-auth/react";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckSquare, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobPlanData } from "../../job-lifecycle-view";

interface SignoffStepProps {
  job: JobPlanData;
  updateJob: (updates: Partial<JobPlanData>) => void;
  canEdit: boolean;
}

export function SignoffStep({ job, updateJob, canEdit }: SignoffStepProps) {
  const { data: session } = useSession();

  // Check requirements
  const allPermitsChecked =
    job.rmpPermitApproved &&
    job.sesdPermitApproved &&
    job.makeReadyComplete &&
    job.easementsClear;

  const hasConstructionProgress = job.actualFootage > 0 || job.actualPolesComplete > 0;

  const canSignOff = allPermitsChecked && hasConstructionProgress;

  const handleSignoff = (checked: boolean) => {
    if (checked && !canSignOff) return;

    updateJob({
      foremanSignoff: checked,
      signoffDate: checked ? new Date().toISOString() : null,
      completedAt: checked ? new Date().toISOString() : null,
    });
  };

  return (
    <div className="space-y-6">
      {/* Sign-off Status */}
      {job.foremanSignoff ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-xl font-semibold text-emerald-900 mb-1">
            Job Signed Off
          </h3>
          <p className="text-emerald-700">
            Completed on{" "}
            {job.signoffDate
              ? new Date(job.signoffDate).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : "N/A"}
          </p>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
          <CheckSquare className="h-12 w-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-xl font-semibold text-amber-900 mb-1">
            Awaiting Sign-off
          </h3>
          <p className="text-amber-700">
            Review requirements below before signing off
          </p>
        </div>
      )}

      {/* Requirements Checklist */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
          <h3 className="font-medium text-slate-900">Sign-off Requirements</h3>
        </div>

        <div className="divide-y divide-slate-100">
          {/* Permits */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              {allPermitsChecked ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <div>
                <p className="font-medium text-slate-900">All Permits Verified</p>
                <p className="text-sm text-slate-500">
                  RMP, SESD, Make-Ready, Easements
                </p>
              </div>
            </div>
            <span
              className={cn(
                "px-2 py-1 rounded text-xs font-medium",
                allPermitsChecked
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-red-50 text-red-600"
              )}
            >
              {allPermitsChecked ? "Complete" : "Incomplete"}
            </span>
          </div>

          {/* Construction Progress */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              {hasConstructionProgress ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <div>
                <p className="font-medium text-slate-900">Construction Progress Logged</p>
                <p className="text-sm text-slate-500">
                  At least one daily progress entry required
                </p>
              </div>
            </div>
            <span
              className={cn(
                "px-2 py-1 rounded text-xs font-medium",
                hasConstructionProgress
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-red-50 text-red-600"
              )}
            >
              {hasConstructionProgress
                ? `${job.actualFootage.toLocaleString()} ft logged`
                : "No progress"}
            </span>
          </div>
        </div>
      </div>

      {/* Sign-off Action */}
      {!job.foremanSignoff && (
        <div className="bg-slate-50 rounded-xl p-6">
          {canSignOff ? (
            <label className="flex items-start gap-4 cursor-pointer">
              <Checkbox
                checked={job.foremanSignoff}
                onCheckedChange={(checked) => handleSignoff(checked === true)}
                disabled={!canEdit}
                className="mt-1"
              />
              <div>
                <p className="font-medium text-slate-900">
                  I confirm this job is complete
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  By checking this box, you certify that all work has been completed
                  according to specifications and the job is ready for final review.
                </p>
                {session?.user?.name && (
                  <p className="text-xs text-slate-400 mt-2">
                    Signing as: {session.user.name}
                  </p>
                )}
              </div>
            </label>
          ) : (
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-slate-900">
                  Cannot sign off yet
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  Please complete all requirements above before signing off on this job.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Undo Sign-off */}
      {job.foremanSignoff && canEdit && (
        <div className="text-center">
          <button
            onClick={() => handleSignoff(false)}
            className="text-sm text-slate-500 hover:text-slate-700 underline"
          >
            Undo sign-off
          </button>
        </div>
      )}
    </div>
  );
}
