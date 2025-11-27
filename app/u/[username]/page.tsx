import { createClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import Link from "next/link";
import Tooltip from "@/components/Tooltip";
import { Metadata } from "next";

interface UserProfilePageProps {
  params: Promise<{
    username: string;
  }>;
}

// Generate dynamic metadata for OG images
export async function generateMetadata({
  params,
}: UserProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, karma, level")
    .eq("username", username)
    .single();

  if (!profile) {
    return { title: "Usuario no encontrado - Loophub" };
  }

  // Get counts
  const [{ count: threadCount }, { count: commentCount }] = await Promise.all([
    supabase
      .from("threads")
      .select("*", { count: "exact", head: true })
      .eq("user_id", profile.id),
    supabase
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("user_id", profile.id),
  ]);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  const ogParams = new URLSearchParams({
    type: "profile",
    title: profile.username,
    karma: String(profile.karma || 0),
    level: String(profile.level || 0),
    threads: String(threadCount || 0),
    comments: String(commentCount || 0),
  });

  return {
    title: `@${profile.username} - Loophub`,
    description: `Perfil de ${profile.username} en Loophub. Nivel ${profile.level || 0} con ${profile.karma || 0} karma.`,
    openGraph: {
      title: `@${profile.username} - Loophub`,
      description: `Perfil de ${profile.username} en Loophub`,
      images: [`${baseUrl}/api/og?${ogParams.toString()}`],
    },
    twitter: {
      card: "summary_large_image",
      title: `@${profile.username} - Loophub`,
      images: [`${baseUrl}/api/og?${ogParams.toString()}`],
    },
  };
}

export default async function UserProfilePage({
  params,
}: UserProfilePageProps) {
  const { username } = await params;
  const supabase = await createClient();

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (profileError || !profile) {
    notFound();
  }

  // Get user's threads
  const { data: threads } = await supabase
    .from("threads")
    .select(
      `
      id,
      title,
      content,
      like_count,
      upvote_count,
      downvote_count,
      score,
      created_at,
      forums(name, slug)
    `
    )
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(10);

  // Get user's comments
  const { data: comments } = await supabase
    .from("comments")
    .select(
      `
      id,
      content,
      like_count,
      upvote_count,
      downvote_count,
      score,
      created_at,
      thread:threads(id, title)
    `
    )
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const threadCount = threads?.length || 0;
  const commentCount = comments?.length || 0;

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Profile Header */}
      <div className="card mb-8 p-8">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold shrink-0"
            style={{
              background: "var(--brand-light)",
              color: "var(--brand-dark)",
            }}
          >
            {profile.username.charAt(0).toUpperCase()}
          </div>

          {/* User Info */}
          <div className="flex-1">
            <h1
              className="text-3xl font-bold mb-2"
              style={{ color: "var(--foreground)" }}
            >
              {profile.username}
              {profile.is_admin && (
                <Tooltip content="Administrador" position="top">
                  <span
                    className="ml-2 text-xs px-2 py-1 rounded-full font-normal"
                    style={{
                      background: "var(--brand)",
                      color: "white",
                    }}
                  >
                    ADMIN
                  </span>
                </Tooltip>
              )}
            </h1>

            {/* Bio */}
            {profile.bio && (
              <p className="mb-3" style={{ color: "var(--muted)" }}>
                {profile.bio}
              </p>
            )}

            {/* Location and Website */}
            <div className="flex items-center gap-4 mb-4 flex-wrap">
              {profile.location && (
                <div className="flex items-center gap-1 text-sm">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    style={{ color: "var(--muted)" }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span style={{ color: "var(--muted)" }}>
                    {profile.location}
                  </span>
                </div>
              )}

              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm hover:underline"
                  style={{ color: "var(--brand)" }}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                  {profile.website.replace(/^https?:\/\//, "")}
                </a>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6">
              <Tooltip content="Reputación ganada por likes" position="top">
                <div className="flex items-center gap-2">
                  <div
                    className="px-3 py-1.5 rounded-lg font-bold"
                    style={{
                      background: "var(--brand-light)",
                      color: "var(--brand-dark)",
                    }}
                  >
                    ⭐ {profile.reputation} Karma
                  </div>
                </div>
              </Tooltip>

              <div className="text-sm" style={{ color: "var(--muted)" }}>
                {threadCount} thread{threadCount !== 1 ? "s" : ""} •{" "}
                {commentCount} comentario{commentCount !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div
          className="flex gap-4 border-b pb-2"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            className="px-4 py-2 font-semibold border-b-2"
            style={{
              borderColor: "var(--brand)",
              color: "var(--brand)",
            }}
          >
            Threads
          </button>
        </div>
      </div>

      {/* User's Threads */}
      <div className="space-y-6">
        {threads && threads.length > 0 ? (
          threads.map((thread) => (
            <Link
              key={thread.id}
              href={`/thread/${thread.id}`}
              className="card card-interactive block p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3
                    className="font-semibold mb-2 line-clamp-2"
                    style={{ color: "var(--foreground)" }}
                  >
                    {thread.title}
                  </h3>

                  <div className="flex items-center gap-3 flex-wrap text-sm">
                    {thread.forums &&
                      Array.isArray(thread.forums) &&
                      thread.forums[0] && (
                        <span
                          className="badge text-xs"
                          style={{
                            background: "var(--brand-light)",
                            color: "var(--brand-dark)",
                          }}
                        >
                          {thread.forums[0].name}
                        </span>
                      )}

                    <span style={{ color: "var(--muted)" }}>
                      {new Date(thread.created_at).toLocaleDateString("es-ES", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>

                    {thread.score !== undefined &&
                      thread.score !== null &&
                      thread.score !== 0 && (
                        <div className="flex items-center gap-1">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            style={{
                              color:
                                thread.score > 0
                                  ? "var(--success)"
                                  : thread.score < 0
                                  ? "var(--danger)"
                                  : "var(--muted)",
                            }}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d={
                                thread.score > 0
                                  ? "M5 15l7-7 7 7"
                                  : "M19 9l-7 7-7-7"
                              }
                            />
                          </svg>
                          <span
                            style={{
                              color:
                                thread.score > 0
                                  ? "var(--success)"
                                  : thread.score < 0
                                  ? "var(--danger)"
                                  : "var(--muted)",
                            }}
                          >
                            {thread.score}
                          </span>
                        </div>
                      )}
                  </div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div
            className="card text-center py-8"
            style={{ color: "var(--muted)" }}
          >
            <p>Este usuario no ha creado ningún thread todavía.</p>
          </div>
        )}
      </div>

      {/* User's Comments Section */}
      {comments && comments.length > 0 && (
        <>
          <div className="mt-8 mb-4">
            <h2
              className="text-xl font-bold"
              style={{ color: "var(--foreground)" }}
            >
              Comentarios Recientes
            </h2>
          </div>
          <div className="space-y-6">
            {comments.map((comment) => (
              <div key={comment.id} className="card p-6">
                <div className="mb-2">
                  {comment.thread &&
                    Array.isArray(comment.thread) &&
                    comment.thread[0] && (
                      <Link
                        href={`/thread/${comment.thread[0].id}`}
                        className="text-sm font-medium hover:underline"
                        style={{ color: "var(--brand)" }}
                      >
                        Re: {comment.thread[0].title}
                      </Link>
                    )}
                </div>
                <p
                  className="text-sm mb-2 line-clamp-3"
                  style={{ color: "var(--muted)" }}
                >
                  {comment.content.substring(0, 200)}
                  {comment.content.length > 200 ? "..." : ""}
                </p>
                <div className="flex items-center gap-3 text-xs">
                  <span style={{ color: "var(--muted)" }}>
                    {new Date(comment.created_at).toLocaleDateString("es-ES", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  {comment.score !== undefined &&
                    comment.score !== null &&
                    comment.score !== 0 && (
                      <div className="flex items-center gap-1">
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          style={{
                            color:
                              comment.score > 0
                                ? "var(--success)"
                                : comment.score < 0
                                ? "var(--danger)"
                                : "var(--muted)",
                          }}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d={
                              comment.score > 0
                                ? "M5 15l7-7 7 7"
                                : "M19 9l-7 7-7-7"
                            }
                          />
                        </svg>
                        <span
                          style={{
                            color:
                              comment.score > 0
                                ? "var(--success)"
                                : comment.score < 0
                                ? "var(--danger)"
                                : "var(--muted)",
                          }}
                        >
                          {comment.score}
                        </span>
                      </div>
                    )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
