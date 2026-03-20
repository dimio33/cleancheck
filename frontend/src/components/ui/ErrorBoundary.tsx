import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('ErrorBoundary caught:', error);
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
          <button
            onClick={() => {
              this.setState({ hasError: false });
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
