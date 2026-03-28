export const STATUS_OPTIONS   = ['All', 'Pending', 'In Progress', 'Completed'];
export const PRIORITY_OPTIONS = ['All', 'Low', 'Medium', 'High'];

export default function FilterBar({ statusFilter, setStatusFilter, priorityFilter, setPriorityFilter, extra }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Status tabs */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-1">
        {STATUS_OPTIONS.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-lg font-bold font-mono tracking-widest transition-all ${
              statusFilter === s
                ? 'bg-indigo-600 dark:bg-cyan-500 text-white dark:text-black shadow-lg'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {s.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Priority tabs */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-1">
        {PRIORITY_OPTIONS.map(p => (
          <button
            key={p}
            onClick={() => setPriorityFilter(p)}
            className={`text-xs px-3 py-1.5 rounded-lg font-bold font-mono tracking-widest transition-all ${
              priorityFilter === p
                ? 'bg-violet-600 dark:bg-purple-500 text-white shadow-lg'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {p.toUpperCase()}
          </button>
        ))}
      </div>

      {extra}
    </div>
  );
}
