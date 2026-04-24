'use client';

import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallbackLabel?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[ErrorBoundary] ${this.props.fallbackLabel || 'Component'} crashed:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center gap-3">
          <AlertTriangle size={24} className="text-amber-500" />
          <div>
            <p className="text-sm font-medium text-text-primary">
              {this.props.fallbackLabel || 'Something'} encountered an error
            </p>
            <p className="text-xs text-text-muted mt-1 max-w-xs">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
          >
            <RotateCcw size={12} />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
