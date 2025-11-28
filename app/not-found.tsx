import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="card max-w-md text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-3xl font-bold mb-2">404</h1>
        <h2 className="text-xl mb-4">Page Not Found</h2>
        <p className="mb-6" style={{ color: 'var(--muted)' }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/" className="btn btn-primary">
            🏠 Go Home
          </Link>
          <Link href="/search" className="btn btn-secondary">
            🔎 Search
          </Link>
        </div>
      </div>
    </div>
  );
}
