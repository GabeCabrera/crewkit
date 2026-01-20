"use client";

import { useState } from "react";
import { Loader2, Briefcase, MapPin, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface JobCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (jobId: string) => void;
  basePath: string;
}

export function JobCreationWizard({
  open,
  onOpenChange,
  onSuccess,
}: JobCreationWizardProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [jobName, setJobName] = useState("");
  const [description, setDescription] = useState("");
  const [startPoleId, setStartPoleId] = useState("");
  const [endPoleId, setEndPoleId] = useState("");
  const [totalDistance, setTotalDistance] = useState("");

  const resetForm = () => {
    setStep(1);
    setJobName("");
    setDescription("");
    setStartPoleId("");
    setEndPoleId("");
    setTotalDistance("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!jobName.trim()) {
      setError("Job name is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/job-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobName: jobName.trim(),
          description: description.trim() || undefined,
          startPoleId: startPoleId.trim() || "",
          endPoleId: endPoleId.trim() || "",
          totalDistance: totalDistance ? parseFloat(totalDistance) : 0,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create job");
      }

      const job = await response.json();
      resetForm();
      onOpenChange(false);
      onSuccess(job.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create job");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <Briefcase className="h-4 w-4 text-white" />
            </div>
            Create New Job
          </DialogTitle>
          <DialogDescription>
            Set up a new job plan with basic details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2">
            <div
              className={`h-2 w-8 rounded-full transition-colors ${
                step >= 1 ? "bg-orange-500" : "bg-slate-200"
              }`}
            />
            <div
              className={`h-2 w-8 rounded-full transition-colors ${
                step >= 2 ? "bg-orange-500" : "bg-slate-200"
              }`}
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-4">
                <FileText className="h-4 w-4" />
                Basic Information
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobName">Job Name *</Label>
                <Input
                  id="jobName"
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                  placeholder="e.g., Main Street Fiber Install"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description of the job..."
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 2: Route Info */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-4">
                <MapPin className="h-4 w-4" />
                Route Details (Optional)
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startPoleId">Start Pole ID</Label>
                  <Input
                    id="startPoleId"
                    value={startPoleId}
                    onChange={(e) => setStartPoleId(e.target.value)}
                    placeholder="e.g., P001"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endPoleId">End Pole ID</Label>
                  <Input
                    id="endPoleId"
                    value={endPoleId}
                    onChange={(e) => setEndPoleId(e.target.value)}
                    placeholder="e.g., P050"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="totalDistance">Estimated Distance (ft)</Label>
                <Input
                  id="totalDistance"
                  type="number"
                  value={totalDistance}
                  onChange={(e) => setTotalDistance(e.target.value)}
                  placeholder="e.g., 5000"
                  min="0"
                />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between gap-3">
          {step > 1 ? (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              disabled={isSubmitting}
            >
              Back
            </Button>
          ) : (
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
          )}

          {step < 2 ? (
            <Button
              onClick={() => {
                if (!jobName.trim()) {
                  setError("Job name is required");
                  return;
                }
                setError(null);
                setStep(2);
              }}
              className="bg-orange-500 hover:bg-orange-600"
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Job"
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
