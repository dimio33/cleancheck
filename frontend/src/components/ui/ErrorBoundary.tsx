import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; errorMessage: string; }

const API_URL = import.meta.env.VITE_API_URL || '';

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMessage: `${error.name}: ${error.message}\n${error.stack || ''}` };
  }

  componentDidCatch(error: Error) {
    console.error('ErrorBoundary caught:', error);
    // Send to remote logger
    try {
      fetch(`${API_URL}/client-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 'fatal',
          message: `ErrorBoundary: ${error.name}: ${error.message}`,
          meta: { stack: error.stack, url: window.location.href },
        }),
      }).catch(() => {});
    } catch {}
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mb-4">
            <span className="text-2xl">!</span>
          </div>
          <h2 className="text-lg font-semibold text-stone-800 mb-2">Oops!</h2>
          <p className="text-sm text-stone-500 mb-4">Something went wrong.</p>
          <pre className="text-[10px] text-left text-red-600 bg-red-50 p-3 rounded-lg mb-4 max-w-full overflow-auto max-h-40 whitespace-pre-wrap">
            {this.state.errorMessage}
          </pre>
          <button
            onClick={() => {
              this.setState({ hasError: false, errorMessage: '' });
              window.location.href = '/';
            }}
            className="px-6 py-2.5 rounded-xl bg-teal-500 text-white text-sm font-medium"
          >
            Back to Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
