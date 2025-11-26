import { ThreadSkeleton } from "@/components/LoadingSkeleton";

export default function Loading() {
  return (
    <div className="min-h-screen lg:ml-[var(--sidebar-width)] xl:mr-80">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Breadcrumbs Skeleton */}
        <div className="h-4 w-32 skeleton mb-8" />

        {/* Hero Section Skeleton */}
        <div className="mb-16">
          <div className="h-12 w-3/4 skeleton mb-4" />
          <div className="h-6 w-1/2 skeleton" />
        </div>

        {/* Forums List Skeleton */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg skeleton" />
            <div className="h-8 w-48 skeleton" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card h-32 skeleton" />
            ))}
          </div>
        </section>

        {/* Featured Threads Skeleton */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg skeleton" />
            <div className="h-8 w-64 skeleton" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <ThreadSkeleton key={i} />
            ))}
          </div>
        </section>

        {/* Recent Threads Skeleton */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg skeleton" />
            <div className="h-8 w-56 skeleton" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <ThreadSkeleton key={i} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
