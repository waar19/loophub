export default function LoadingSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="h-6 rounded w-3/4 mb-4" style={{ backgroundColor: "var(--border)" }}></div>
      <div className="space-y-2 mb-4">
        <div className="h-4 rounded w-full" style={{ backgroundColor: "var(--border)" }}></div>
        <div className="h-4 rounded w-5/6" style={{ backgroundColor: "var(--border)" }}></div>
        <div className="h-4 rounded w-4/6" style={{ backgroundColor: "var(--border)" }}></div>
      </div>
      <div className="flex items-center gap-4">
        <div className="h-4 rounded w-24" style={{ backgroundColor: "var(--border)" }}></div>
        <div className="h-4 rounded w-16" style={{ backgroundColor: "var(--border)" }}></div>
      </div>
    </div>
  );
}

export function CommentSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-4 rounded w-32" style={{ backgroundColor: "var(--border)" }}></div>
        <div className="h-4 rounded w-20" style={{ backgroundColor: "var(--border)" }}></div>
      </div>
      <div className="space-y-2">
        <div className="h-4 rounded w-full" style={{ backgroundColor: "var(--border)" }}></div>
        <div className="h-4 rounded w-5/6" style={{ backgroundColor: "var(--border)" }}></div>
        <div className="h-4 rounded w-4/6" style={{ backgroundColor: "var(--border)" }}></div>
      </div>
    </div>
  );
}

