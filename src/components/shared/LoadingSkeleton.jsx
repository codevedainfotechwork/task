import { motion } from 'framer-motion';

export const TaskSkeleton = () => (
  <div className="relative rounded-2xl p-5 overflow-hidden border border-white/5 bg-white/5">
    <div className="h-4 w-24 bg-white/10 rounded-lg mb-4 skeleton" />
    <div className="h-6 w-full bg-white/10 rounded-lg mb-3 skeleton" />
    <div className="h-4 w-3/4 bg-white/10 rounded-lg mb-6 skeleton" />
    <div className="flex justify-between items-center pt-4 border-t border-white/5">
      <div className="h-3 w-20 bg-white/10 rounded skeleton" />
      <div className="h-6 w-16 bg-white/10 rounded-full skeleton" />
    </div>
  </div>
);

export const DashboardSkeleton = () => (
  <div className="space-y-8 animate-pulse">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-32 rounded-3xl bg-white/5 border border-white/5 skeleton" />
      ))}
    </div>
    <div className="space-y-4">
      <div className="h-8 w-48 bg-white/10 rounded-xl skeleton" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map(i => <TaskSkeleton key={i} />)}
      </div>
    </div>
  </div>
);
