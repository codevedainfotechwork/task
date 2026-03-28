export default function ParticleField() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.12),transparent_30%),radial-gradient(circle_at_80%_30%,rgba(14,165,233,0.10),transparent_28%),radial-gradient(circle_at_50%_80%,rgba(168,85,247,0.10),transparent_30%)]" />
      <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.16) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      <div className="absolute -top-20 left-1/4 w-72 h-72 rounded-full blur-3xl bg-indigo-500/10 animate-pulse" />
      <div className="absolute top-1/3 right-1/4 w-80 h-80 rounded-full blur-3xl bg-cyan-500/10 animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full blur-[140px] bg-purple-500/10" />
    </div>
  );
}
