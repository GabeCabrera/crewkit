import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white -m-4 sm:-m-6 lg:-m-8 skeleton-fade-in">
      {/* Header */}
      <div className="bg-white border-b border-slate-100">
        <div className="px-4 py-6 sm:px-6 sm:py-8 max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div>
              <Skeleton className="h-8 w-40 mb-2" />
              <Skeleton className="h-5 w-32" />
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6 sm:py-8 max-w-2xl mx-auto space-y-6">
        {/* Progress Bar */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="flex gap-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-2 flex-1 rounded-full" />
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div>
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-3">
          <Skeleton className="flex-1 h-12 rounded-xl" />
          <Skeleton className="flex-1 h-12 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
