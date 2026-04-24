'use client';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  // Authentication routing is now fully handled by middleware.ts on the server.
  // We no longer need to do client-side rendering blocks, which were causing
  // hydration mismatch errors and flashes of loading spinners.
  return <>{children}</>;
}
