import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="py-6 sm:py-8 skeleton-fade-in">
      {/* Header */}
      <div className="px-4 sm:px-6 lg:px-8 mb-6 sm:mb-8">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div>
            <Skeleton className="h-8 w-24 mb-2" />
            <Skeleton className="h-5 w-48" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-9 w-24" />
        </div>

        {/* Kanban Columns */}
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-72 rounded-xl border-2 bg-slate-100 border-slate-200">
              <div className="p-3 border-b border-slate-200/50">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-8 rounded-full" />
                </div>
              </div>
              <div className="p-2 space-y-2 min-h-[200px]">
                {[...Array(1)].map((_, j) => (
                  <Skeleton key={j} className="h-32 w-full rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
