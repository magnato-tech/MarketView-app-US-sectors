import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center p-8">
          <div className="max-w-lg text-center space-y-4">
            <h1 className="text-xl font-bold text-white">Noe gikk galt</h1>
            <p className="text-slate-400 text-sm break-words">{this.state.error.message}</p>
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-sm font-medium hover:bg-slate-700"
              onClick={() => window.location.reload()}
            >
              Last siden på nytt
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
