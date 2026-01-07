export default function AdminDashboardLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white -m-4 sm:-m-6 lg:-m-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="bg-white border-b border-slate-100">
        <div className="px-4 py-4 sm:px-6 sm:py-5 max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-slate-200" />
              <div>
                <div className="h-6 w-40 bg-slate-200 rounded" />
                <div className="h-4 w-24 bg-slate-100 rounded mt-1 hidden sm:block" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-44 bg-slate-100 rounded-md" />
              <div className="h-10 w-10 bg-slate-100 rounded-md" />
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6 sm:py-8 max-w-7xl mx-auto space-y-8">
        {/* Hero KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-2xl p-5 shadow-sm bg-slate-100 h-28" />
          ))}
        </div>

        {/* Trends + Metrics Section */}
        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 bg-slate-100 rounded-2xl h-80" />
          <div className="lg:col-span-3 grid md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-slate-100 rounded-2xl h-64" />
            ))}
          </div>
        </div>

        {/* Productivity Section */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-slate-100 rounded-2xl h-48" />
          <div className="bg-slate-100 rounded-2xl h-48" />
        </div>

        {/* Recent Activity */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-100 rounded-2xl h-64" />
          <div className="bg-slate-100 rounded-2xl h-64" />
        </div>

        {/* Quick Actions */}
        <div>
          <div className="h-6 w-32 bg-slate-200 rounded mb-4" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-slate-100 rounded-2xl h-28" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
