"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Briefcase, Loader2 } from "lucide-react";
import { JobKanbanBoard } from "@/components/job-planner/job-kanban-board";
import { JobDetailPanel } from "@/components/job-planner/job-detail-panel";

function JobsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
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

  const handleCreateNew = async () => {
    setIsCreating(true);
    try {
      const res = await fetch("/api/job-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobName: `New Job - ${new Date().toLocaleDateString()}`,
          startPoleId: "TBD",
          endPoleId: "TBD",
          totalDistance: 0,
          strandFootage: 0,
          fiberFootage: 0,
        }),
      });
      
      if (res.ok) {
        const job = await res.json();
        router.push(`/admin/jobs/${job.id}`);
      } else {
        console.error("Failed to create job");
        setIsCreating(false);
      }
    } catch (error) {
      console.error("Error creating job:", error);
      setIsCreating(false);
    }
  };

  const handleJobUpdated = () => {
    setRefreshKey((prev) => prev + 1);
  };

  if (isCreating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          <p className="text-slate-500">Creating new job...</p>
        </div>
      </div>
    );
  }

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
          onCreateNew={handleCreateNew}
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
          basePath="/admin/jobs"
        />
      )}
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
