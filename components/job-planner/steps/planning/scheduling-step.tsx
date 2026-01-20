"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Clock } from "lucide-react";
import type { JobPlanData } from "../../job-lifecycle-view";

interface SchedulingStepProps {
  job: JobPlanData;
  updateJob: (updates: Partial<JobPlanData>) => void;
  canEdit: boolean;
}

export function SchedulingStep({ job, updateJob, canEdit }: SchedulingStepProps) {
  const startDate = job.plannedStartDate ? new Date(job.plannedStartDate) : undefined;
  const endDate = job.plannedEndDate ? new Date(job.plannedEndDate) : undefined;

  return (
    <div className="space-y-6">
      {/* Date Pickers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Planned Start Date</Label>
          <DatePicker
            date={startDate}
            onDateChange={(date) =>
              updateJob({ plannedStartDate: date?.toISOString() || null })
            }
            placeholder="Select start date"
            disabled={!canEdit}
          />
        </div>

        <div className="space-y-2">
          <Label>Planned End Date</Label>
          <DatePicker
            date={endDate}
            onDateChange={(date) =>
              updateJob({ plannedEndDate: date?.toISOString() || null })
            }
            placeholder="Select end date"
            disabled={!canEdit}
          />
        </div>
      </div>

      {/* Duration Estimate */}
      <div className="border-t border-slate-100 pt-6">
        <h3 className="text-sm font-medium text-slate-700 mb-4">Estimated Duration</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="estimatedDuration">Duration</Label>
            <Input
              id="estimatedDuration"
              type="number"
              value={job.estimatedDuration || ""}
              onChange={(e) =>
                updateJob({ estimatedDuration: Number(e.target.value) || null })
              }
              placeholder="e.g., 8"
              className="h-12 rounded-xl"
              min="0"
              step="0.5"
              disabled={!canEdit}
            />
          </div>

          <div className="space-y-2">
            <Label>Unit</Label>
            <Select
              value={job.durationUnit || "hours"}
              onValueChange={(value) => updateJob({ durationUnit: value })}
              disabled={!canEdit}
            >
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hours">Hours</SelectItem>
                <SelectItem value="days">Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Summary */}
      {(startDate || endDate || job.estimatedDuration) && (
        <div className="bg-blue-50 rounded-xl p-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">Schedule Summary</h4>
          <div className="space-y-1 text-sm text-blue-700">
            {startDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>
                  Start: {startDate.toLocaleDateString("en-US", { 
                    weekday: "long", 
                    month: "long", 
                    day: "numeric",
                    year: "numeric"
                  })}
                </span>
              </div>
            )}
            {endDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>
                  End: {endDate.toLocaleDateString("en-US", { 
                    weekday: "long", 
                    month: "long", 
                    day: "numeric",
                    year: "numeric"
                  })}
                </span>
              </div>
            )}
            {job.estimatedDuration && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>
                  Estimated: {job.estimatedDuration} {job.durationUnit || "hours"}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <p className="text-sm text-slate-500">
        Scheduling helps with resource planning and team coordination. 
        Actual progress will be tracked in the Construction phase.
      </p>
    </div>
  );
}
