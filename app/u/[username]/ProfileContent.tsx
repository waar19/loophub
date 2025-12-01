"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Tooltip from "@/components/Tooltip";
import FollowButton from "@/components/FollowButton";

// Types
interface Profile {
  id: string;
  username: string;
  bio?: string;
  location?: string;
  website?: string;
  karma?: number;
  reputation?: number;
  level?: number;
  is_admin?: boolean;
  created_at: string;
  twitter_username?: string;
  github_username?: string;
  follower_count?: number;
  following_count?: number;
  is_following?: boolean;
}

interface Thread {
  id: string;
  title: string;
  content: string;
  score?: number;
  upvote_count?: number;
  downvote_count?: number;
  created_at: string;
  forums?: { name: string; slug: string }[] | { name: string; slug: string };
}

interface Comment {
  id: string;
  content: string;
  score?: number;
  created_at: string;
  thread?: { id: string; title: string }[] | { id: string; title: string };
}

interface Bookmark {
  id: string;
  title?: string;
  content?: string;
  score?: number;
  created_at: string;
  comment_count?: number;
  forum?: { name: string; slug: string };
  author?: string;
  threads?: {
    id: string;
    title: string;
    score?: number;
    created_at: string;
    forums?: { name: string; slug: string }[] | { name: string; slug: string };
    profiles?: { username: string }[] | { username: string };
  };
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned_at: string;
}

interface ActivityData {
  date: string;
  count: number;
}

interface ProfileContentProps {
  profile: Profile & {
    thread_count?: number;
    comment_count?: number;
    avatar_url?: string;
    reputation?: number;
  };
  threads: (Thread & {
    comment_count?: number;
    forum?: { name: string; slug: string };
  })[];
  comments: (Comment & { thread?: { id: string; title: string } })[];
  bookmarks: Bookmark[];
  badges?: Badge[];
  activityData?: ActivityData[];
  isOwnProfile?: boolean;
}

type TabType = "threads" | "comments" | "saved";

// Activity Graph Component (GitHub-style)
function ActivityGraph({
  activityMap,
}: {
  activityMap: Record<string, number>;
}) {
  // Generate last 52 weeks of data
  const weeks = useMemo(() => {
    const result: { date: string; count: number }[][] = [];
    const today = new Date();

    // Start from 52 weeks ago, on a Sunday
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364 - startDate.getDay());

    for (let week = 0; week < 53; week++) {
      const weekData: { date: string; count: number }[] = [];
      for (let day = 0; day < 7; day++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + week * 7 + day);
        const dateStr = currentDate.toISOString().split("T")[0];
        weekData.push({
          date: dateStr,
          count: activityMap[dateStr] || 0,
        });
      }
      result.push(weekData);
    }
    return result;
  }, [activityMap]);

  // Get color based on activity count
  const getColor = (count: number) => {
    if (count === 0) return "var(--border)";
    if (count === 1) return "#9be9a8";
    if (count <= 3) return "#40c463";
    if (count <= 6) return "#30a14e";
    return "#216e39";
  };

  const totalContributions = Object.values(activityMap).reduce(
    (a, b) => a + b,
    0
  );

  const months = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];

  return (
    <div className="card p-4 mb-6 overflow-x-auto">
      <div className="flex items-center justify-between mb-3">
        <h3
          className="text-sm font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Actividad
        </h3>
        <span className="text-xs" style={{ color: "var(--muted)" }}>
          {totalContributions} contribuciones en el último año
        </span>
      </div>

      {/* Month labels */}
      <div className="flex mb-1 pl-4" style={{ gap: "44px" }}>
        {[0, 4, 8, 13, 17, 21, 26, 30, 34, 39, 43, 47].map((weekIndex, i) => (
          <span
            key={weekIndex}
            className="text-xs"
            style={{ color: "var(--muted)" }}
          >
            {months[(new Date().getMonth() - 11 + i + 12) % 12]}
          </span>
        ))}
      </div>

      {/* Activity grid */}
      <div className="flex gap-0.5">
        {/* Day labels */}
        <div
          className="flex flex-col gap-0.5 mr-1 text-xs"
          style={{ color: "var(--muted)" }}
        >
          <span className="h-2.5"></span>
          <span className="h-2.5 leading-none">L</span>
          <span className="h-2.5"></span>
          <span className="h-2.5 leading-none">M</span>
          <span className="h-2.5"></span>
          <span className="h-2.5 leading-none">V</span>
          <span className="h-2.5"></span>
        </div>

        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-0.5">
            {week.map((day) => (
              <Tooltip
                key={day.date}
                content={`${day.count} ${
                  day.count === 1 ? "contribución" : "contribuciones"
                } el ${new Date(day.date).toLocaleDateString("es-ES", {
                  month: "short",
                  day: "numeric",
                })}`}
                position="top"
              >
                <div
                  className="w-2.5 h-2.5 rounded-sm cursor-pointer transition-transform hover:scale-125"
                  style={{ backgroundColor: getColor(day.count) }}
                />
              </Tooltip>
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1 mt-2">
        <span className="text-xs mr-1" style={{ color: "var(--muted)" }}>
          Menos
        </span>
        {[0, 1, 3, 6, 10].map((level) => (
          <div
            key={level}
            className="w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: getColor(level) }}
          />
        ))}
        <span className="text-xs ml-1" style={{ color: "var(--muted)" }}>
          Más
        </span>
      </div>
    </div>
  );
}

// Stats Card Component
function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="card p-4 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold" style={{ color }}>
        {typeof value === "number" && value >= 1000
          ? `${(value / 1000).toFixed(1)}k`
          : value}
      </div>
      <div className="text-xs" style={{ color: "var(--muted)" }}>
        {label}
      </div>
    </div>
  );
}

export default function ProfileContent({
  profile,
  threads,
  comments,
  bookmarks,
  badges = [],
  activityData = [],
  isOwnProfile = false,
}: ProfileContentProps) {
  const [activeTab, setActiveTab] = useState<TabType>("threads");

  const karma = profile.karma || profile.reputation || 0;
  const level = profile.level || 0;
  const memberSince = new Date(profile.created_at).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
  });

  const threadCount = profile.thread_count || threads.length;
  const commentCount = profile.comment_count || comments.length;
  const bookmarkCount = bookmarks.length;

  // Convert activityData array to map for ActivityGraph
  const activityMap = useMemo(() => {
    const map: Record<string, number> = {};
    activityData.forEach((item) => {
      map[item.date] = item.count;
    });
    return map;
  }, [activityData]);

  const levelColors = [
    "#9CA3AF",
    "#60A5FA",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#A855F7",
  ];

  const tabs: { id: TabType; label: string; count: number }[] = [
    { id: "threads", label: "Hilos", count: threadCount },
    { id: "comments", label: "Comentarios", count: commentCount },
    ...(isOwnProfile
      ? [{ id: "saved" as TabType, label: "Guardados", count: bookmarkCount }]
      : []),
  ];

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Profile Header */}
      <div className="card mb-6 p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Avatar */}
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.username}
              className="w-28 h-28 rounded-full object-cover shrink-0"
              style={{ border: `4px solid ${levelColors[level]}` }}
            />
          ) : (
            <div
              className="w-28 h-28 rounded-full flex items-center justify-center text-4xl font-bold shrink-0"
              style={{
                background: `linear-gradient(135deg, ${levelColors[level]} 0%, var(--brand) 100%)`,
                color: "white",
                border: `4px solid ${levelColors[level]}`,
              }}
            >
              {profile.username.charAt(0).toUpperCase()}
            </div>
          )}

          {/* User Info */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-3 mb-2">
              <h1
                className="text-2xl md:text-3xl font-bold"
                style={{ color: "var(--foreground)" }}
              >
                @{profile.username}
              </h1>
              {profile.is_admin && (
                <span
                  className="text-xs px-2 py-1 rounded-full font-semibold"
                  style={{ background: "var(--brand)", color: "white" }}
                >
                  ADMIN
                </span>
              )}
              {/* Level Badge */}
              <span
                className="text-xs px-2 py-1 rounded-full font-semibold"
                style={{ background: levelColors[level], color: "white" }}
              >
                Nivel {level}
              </span>
            </div>

            {/* Follow Button */}
            {!isOwnProfile && (
              <div className="mt-2">
                <FollowButton
                  userId={profile.id}
                  username={profile.username}
                  initialIsFollowing={profile.is_following || false}
                  initialFollowerCount={profile.follower_count || 0}
                  showCount={false}
                  size="md"
                />
              </div>
            )}

            {/* Bio */}
            {profile.bio && (
              <p className="mb-3 max-w-xl" style={{ color: "var(--muted)" }}>
                {profile.bio}
              </p>
            )}

            {/* Meta info */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm mb-4">
              {profile.location && (
                <div
                  className="flex items-center gap-1"
                  style={{ color: "var(--muted)" }}
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
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  {profile.location}
                </div>
              )}

              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:underline"
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
                  {profile.website
                    .replace(/^https?:\/\//, "")
                    .replace(/\/$/, "")}
                </a>
              )}

              {profile.twitter_username && (
                <a
                  href={`https://twitter.com/${profile.twitter_username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:underline"
                  style={{ color: "#1DA1F2" }}
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  @{profile.twitter_username}
                </a>
              )}

              {profile.github_username && (
                <a
                  href={`https://github.com/${profile.github_username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:underline"
                  style={{ color: "var(--foreground)" }}
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  {profile.github_username}
                </a>
              )}

              <div
                className="flex items-center gap-1"
                style={{ color: "var(--muted)" }}
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
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Miembro desde {memberSince}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon="⭐"
          label="Karma"
          value={karma}
          color={levelColors[level]}
        />
        <Link href={`/u/${profile.username}/followers`}>
          <StatCard
            icon="👥"
            label="Seguidores"
            value={profile.follower_count || 0}
            color="#8b5cf6"
          />
        </Link>
        <Link href={`/u/${profile.username}/following`}>
          <StatCard
            icon="➕"
            label="Siguiendo"
            value={profile.following_count || 0}
            color="#ec4899"
          />
        </Link>
        <StatCard icon="📝" label="Hilos" value={threadCount} color="#60A5FA" />
      </div>

      {/* Badges Section */}
      {badges.length > 0 && (
        <div className="card p-4 mb-6">
          <h3
            className="text-sm font-semibold mb-3"
            style={{ color: "var(--foreground)" }}
          >
            🏆 Logros
          </h3>
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <Tooltip
                key={badge.id}
                content={badge.description}
                position="top"
              >
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm cursor-default"
                  style={{
                    background: "var(--brand-light)",
                    color: "var(--brand-dark)",
                  }}
                >
                  <span>{badge.icon}</span>
                  <span className="font-medium">{badge.name}</span>
                </div>
              </Tooltip>
            ))}
          </div>
        </div>
      )}

      {/* Activity Graph */}
      <ActivityGraph activityMap={activityMap} />

      {/* Tabs */}
      <div className="mb-6">
        <div
          className="flex gap-1 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-4 py-3 font-medium transition-colors relative"
              style={{
                color: activeTab === tab.id ? "var(--brand)" : "var(--muted)",
              }}
            >
              {tab.label}
              <span
                className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full"
                style={{
                  background:
                    activeTab === tab.id
                      ? "var(--brand-light)"
                      : "var(--border)",
                  color: activeTab === tab.id ? "var(--brand)" : "var(--muted)",
                }}
              >
                {tab.count}
              </span>
              {activeTab === tab.id && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ background: "var(--brand)" }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {/* Threads Tab */}
        {activeTab === "threads" && (
          <>
            {threads.length > 0 ? (
              threads.map((thread) => {
                const forum = Array.isArray(thread.forums)
                  ? thread.forums[0]
                  : thread.forums;
                return (
                  <Link
                    key={thread.id}
                    href={`/thread/${thread.id}`}
                    className="card card-interactive block p-5"
                  >
                    <h3
                      className="font-semibold mb-2 line-clamp-2"
                      style={{ color: "var(--foreground)" }}
                    >
                      {thread.title}
                    </h3>
                    <div className="flex items-center gap-3 flex-wrap text-sm">
                      {forum && (
                        <span
                          className="px-2 py-0.5 rounded text-xs"
                          style={{
                            background: "var(--brand-light)",
                            color: "var(--brand-dark)",
                          }}
                        >
                          {forum.name}
                        </span>
                      )}
                      <span style={{ color: "var(--muted)" }}>
                        {new Date(thread.created_at).toLocaleDateString(
                          "es-ES",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          }
                        )}
                      </span>
                      {thread.score !== undefined && thread.score !== 0 && (
                        <span
                          style={{
                            color:
                              thread.score > 0
                                ? "var(--success)"
                                : "var(--danger)",
                          }}
                        >
                          {thread.score > 0 ? "↑" : "↓"}{" "}
                          {Math.abs(thread.score)}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })
            ) : (
              <div
                className="card text-center py-12"
                style={{ color: "var(--muted)" }}
              >
                <div className="text-4xl mb-3">📝</div>
                <p>No ha creado ningún hilo todavía.</p>
              </div>
            )}
          </>
        )}

        {/* Comments Tab */}
        {activeTab === "comments" && (
          <>
            {comments.length > 0 ? (
              comments.map((comment) => {
                const thread = Array.isArray(comment.thread)
                  ? comment.thread[0]
                  : comment.thread;
                return (
                  <div key={comment.id} className="card p-5">
                    {thread && (
                      <Link
                        href={`/thread/${thread.id}`}
                        className="text-sm font-medium hover:underline mb-2 block"
                        style={{ color: "var(--brand)" }}
                      >
                        Re: {thread.title}
                      </Link>
                    )}
                    <p
                      className="text-sm mb-2 line-clamp-3"
                      style={{ color: "var(--muted)" }}
                    >
                      {comment.content.substring(0, 200)}
                      {comment.content.length > 200 ? "..." : ""}
                    </p>
                    <div className="flex items-center gap-3 text-xs">
                      <span style={{ color: "var(--muted)" }}>
                        {new Date(comment.created_at).toLocaleDateString(
                          "es-ES",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          }
                        )}
                      </span>
                      {comment.score !== undefined && comment.score !== 0 && (
                        <span
                          style={{
                            color:
                              comment.score > 0
                                ? "var(--success)"
                                : "var(--danger)",
                          }}
                        >
                          {comment.score > 0 ? "↑" : "↓"}{" "}
                          {Math.abs(comment.score)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div
                className="card text-center py-12"
                style={{ color: "var(--muted)" }}
              >
                <div className="text-4xl mb-3">💬</div>
                <p>No ha hecho ningún comentario todavía.</p>
              </div>
            )}
          </>
        )}

        {/* Saved/Bookmarks Tab */}
        {activeTab === "saved" && (
          <>
            {bookmarks.length > 0 ? (
              bookmarks.map((bookmark) => {
                // Support both nested (bookmark.threads) and flat format
                const thread = bookmark.threads || bookmark;
                const threadId = (thread as { id?: string }).id || bookmark.id;
                const threadTitle =
                  (thread as { title?: string }).title || bookmark.title;
                if (!threadTitle) return null;

                // Get forum from nested or flat structure
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const forumData = (thread as any).forums || bookmark.forum;
                const forum = Array.isArray(forumData)
                  ? forumData[0]
                  : forumData;

                // Get author from nested or flat structure
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const profileData = (thread as any).profiles;
                const author = Array.isArray(profileData)
                  ? profileData[0]?.username
                  : profileData?.username || bookmark.author;

                return (
                  <Link
                    key={bookmark.id}
                    href={`/thread/${threadId}`}
                    className="card card-interactive block p-5"
                  >
                    <h3
                      className="font-semibold mb-2 line-clamp-2"
                      style={{ color: "var(--foreground)" }}
                    >
                      {threadTitle}
                    </h3>
                    <div className="flex items-center gap-3 flex-wrap text-sm">
                      {forum && (
                        <span
                          className="px-2 py-0.5 rounded text-xs"
                          style={{
                            background: "var(--brand-light)",
                            color: "var(--brand-dark)",
                          }}
                        >
                          {forum.name}
                        </span>
                      )}
                      {author && (
                        <span style={{ color: "var(--muted)" }}>
                          por @{author}
                        </span>
                      )}
                      <span style={{ color: "var(--muted)" }}>
                        Guardado el{" "}
                        {new Date(bookmark.created_at).toLocaleDateString(
                          "es-ES",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          }
                        )}
                      </span>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div
                className="card text-center py-12"
                style={{ color: "var(--muted)" }}
              >
                <div className="text-4xl mb-3">🔖</div>
                <p>No ha guardado ningún hilo todavía.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
