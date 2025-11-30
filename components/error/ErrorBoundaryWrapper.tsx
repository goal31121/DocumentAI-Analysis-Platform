'use client';

import { ErrorBoundary } from './ErrorBoundary';

interface ErrorBoundaryWrapperProps {
  children: React.ReactNode;
}

/**
 * Client-side wrapper for ErrorBoundary
 */
export function ErrorBoundaryWrapper({ children }: ErrorBoundaryWrapperProps) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
