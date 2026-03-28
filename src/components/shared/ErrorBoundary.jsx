import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 text-center bg-slate-50 dark:bg-[#03060a]">
          <div className="holo-card p-10 rounded-3xl max-w-lg border border-red-500/20 bg-white dark:bg-[#0a0a0a]/60 shadow-2xl">
            <h2 className="text-2xl font-bold mb-4 text-red-600 dark:text-red-400 font-mono tracking-widest uppercase">// SYSTEM ANOMALY DETECTED</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-8 font-mono tracking-tight leading-relaxed font-bold uppercase">
              We encountered an unexpected terminal error. The core system architecture remains stable, but this specific module requires a reboot.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 text-sm font-bold tracking-[0.2em] uppercase bg-indigo-600 dark:bg-cyan-500 text-white dark:text-black rounded-2xl shadow-lg hover:opacity-90 transition-all font-mono"
            >
              Reinitialize Interface
            </button>
            <p className="mt-8 text-[10px] text-slate-400 dark:text-slate-600 font-mono italic font-bold uppercase">
              Error Hash: {this.state.error?.message || 'NULL_PTR_EXC'}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
