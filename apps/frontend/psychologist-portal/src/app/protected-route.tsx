import React from 'react';

/**
 * PLACEHOLDER.
 *
 * In later phases, this component will enforce JWT-based authorization.
 * For Phase 1, it renders children without any authentication check.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
