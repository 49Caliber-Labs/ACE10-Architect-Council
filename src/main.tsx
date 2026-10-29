import React, { Component, ErrorInfo, ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class Ace10ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || String(error),
    };
  }

  public componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ACE-10 Runtime Fault Guard]', error, info.componentStack);
  }

  private handleHardReset = () => {
    try {
      localStorage.removeItem('ace10_studio_state_v1');
      localStorage.removeItem('ace10_live_runner_config_v3');
    } catch {
      // Ignore storage access errors
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070b14] text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-lg w-full rounded-2xl bg-[#0b1120] border-2 border-rose-500/60 p-6 space-y-4 shadow-2xl">
            <div className="text-xs font-mono uppercase font-extrabold text-rose-400">
              ACE-10 FAULT CONTAINMENT BOUNDARY
            </div>
            <h1 className="font-display font-bold text-lg text-white">
              Runtime State Discontinuity Contained
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              An unexpected browser state or corrupted cache payload was intercepted before crashing the Studio session:
            </p>
            <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-rose-300 overflow-x-auto whitespace-pre-wrap">
              {this.state.errorMessage}
            </pre>
            <button
              type="button"
              onClick={this.handleHardReset}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs cursor-pointer"
            >
              Purge Corrupted Local Cache &amp; Restore Flagship Council
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('[ACE-10 Boot Fault] Missing #root mount element in index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <Ace10ErrorBoundary>
      <App />
    </Ace10ErrorBoundary>
  </StrictMode>
);
