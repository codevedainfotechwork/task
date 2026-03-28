import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldAlert, ArrowLeft, House } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950 text-white flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.12),transparent_32%),radial-gradient(circle_at_bottom,rgba(59,130,246,0.10),transparent_28%),linear-gradient(180deg,#020617_0%,#0b1020_50%,#020617_100%)]" />
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="relative z-10 max-w-xl w-full rounded-[2rem] border border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl p-8 md:p-10 text-center"
      >
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300 shadow-[0_0_40px_rgba(16,185,129,0.15)]">
          <ShieldAlert size={40} />
        </div>

        <p className="text-[10px] font-mono font-bold tracking-[0.35em] text-emerald-300 uppercase">
          404 // ROUTE NOT FOUND
        </p>
        <h1 className="mt-4 text-4xl md:text-6xl font-black tracking-[0.18em] uppercase text-white">
          Lost Signal
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm md:text-base leading-relaxed text-slate-300">
          The page you requested is not available. Use the controls below to return to a valid workspace.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-xs font-mono font-bold tracking-[0.25em] uppercase text-slate-100 transition hover:bg-white/10"
          >
            <ArrowLeft size={14} />
            Go Back
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-xs font-mono font-bold tracking-[0.25em] uppercase text-black transition hover:bg-emerald-400"
          >
            <House size={14} />
            Home
          </button>
        </div>
      </motion.div>
    </div>
  );
}
