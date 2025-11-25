"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CommentCard from "@/components/CommentCard";
import SimpleForm from "@/components/SimpleForm";

import { Thread, Comment, Forum } from "@/lib/supabase";

interface ThreadData {
  thread: Thread & { forum: Forum };
  comments: Comment[];
}

export default function ThreadPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<ThreadData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/threads/${params.id}/comments`);
      if (!res.ok) throw new Error("Failed to fetch thread");
      const threadData = await res.json();
      setData(threadData);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommentSubmit = async (formData: Record<string, string>) => {
    const res = await fetch(`/api/threads/${params.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to post comment");
    }

    await fetchData();
  };

  if (isLoading) {
    return (
      <div className="card text-center py-12">
        <p style={{ color: "var(--muted)" }}>Loading...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card text-center py-12">
        <p style={{ color: "var(--muted)" }}>Thread not found</p>
      </div>
    );
  }

  const { thread, comments } = data;
  const date = new Date(thread.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div>
      <div className="mb-4">
        <Link
          href={`/forum/${thread.forum.slug}`}
          className="text-sm"
          style={{ color: "var(--accent)" }}
        >
          ← Back to {thread.forum.name}
        </Link>
      </div>

      <div className="card mb-8">
        <h1 className="text-3xl font-bold mb-3">{thread.title}</h1>
        <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
          Posted on {date}
        </p>
        <p className="whitespace-pre-wrap text-lg">{thread.content}</p>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">
          Comments ({comments.length})
        </h2>

        {comments.length === 0 ? (
          <div className="card text-center py-8">
            <p style={{ color: "var(--muted)" }}>
              No comments yet. Be the first to comment!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <CommentCard key={comment.id} comment={comment} />
            ))}
          </div>
        )}
      </div>

      <div className="card max-w-2xl">
        <h3 className="text-xl font-semibold mb-4">Add a Comment</h3>
        <SimpleForm
          fields={[
            {
              name: "content",
              label: "Your Comment",
              type: "textarea",
              placeholder: "Share your thoughts...",
              required: true,
              maxLength: 10000,
            },
          ]}
          onSubmit={handleCommentSubmit}
          submitText="Post Comment"
        />
      </div>
    </div>
  );
}
