import { createClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import ProfileContent from "./ProfileContent";

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

  // Get user profile with extended fields
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (profileError || !profile) {
    notFound();
  }

  // Get user's threads with forum info and comment count
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
      forums(name, slug),
      comments(count)
    `
    )
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(20);

  // Get user's comments with thread info
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
    .limit(20);

  // Get user's bookmarked threads (only if viewing own profile)
  const { data: { user } } = await supabase.auth.getUser();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let bookmarkedData: any[] = [];
  
  if (user?.id === profile.id) {
    const { data: bookmarkedThreads } = await supabase
      .from("bookmarks")
      .select(`
        thread:threads(
          id,
          title,
          content,
          like_count,
          upvote_count,
          downvote_count,
          score,
          created_at,
          forums(name, slug),
          comments(count),
          profiles(username)
        )
      `)
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20);
    
    // Extract threads from bookmark relations
    bookmarkedData = bookmarkedThreads?.map(b => b.thread).filter(Boolean) || [];
  }

  // Get activity data (threads and comments by date for the last year)
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  const [{ data: threadActivity }, { data: commentActivity }] = await Promise.all([
    supabase
      .from("threads")
      .select("created_at")
      .eq("user_id", profile.id)
      .gte("created_at", oneYearAgo.toISOString()),
    supabase
      .from("comments")
      .select("created_at")
      .eq("user_id", profile.id)
      .gte("created_at", oneYearAgo.toISOString()),
  ]);

  // Aggregate activity by date
  const activityMap = new Map<string, number>();
  
  threadActivity?.forEach(t => {
    const date = t.created_at.split('T')[0];
    activityMap.set(date, (activityMap.get(date) || 0) + 1);
  });
  
  commentActivity?.forEach(c => {
    const date = c.created_at.split('T')[0];
    activityMap.set(date, (activityMap.get(date) || 0) + 1);
  });

  const activityData = Array.from(activityMap.entries()).map(([date, count]) => ({
    date,
    count
  }));

  // Get user badges (if table exists)
  let badges: Array<{ id: string; name: string; description: string; icon: string; earned_at: string }> = [];
  try {
    const { data: userBadges } = await supabase
      .from("user_badges")
      .select(`
        earned_at,
        badge:badges(id, name, description, icon)
      `)
      .eq("user_id", profile.id)
      .order("earned_at", { ascending: false });
    
    if (userBadges) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      badges = userBadges.map((ub: any) => {
        const badge = Array.isArray(ub.badge) ? ub.badge[0] : ub.badge;
        return {
          id: badge?.id || '',
          name: badge?.name || '',
          description: badge?.description || '',
          icon: badge?.icon || '🏆',
          earned_at: ub.earned_at
        };
      }).filter(b => b.id);
    }
  } catch {
    // Badges table doesn't exist yet, ignore
  }

  // Check if current user is viewing their own profile
  const isOwnProfile = user?.id === profile.id;

  // Format data for ProfileContent
  const formattedThreads = threads?.map(t => ({
    id: t.id,
    title: t.title,
    content: t.content,
    score: t.score || 0,
    created_at: t.created_at,
    comment_count: Array.isArray(t.comments) ? t.comments.length : ((t.comments as { count?: number })?.count || 0),
    forum: t.forums && Array.isArray(t.forums) && t.forums[0] 
      ? { name: t.forums[0].name, slug: t.forums[0].slug }
      : undefined
  })) || [];

  const formattedComments = comments?.map(c => ({
    id: c.id,
    content: c.content,
    score: c.score || 0,
    created_at: c.created_at,
    thread: c.thread && Array.isArray(c.thread) && c.thread[0]
      ? { id: c.thread[0].id, title: c.thread[0].title }
      : undefined
  })) || [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formattedBookmarks = bookmarkedData?.map((t: any) => ({
    id: t.id,
    title: t.title,
    content: t.content,
    score: t.score || 0,
    created_at: t.created_at,
    comment_count: Array.isArray(t.comments) ? t.comments.length : (t.comments?.count || 0),
    forum: t.forums && Array.isArray(t.forums) && t.forums[0]
      ? { name: t.forums[0].name, slug: t.forums[0].slug }
      : undefined,
    author: t.profiles?.username
  })) || [];

  const profileData = {
    id: profile.id,
    username: profile.username,
    bio: profile.bio,
    avatar_url: profile.avatar_url,
    location: profile.location,
    website: profile.website,
    github_username: profile.github_username,
    twitter_username: profile.twitter_username,
    karma: profile.karma || profile.reputation || 0,
    level: profile.level || 0,
    is_admin: profile.is_admin,
    created_at: profile.created_at,
    thread_count: threads?.length || 0,
    comment_count: comments?.length || 0
  };

  return (
    <ProfileContent
      profile={profileData}
      threads={formattedThreads}
      comments={formattedComments}
      bookmarks={formattedBookmarks}
      badges={badges}
      activityData={activityData}
      isOwnProfile={isOwnProfile}
    />
  );
}
