export default function PanelLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="h-8 w-48 bg-slate-800 rounded-lg mb-2"></div>
          <div className="h-4 w-72 bg-slate-800 rounded-lg"></div>
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-24 bg-slate-800 rounded-xl"></div>
          <div className="h-10 w-32 bg-slate-800 rounded-xl"></div>
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
            <div className="h-4 w-24 bg-slate-800 rounded mb-4"></div>
            <div className="h-8 w-16 bg-slate-800 rounded"></div>
          </div>
        ))}
      </div>

      {/* Content Area Skeleton */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <div className="h-6 w-32 bg-slate-800 rounded"></div>
          <div className="h-10 w-40 bg-slate-800 rounded-xl"></div>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 w-full bg-slate-800 rounded-xl"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
