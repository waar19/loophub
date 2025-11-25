export default function LoadingSkeleton() {
  return (
    <div className="card">
      <div className="skeleton h-6 w-3/4 mb-4" />
      <div className="space-y-2 mb-4">
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-5/6" />
        <div className="skeleton h-4 w-4/6" />
      </div>
      <div className="flex items-center gap-4">
        <div className="skeleton h-4 w-24" />
        <div className="skeleton h-4 w-16" />
      </div>
    </div>
  );
}

export function CommentSkeleton() {
  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-4">
        <div className="skeleton w-8 h-8 rounded-full shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="skeleton h-4 w-32" />
          <div className="skeleton h-3 w-20" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-5/6" />
        <div className="skeleton h-4 w-4/6" />
      </div>
    </div>
  );
}
