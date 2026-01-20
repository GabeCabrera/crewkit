"use client";

import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Lightbulb, CheckCircle2 } from "lucide-react";
import type { JobPlanData } from "../../job-lifecycle-view";

interface LessonsStepProps {
  job: JobPlanData;
  updateJob: (updates: Partial<JobPlanData>) => void;
  canEdit: boolean;
}

export function LessonsStep({ job, updateJob, canEdit }: LessonsStepProps) {
  const hasContent = job.lessonsLearned && job.lessonsLearned.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
        <div className="h-10 w-10 rounded-xl bg-yellow-50 flex items-center justify-center">
          <Lightbulb className="h-5 w-5 text-yellow-600" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Lessons Learned</h3>
          <p className="text-sm text-slate-500">
            Document insights for future jobs
          </p>
        </div>
      </div>

      {/* Prompts */}
      <div className="bg-yellow-50 rounded-xl p-4">
        <p className="text-sm font-medium text-yellow-800 mb-2">
          Consider documenting:
        </p>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• What went well during this job?</li>
          <li>• What challenges were encountered?</li>
          <li>• What would you do differently next time?</li>
          <li>• Any tips for similar jobs in this area?</li>
          <li>• Equipment or material recommendations?</li>
        </ul>
      </div>

      {/* Text Area */}
      <div className="space-y-2">
        <Label htmlFor="lessonsLearned">Notes & Observations</Label>
        <Textarea
          id="lessonsLearned"
          value={job.lessonsLearned || ""}
          onChange={(e) => updateJob({ lessonsLearned: e.target.value })}
          placeholder="Enter any lessons learned, observations, or recommendations for future reference..."
          className="min-h-[200px] rounded-xl"
          disabled={!canEdit}
        />
        <p className="text-xs text-slate-500">
          {job.lessonsLearned?.length || 0} characters
        </p>
      </div>

      {/* Status */}
      {hasContent && (
        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-3 rounded-xl text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Lessons documented</span>
        </div>
      )}

      {/* Job Context */}
      <div className="bg-slate-50 rounded-xl p-4">
        <h4 className="text-sm font-medium text-slate-700 mb-3">Job Reference</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-500">Job Name</p>
            <p className="font-medium text-slate-900">{job.jobName}</p>
          </div>
          <div>
            <p className="text-slate-500">Route</p>
            <p className="font-medium text-slate-900">
              {job.startPoleId} → {job.endPoleId}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Distance</p>
            <p className="font-medium text-slate-900">
              {job.totalDistance.toLocaleString()} ft
            </p>
          </div>
          <div>
            <p className="text-slate-500">Completed</p>
            <p className="font-medium text-slate-900">
              {job.actualFootage.toLocaleString()} ft ({
                job.totalDistance > 0
                  ? ((job.actualFootage / job.totalDistance) * 100).toFixed(0)
                  : 0
              }%)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
