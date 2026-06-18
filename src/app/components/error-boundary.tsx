import { Component, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Top-level error boundary. Catches render/runtime errors anywhere in the tree
 * and shows a recoverable fallback instead of a blank white screen.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Surface the full error for debugging in the console.
    console.error('[AirBooks] Uncaught render error:', error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleTryAgain = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFB] dark:bg-[#0A1628] px-6">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-[#1A2332] dark:text-[#F1F5F9] mb-2">
              Something went wrong
            </h1>
            <p className="text-[#64748B] dark:text-[#94A3B8] mb-6">
              The app hit an unexpected error. You can try again, or reload the page if
              the problem persists.
            </p>

            {this.state.error.message && (
              <pre className="text-left text-xs text-red-600 dark:text-red-400 bg-red-500/5 border border-red-500/15 rounded-xl p-3 mb-6 overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleTryAgain}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-br from-[#0F6FFF] to-[#0EA5E9] text-white text-sm font-medium shadow-lg shadow-[#0F6FFF]/20 hover:shadow-xl hover:shadow-[#0F6FFF]/30 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                Try again
              </button>
              <button
                onClick={this.handleReload}
                className="px-5 py-2.5 rounded-xl bg-[#F1F5F9] dark:bg-[#1E293B] text-[#1A2332] dark:text-[#F1F5F9] text-sm font-medium hover:bg-[#E8F2FF] dark:hover:bg-[#1E3A5F] transition-all"
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
