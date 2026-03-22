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
        <div className="min-h-screen flex items-center justify-center p-6 text-center" style={{ background: 'var(--bg-primary)' }}>
          <div className="holo-card p-10 rounded-3xl max-w-lg border-neon-red">
            <h2 className="text-2xl font-bold mb-4 neon-text-red">SYSTEM ANOMALY DETECTED</h2>
            <p className="text-sm text-slate-400 mb-8 font-mono tracking-tight leading-relaxed">
              We encountered an unexpected terminal error. The core system architecture remains stable, but this specific module requires a reboot.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-cyber w-full py-4 text-sm font-bold tracking-[0.2em] uppercase"
            >
              Reinitialize Interface
            </button>
            <p className="mt-6 text-[10px] text-slate-600 font-mono italic">
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
