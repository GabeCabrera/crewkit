import { JobLifecycleView } from "@/components/job-planner/job-lifecycle-view";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminJobPage({ params }: PageProps) {
  const { id } = await params;
  
  return <JobLifecycleView jobId={id} backUrl="/admin/jobs" />;
}
