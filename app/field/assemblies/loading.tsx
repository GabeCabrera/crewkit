export default function FieldAssembliesLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="px-4 py-4 sm:px-6 max-w-2xl mx-auto">
          <div className="h-7 w-40 bg-slate-100 rounded-lg animate-pulse mb-4" />
          <div className="h-12 bg-slate-100 rounded-xl animate-pulse" />
          <div className="flex gap-2 mt-3">
            <div className="h-9 w-16 bg-slate-100 rounded-full animate-pulse" />
            <div className="h-9 w-20 bg-slate-100 rounded-full animate-pulse" />
            <div className="h-9 w-24 bg-slate-100 rounded-full animate-pulse" />
          </div>
        </div>
      </div>

      {/* List */}
      <div className="px-4 py-6 sm:px-6 max-w-2xl mx-auto space-y-3">
        {[...Array(6)].map((_, i) => (
          <div 
            key={i} 
            className="bg-white rounded-2xl p-5 animate-pulse"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-slate-100" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-slate-100 rounded" />
                <div className="h-3 w-24 bg-slate-100 rounded" />
              </div>
              <div className="h-5 w-5 rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
