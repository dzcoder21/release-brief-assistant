import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error('UI error:', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6 text-center">
        <h2 className="text-lg font-semibold">This screen hit an unexpected error</h2>
        <p className="max-w-sm text-sm text-muted">Your data is safe. Reload the page, or go back and try again.</p>
        <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white dark:text-bg" onClick={() => window.location.reload()}>Reload</button>
      </div>
    );
  }
}
