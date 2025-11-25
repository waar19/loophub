import { Comment } from "@/lib/supabase";
import ReportButton from "@/components/ReportButton";

interface CommentCardProps {
  comment: Comment;
}

export default function CommentCard({ comment }: CommentCardProps) {
  const date = new Date(comment.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="card">
      <div
        className="flex items-center gap-2 text-xs mb-2"
        style={{ color: "var(--muted)" }}
      >
        {comment.profile?.username && (
          <>
            <span className="font-medium">{comment.profile.username}</span>
            <span>•</span>
          </>
        )}
        <span>{date}</span>
        <ReportButton contentType="comment" contentId={comment.id} />
      </div>
      <p className="whitespace-pre-wrap">{comment.content}</p>
    </div>
  );
}
