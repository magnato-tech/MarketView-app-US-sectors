import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  title?: string;
  defaultMessage?: string;
  retryLabel?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("ErrorBoundary caught an error", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="bg-slate-900/50 border border-rose-500/20 rounded-xl p-6 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white">{this.props.title || 'Noe gikk galt / Something went wrong'}</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            {this.state.error?.message || this.props.defaultMessage || 'En uventet feil oppstod i denne komponenten.'}
          </p>
          <button
            type="button"
            className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            {this.props.retryLabel || 'Prøv igjen / Retry'}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
