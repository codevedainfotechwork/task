export const STATUS_OPTIONS   = ['All', 'Pending', 'In Progress', 'Completed'];
export const PRIORITY_OPTIONS = ['All', 'Low', 'Medium', 'High'];

export default function FilterBar({ statusFilter, setStatusFilter, priorityFilter, setPriorityFilter, extra }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Status tabs */}
      <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
        {STATUS_OPTIONS.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
              statusFilter === s
                ? 'bg-brand-500 text-white shadow-glow-brand'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Priority tabs */}
      <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
        {PRIORITY_OPTIONS.map(p => (
          <button
            key={p}
            onClick={() => setPriorityFilter(p)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
              priorityFilter === p
                ? 'bg-purple-600 text-white shadow-glow-purple'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {extra}
    </div>
  );
}
