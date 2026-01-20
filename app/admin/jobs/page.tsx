"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Briefcase } from "lucide-react";
import { JobKanbanBoard } from "@/components/job-planner/job-kanban-board";
import { JobDetailPanel } from "@/components/job-planner/job-detail-panel";
import { JobPlannerWizard } from "@/components/job-planner/job-planner-wizard";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

function JobsPageContent() {
  const searchParams = useSearchParams();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Check for job query parameter
  useEffect(() => {
    const jobId = searchParams.get("job");
    if (jobId) {
      setSelectedJobId(jobId);
    }
  }, [searchParams]);

  const handleSelectJob = (job: { id: string }) => {
    setSelectedJobId(job.id);
  };

  const handleCloseDetail = () => {
    setSelectedJobId(null);
    // Update URL without the job parameter
    window.history.replaceState({}, "", "/admin/jobs");
  };

  const handleJobCreated = (jobId: string) => {
    setShowCreateWizard(false);
    setSelectedJobId(jobId);
    setRefreshKey((prev) => prev + 1);
  };

  const handleJobUpdated = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white -m-4 sm:-m-6 lg:-m-8">
      {/* Header */}
      <div className="bg-white border-b border-slate-100">
        <div className="px-4 py-6 sm:px-6 sm:py-8 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Jobs</h1>
              <p className="text-slate-500 text-sm sm:text-base">Manage and track job plans</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 sm:px-6 sm:py-8 max-w-7xl mx-auto">
        <JobKanbanBoard
          key={refreshKey}
          onCreateNew={() => setShowCreateWizard(true)}
          onSelectJob={handleSelectJob}
          selectedJobId={selectedJobId}
        />
      </div>

      {/* Job Detail Panel */}
      {selectedJobId && (
        <JobDetailPanel
          jobId={selectedJobId}
          onClose={handleCloseDetail}
          onUpdate={handleJobUpdated}
        />
      )}

      {/* Create Job Wizard Dialog */}
      <Dialog open={showCreateWizard} onOpenChange={setShowCreateWizard}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          <JobPlannerWizard
            onComplete={handleJobCreated}
            redirectPath="/admin/jobs"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminJobsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64">Loading...</div>}>
      <JobsPageContent />
    </Suspense>
  );
}
