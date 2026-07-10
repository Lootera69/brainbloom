"use client";

import React from "react";
import { ErrorFallback } from "@/components/error-fallback";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.group("ErrorBoundary caught an error");
    console.error("Error:", error);
    console.error("Component stack:", errorInfo.componentStack);
    console.groupEnd();
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex min-h-[60vh] items-center justify-center p-6">
          <ErrorFallback
            error={this.state.error ?? undefined}
            onRetry={this.handleRetry}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
