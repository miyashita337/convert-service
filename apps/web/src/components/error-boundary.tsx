"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Sentry } from "@/lib/sentry";

/* ---------- props / state ---------- */

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional fallback UI. When omitted the default error message is shown. */
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/* ---------- GlobalErrorBoundary ---------- */

/**
 * Top-level error boundary that catches any unhandled React error,
 * reports it to Sentry, and shows a friendly recovery message.
 */
export class GlobalErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    Sentry.captureException(error, {
      extra: { componentStack: errorInfo.componentStack },
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
          <h2 className="text-xl font-semibold">
            Something went wrong
          </h2>
          <p className="text-muted-foreground max-w-md">
            An unexpected error occurred. Please try reloading the page. If the
            problem persists, contact support.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-2 rounded-lg bg-primary px-6 py-2 text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Reload page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/* ---------- ConversionErrorBoundary ---------- */

interface ConversionErrorBoundaryState {
  hasError: boolean;
}

/**
 * Error boundary scoped to the file-conversion flow.
 *
 * Unlike the global boundary it offers a "Try again" action that resets
 * the boundary state so the user can retry without a full page reload.
 */
export class ConversionErrorBoundary extends Component<
  ErrorBoundaryProps,
  ConversionErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ConversionErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    Sentry.captureException(error, {
      tags: { flow: "conversion" },
      extra: { componentStack: errorInfo.componentStack },
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <h3 className="text-lg font-semibold text-destructive">
            Conversion error
          </h3>
          <p className="text-muted-foreground max-w-md">
            Something went wrong during the conversion. Please try again or
            select a different file.
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-2 rounded-lg bg-primary px-6 py-2 text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
