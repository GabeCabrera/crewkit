"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Briefcase } from "lucide-react";
import { JobKanbanBoard } from "@/components/job-planner/job-kanban-board";
import { JobDetailPanel } from "@/components/job-planner/job-detail-panel";
import { JobCreationWizard } from "@/components/job-planner/job-creation-wizard";

function JobsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
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
    window.history.replaceState({}, "", "/manager/jobs");
  };

  const handleCreateNew = () => {
    setWizardOpen(true);
  };

  const handleJobCreated = (jobId: string) => {
    // Refresh the kanban board and navigate to the new job
    setRefreshKey((prev) => prev + 1);
    router.push(`/manager/jobs/${jobId}`);
  };

  const handleJobUpdated = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="py-6 sm:py-8">
      {/* Header */}
      <div className="px-4 sm:px-6 lg:px-8 mb-6 sm:mb-8">
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

      {/* Content */}
      <div className="px-4 sm:px-6 lg:px-8">
        <JobKanbanBoard
          key={refreshKey}
          onCreateNew={handleCreateNew}
          onSelectJob={handleSelectJob}
          selectedJobId={selectedJobId}
        />
      </div>

      {/* Job Detail Panel - Sheet handles open/close state */}
      <JobDetailPanel
        jobId={selectedJobId}
        onClose={handleCloseDetail}
        onUpdate={handleJobUpdated}
        basePath="/manager/jobs"
      />

      {/* Job Creation Wizard */}
      <JobCreationWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onSuccess={handleJobCreated}
        basePath="/manager/jobs"
      />
    </div>
  );
}

export default function ManagerJobsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64">Loading...</div>}>
      <JobsPageContent />
    </Suspense>
  );
}
