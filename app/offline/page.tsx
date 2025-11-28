import Link from 'next/link';

export const metadata = {
  title: 'Offline - LoopHub',
  description: 'You are currently offline',
};

export default function OfflinePage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">📡</div>
        <h1 className="text-3xl font-bold mb-2">You&apos;re Offline</h1>
        <p className="text-lg mb-6" style={{ color: 'var(--muted)' }}>
          It looks like you&apos;ve lost your internet connection.
          <br />
          Please check your connection and try again.
        </p>
        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary"
          >
            🔄 Try Again
          </button>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Some cached content may still be available
          </p>
          <Link href="/" className="btn btn-secondary">
            🏠 Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
