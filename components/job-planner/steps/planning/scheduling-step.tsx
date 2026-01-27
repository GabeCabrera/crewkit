"use client";

import { useEffect, useState, useCallback } from "react";
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
import { Calendar, Clock, AlertTriangle, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobPlanData } from "../../job-lifecycle-view";

interface SchedulingStepProps {
  job: JobPlanData;
  updateJob: (updates: Partial<JobPlanData>) => void;
  canEdit: boolean;
  isAdmin?: boolean;
}

// Day of week config
const DAYS_OF_WEEK = [
  { value: 0, label: "Sun", short: "S" },
  { value: 1, label: "Mon", short: "M" },
  { value: 2, label: "Tue", short: "T" },
  { value: 3, label: "Wed", short: "W" },
  { value: 4, label: "Thu", short: "T" },
  { value: 5, label: "Fri", short: "F" },
  { value: 6, label: "Sat", short: "S" },
];

// Default fallback values
const DEFAULT_WORK_DAYS = [1, 2, 3, 4]; // Mon-Thu
const DEFAULT_SHIFT_HOURS = 12;

/**
 * Calculate end date based on start date, duration, and work days
 */
function calculateEndDate(
  startDate: Date,
  duration: number,
  unit: string,
  workDays: number[],
  shiftHours: number
): Date {
  // Convert duration to work days
  const workDaysCount = unit === "hours" 
    ? Math.ceil(duration / shiftHours) 
    : Math.ceil(duration);
  
  if (workDaysCount <= 0 || workDays.length === 0) return startDate;
  
  const endDate = new Date(startDate);
  let daysAdded = 0;
  
  // Start counting from the start date (it counts as day 1)
  while (daysAdded < workDaysCount - 1) {
    endDate.setDate(endDate.getDate() + 1);
    const dayOfWeek = endDate.getDay();
    
    if (workDays.includes(dayOfWeek)) {
      daysAdded++;
    }
  }
  
  return endDate;
}

/**
 * Check if a date falls on a non-work day
 */
function isNonWorkDay(date: Date, workDays: number[]): boolean {
  return !workDays.includes(date.getDay());
}

/**
 * Get the day name for display
 */
function getDayName(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

/**
 * Format work days for display
 */
function formatWorkDays(days: number[]): string {
  return DAYS_OF_WEEK
    .filter(d => days.includes(d.value))
    .map(d => d.label)
    .join(", ");
}

export function SchedulingStep({ job, updateJob, canEdit, isAdmin = false }: SchedulingStepProps) {
  // Global settings
  const [globalWorkDays, setGlobalWorkDays] = useState<number[]>(DEFAULT_WORK_DAYS);
  const [globalShiftHours, setGlobalShiftHours] = useState<number>(DEFAULT_SHIFT_HOURS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Custom schedule toggle
  const [useCustomSchedule, setUseCustomSchedule] = useState(false);
  const [customDays, setCustomDays] = useState<number[]>([]);

  // Derived values
  const startDate = job.plannedStartDate ? new Date(job.plannedStartDate) : undefined;
  const endDate = job.plannedEndDate ? new Date(job.plannedEndDate) : undefined;
  
  // Active work days (custom or global)
  const activeWorkDays = useCustomSchedule ? customDays : globalWorkDays;
  const shiftHours = globalShiftHours;
  
  // Check if start date is on a non-work day
  const startOnNonWorkDay = startDate ? isNonWorkDay(startDate, activeWorkDays) : false;

  // Fetch global settings on mount
  useEffect(() => {
    fetch("/api/settings")
      .then(res => res.json())
      .then(data => {
        if (data.workDays) {
          try {
            setGlobalWorkDays(JSON.parse(data.workDays));
          } catch {
            setGlobalWorkDays(DEFAULT_WORK_DAYS);
          }
        }
        if (data.shiftHours) {
          setGlobalShiftHours(data.shiftHours);
        }
        setSettingsLoaded(true);
      })
      .catch(() => {
        setSettingsLoaded(true);
      });
  }, []);

  // Initialize custom schedule state from job data
  useEffect(() => {
    if (job.customWorkDays) {
      try {
        const days = JSON.parse(job.customWorkDays);
        setCustomDays(days);
        setUseCustomSchedule(true);
      } catch {
        setUseCustomSchedule(false);
      }
    } else {
      setUseCustomSchedule(false);
    }
  }, [job.customWorkDays]);

  // Auto-calculate end date when relevant fields change
  const recalculateEndDate = useCallback(
    (
      newStartDate: Date | undefined,
      newDuration: number | null,
      newUnit: string | null,
      newWorkDays: number[]
    ) => {
      if (newStartDate && newDuration && newDuration > 0 && newWorkDays.length > 0) {
        const calculatedEnd = calculateEndDate(
          newStartDate,
          newDuration,
          newUnit || "hours",
          newWorkDays,
          shiftHours
        );
        return calculatedEnd.toISOString();
      }
      return null;
    },
    [shiftHours]
  );

  // Handle start date change
  const handleStartDateChange = (date: Date | undefined) => {
    const newEndDate = recalculateEndDate(
      date,
      job.estimatedDuration,
      job.durationUnit,
      activeWorkDays
    );
    updateJob({
      plannedStartDate: date?.toISOString() || null,
      plannedEndDate: newEndDate,
    });
  };

  // Handle duration change
  const handleDurationChange = (value: string) => {
    const duration = Number(value) || null;
    const newEndDate = recalculateEndDate(
      startDate,
      duration,
      job.durationUnit,
      activeWorkDays
    );
    updateJob({
      estimatedDuration: duration,
      plannedEndDate: newEndDate,
    });
  };

  // Handle unit change
  const handleUnitChange = (value: string) => {
    const newEndDate = recalculateEndDate(
      startDate,
      job.estimatedDuration,
      value,
      activeWorkDays
    );
    updateJob({
      durationUnit: value,
      plannedEndDate: newEndDate,
    });
  };

  // Handle custom schedule toggle
  const handleCustomScheduleToggle = (useCustom: boolean) => {
    setUseCustomSchedule(useCustom);
    
    if (useCustom) {
      // Initialize custom days with global days
      const newCustomDays = [...globalWorkDays];
      setCustomDays(newCustomDays);
      
      const newEndDate = recalculateEndDate(
        startDate,
        job.estimatedDuration,
        job.durationUnit,
        newCustomDays
      );
      updateJob({
        customWorkDays: JSON.stringify(newCustomDays),
        plannedEndDate: newEndDate,
      });
    } else {
      // Clear custom days, use global
      const newEndDate = recalculateEndDate(
        startDate,
        job.estimatedDuration,
        job.durationUnit,
        globalWorkDays
      );
      updateJob({
        customWorkDays: null,
        plannedEndDate: newEndDate,
      });
    }
  };

  // Handle custom day toggle
  const handleCustomDayToggle = (day: number) => {
    const newDays = customDays.includes(day)
      ? customDays.filter(d => d !== day)
      : [...customDays, day].sort((a, b) => a - b);
    
    setCustomDays(newDays);
    
    const newEndDate = recalculateEndDate(
      startDate,
      job.estimatedDuration,
      job.durationUnit,
      newDays
    );
    updateJob({
      customWorkDays: JSON.stringify(newDays),
      plannedEndDate: newEndDate,
    });
  };

  // Calculate work days count for display
  const getWorkDaysCount = () => {
    if (!job.estimatedDuration) return null;
    const unit = job.durationUnit || "hours";
    if (unit === "hours") {
      return Math.ceil(job.estimatedDuration / shiftHours);
    }
    return Math.ceil(job.estimatedDuration);
  };

  const workDaysCount = getWorkDaysCount();

  return (
    <div className="space-y-6">
      {/* Non-work day warning */}
      {startOnNonWorkDay && startDate && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              Start date is on {getDayName(startDate)}
            </p>
            <p className="text-sm text-amber-700 mt-1">
              This is not a scheduled work day. Consider adjusting the date or work schedule.
            </p>
          </div>
        </div>
      )}

      {/* Start Date */}
      <div className="space-y-2">
        <Label>Planned Start Date</Label>
        <DatePicker
          date={startDate}
          onDateChange={handleStartDateChange}
          placeholder="Select start date"
          disabled={!canEdit}
        />
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
              onChange={(e) => handleDurationChange(e.target.value)}
              placeholder="e.g., 36"
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
              onValueChange={handleUnitChange}
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

        {/* Duration hint */}
        {job.estimatedDuration && (job.durationUnit || "hours") === "hours" && (
          <p className="text-xs text-slate-500 mt-2">
            = {workDaysCount} work day{workDaysCount !== 1 ? "s" : ""} at {shiftHours}-hour shifts
          </p>
        )}
      </div>

      {/* Work Schedule */}
      <div className="border-t border-slate-100 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-slate-700">Work Schedule</h3>
          {settingsLoaded && (
            <span className="text-xs text-slate-400">
              Company default: {formatWorkDays(globalWorkDays)}
            </span>
          )}
        </div>

        {/* Schedule type toggle */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleCustomScheduleToggle(false)}
              disabled={!canEdit}
              className={cn(
                "flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all border",
                !useCustomSchedule
                  ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50",
                !canEdit && "opacity-50 cursor-not-allowed"
              )}
            >
              Use Company Default
            </button>
            <button
              type="button"
              onClick={() => handleCustomScheduleToggle(true)}
              disabled={!canEdit}
              className={cn(
                "flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all border flex items-center justify-center gap-2",
                useCustomSchedule
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50",
                !canEdit && "opacity-50 cursor-not-allowed"
              )}
            >
              <Settings2 className="h-4 w-4" />
              Custom for Job
            </button>
          </div>

          {/* Custom day selector */}
          {useCustomSchedule && (
            <div className="p-4 bg-slate-50 rounded-xl space-y-3">
              <Label className="text-xs text-slate-500">Select work days for this job:</Label>
              <div className="flex gap-1.5">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => handleCustomDayToggle(day.value)}
                    disabled={!canEdit}
                    className={cn(
                      "w-10 h-10 rounded-lg text-sm font-medium transition-all",
                      customDays.includes(day.value)
                        ? "bg-blue-500 text-white shadow-sm"
                        : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-100",
                      !canEdit && "opacity-50 cursor-not-allowed"
                    )}
                    title={day.label}
                  >
                    {day.short}
                  </button>
                ))}
              </div>
              {customDays.length === 0 && (
                <p className="text-xs text-amber-600">Select at least one work day</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Schedule Summary */}
      <div
        className={cn(
          "rounded-xl overflow-hidden transition-all duration-200 ease-out",
          (startDate || job.estimatedDuration)
            ? "bg-blue-50 p-4 opacity-100 max-h-96"
            : "bg-transparent p-0 opacity-0 max-h-0"
        )}
      >
        <h4 className="text-sm font-medium text-blue-800 mb-2">Schedule Summary</h4>
        <div className="space-y-1.5 text-sm text-blue-700">
          {startDate && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 flex-shrink-0" />
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
              <Calendar className="h-4 w-4 flex-shrink-0" />
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
              <Clock className="h-4 w-4 flex-shrink-0" />
              <span>
                Duration: {job.estimatedDuration} {job.durationUnit || "hours"}
                {workDaysCount && ` (${workDaysCount} work day${workDaysCount !== 1 ? "s" : ""})`}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 text-blue-600">
            <Settings2 className="h-4 w-4 flex-shrink-0" />
            <span>
              Work days: {formatWorkDays(activeWorkDays)}
              {useCustomSchedule && " (custom)"}
            </span>
          </div>
        </div>
      </div>

      <p className="text-sm text-slate-500">
        End date is calculated automatically based on work schedule and duration.
      </p>
    </div>
  );
}
