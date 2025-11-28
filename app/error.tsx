'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="card max-w-md text-center">
        <div className="text-6xl mb-4">😵</div>
        <h1 className="text-2xl font-bold mb-2">Something went wrong!</h1>
        <p className="mb-4" style={{ color: 'var(--muted)' }}>
          We apologize for the inconvenience. An unexpected error has occurred.
        </p>
        
        {process.env.NODE_ENV === 'development' && (
          <details className="text-left mb-4 p-3 rounded text-sm" style={{ background: 'var(--hover-bg)' }}>
            <summary className="cursor-pointer font-medium text-red-500">
              Error Details
            </summary>
            <pre className="mt-2 text-xs overflow-auto">
              {error.message}
              {error.digest && `\nDigest: ${error.digest}`}
            </pre>
          </details>
        )}
        
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="btn btn-primary"
          >
            🔄 Try Again
          </button>
          <Link href="/" className="btn btn-secondary">
            🏠 Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
