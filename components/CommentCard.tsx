interface Comment {
  id: string;
  content: string;
  createdAt: string;
}

interface CommentCardProps {
  comment: Comment;
}

export default function CommentCard({ comment }: CommentCardProps) {
  const date = new Date(comment.createdAt).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="card">
      <div className="text-xs mb-2" style={{ color: "var(--muted)" }}>
        {date}
      </div>
      <p className="whitespace-pre-wrap">{comment.content}</p>
    </div>
  );
}
