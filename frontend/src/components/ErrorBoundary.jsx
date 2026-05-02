import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, err: null };
  }
  static getDerivedStateFromError(err) {
    return { hasError: true, err };
  }
  componentDidCatch(err, info) {
    // Log to console; swap to Sentry if desired
    // eslint-disable-next-line no-console
    console.error("UI error:", err, info);
  }
  reset = () => {
    this.setState({ hasError: false, err: null });
    window.location.href = "/";
  };
  render() {
    if (this.state.hasError) {
      return (
        <div data-testid="error-boundary" className="min-h-[60vh] flex items-center justify-center px-6 text-center">
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-terra-600 mb-3">Something went wrong</div>
            <h1 className="font-serif text-4xl md:text-5xl mb-4">A small hiccup.</h1>
            <p className="text-ink-700 max-w-md mx-auto mb-8">
              Please refresh the page or return home. We've logged the issue.
            </p>
            <button onClick={this.reset} className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-ink-900 text-bone-50 hover:bg-terra-600 text-sm uppercase tracking-[0.25em]">
              Return home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
