"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Briefcase } from "lucide-react";
import { JobKanbanBoard } from "@/components/job-planner/job-kanban-board";
import { JobDetailPanel } from "@/components/job-planner/job-detail-panel";

function FieldJobsPageContent() {
  const searchParams = useSearchParams();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
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
    window.history.replaceState({}, "", "/field/jobs");
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
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">My Jobs</h1>
            <p className="text-slate-500 text-sm sm:text-base">View your assigned job plans</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 lg:px-8">
        <JobKanbanBoard
          key={refreshKey}
          onSelectJob={handleSelectJob}
          selectedJobId={selectedJobId}
          viewOnly={true}
        />
      </div>

      {/* Job Detail Panel */}
      {selectedJobId && (
        <JobDetailPanel
          jobId={selectedJobId}
          onClose={handleCloseDetail}
          onUpdate={handleJobUpdated}
          basePath="/field/jobs"
        />
      )}
    </div>
  );
}

export default function FieldJobsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64">Loading...</div>}>
      <FieldJobsPageContent />
    </Suspense>
  );
}
