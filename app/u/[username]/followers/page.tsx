import { createClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import Link from "next/link";
import FollowButton from "@/components/FollowButton";

interface FollowersPageProps {
  params: Promise<{
    username: string;
  }>;
}

export default async function FollowersPage({ params }: FollowersPageProps) {
  const { username } = await params;
  const supabase = await createClient();

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .eq("username", username)
    .single();

  if (!profile) {
    notFound();
  }

  // Get followers with pagination (first 50)
  const { data: followersData } = await supabase
    .from("user_follows")
    .select(
      `
      created_at,
      follower:follower_id (
        id,
        username,
        avatar_url,
        bio,
        level,
        reputation
      )
    `
    )
    .eq("following_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Get current user to check follow status
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get current user's following list
  let followingIds: string[] = [];
  if (user) {
    const { data: following } = await supabase
      .from("user_follows")
      .select("following_id")
      .eq("follower_id", user.id);

    followingIds = following?.map((f) => f.following_id) || [];
  }

  const followers =
    followersData?.map((f: any) => ({
      ...f.follower,
      followedAt: f.created_at,
      isFollowing: user ? followingIds.includes(f.follower.id) : false,
    })) || [];

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/u/${username}`}
          className="text-sm mb-2 inline-flex items-center gap-1 hover:underline"
          style={{ color: "var(--muted)" }}
        >
          ← Volver al perfil
        </Link>
        <h1
          className="text-3xl font-bold"
          style={{ color: "var(--foreground)" }}
        >
          Seguidores de @{username}
        </h1>
        <p className="mt-2" style={{ color: "var(--muted)" }}>
          {followers.length}{" "}
          {followers.length === 1 ? "seguidor" : "seguidores"}
        </p>
      </div>

      {/* Followers List */}
      {followers.length > 0 ? (
        <div className="space-y-3">
          {followers.map((follower: any) => (
            <div
              key={follower.id}
              className="card p-4 flex items-center justify-between gap-4"
            >
              <Link
                href={`/u/${follower.username}`}
                className="flex items-center gap-3 flex-1 min-w-0"
              >
                {follower.avatar_url ? (
                  <img
                    src={follower.avatar_url}
                    alt={follower.username}
                    className="w-12 h-12 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
                    style={{
                      background: "var(--accent)",
                      color: "white",
                    }}
                  >
                    {follower.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div
                    className="font-semibold truncate"
                    style={{ color: "var(--foreground)" }}
                  >
                    @{follower.username}
                  </div>
                  {follower.bio && (
                    <p
                      className="text-sm truncate"
                      style={{ color: "var(--muted)" }}
                    >
                      {follower.bio}
                    </p>
                  )}
                  <div
                    className="flex items-center gap-2 text-xs mt-1"
                    style={{ color: "var(--muted)" }}
                  >
                    <span>Nivel {follower.level || 0}</span>
                    <span>•</span>
                    <span>{follower.reputation || 0} karma</span>
                  </div>
                </div>
              </Link>

              {user?.id !== follower.id && (
                <FollowButton
                  userId={follower.id}
                  username={follower.username}
                  initialIsFollowing={follower.isFollowing}
                  showCount={false}
                  size="sm"
                  variant="secondary"
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div
          className="card text-center py-12"
          style={{ color: "var(--muted)" }}
        >
          <div className="text-4xl mb-3">👥</div>
          <p>@{username} aún no tiene seguidores</p>
        </div>
      )}
    </div>
  );
}
