import { Metadata } from "next";
import { createClient } from "@/lib/supabase-server";
import { getBaseUrl, getFullUrl } from "@/lib/url-helpers";
import { ThreadStructuredData } from "@/components/StructuredData";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const baseUrl = getBaseUrl();
  const threadUrl = getFullUrl(`/thread/${id}`);

  try {
    const supabase = await createClient();
    const { data: thread } = await supabase
      .from("threads")
      .select(`
        title,
        content,
        created_at,
        forum_id,
        forums!inner(name, slug)
      `)
      .eq("id", id)
      .single();

    if (thread) {
      // Extract preview from content (remove markdown)
      const preview = thread.content
        .replace(/[#*`_~\[\]()]/g, "")
        .replace(/\n/g, " ")
        .substring(0, 160)
        .trim() + "...";

      // Handle forums as array (Supabase returns it as array even with single relation)
      const forum = Array.isArray(thread.forums) ? thread.forums[0] : thread.forums;
      const forumName = forum?.name || "Foro";
      const forumSlug = forum?.slug || "";

      // Generate a default OG image URL (you can replace this with a dynamic image generator)
      const ogImageUrl = `${baseUrl}/api/og?title=${encodeURIComponent(thread.title)}&forum=${encodeURIComponent(forumName)}`;

      return {
        title: `${thread.title} - ${forumName} | LoopHub`,
        description: preview,
        alternates: {
          canonical: threadUrl,
        },
        openGraph: {
          title: thread.title,
          description: preview,
          url: threadUrl,
          siteName: "LoopHub",
          type: "article",
          publishedTime: thread.created_at,
          authors: ["LoopHub"],
          section: forumName,
          tags: [forumName, "minimalismo digital", "organización personal"],
          images: [
            {
              url: ogImageUrl,
              width: 1200,
              height: 630,
              alt: thread.title,
            },
          ],
        },
        twitter: {
          card: "summary_large_image",
          title: thread.title,
          description: preview,
          images: [
            {
              url: ogImageUrl,
              alt: thread.title,
            },
          ],
          creator: "@loophub",
        },
        other: {
          "article:author": "LoopHub",
          "article:section": forumName,
          "article:published_time": thread.created_at,
        },
      };
    }
  } catch (error) {
    console.error("Error generating thread metadata:", error);
  }

  return {
    title: "Hilo - LoopHub",
    description: "Comunidad de minimalismo digital y organización personal",
    alternates: {
      canonical: threadUrl,
    },
  };
}

export default async function ThreadLayout({
  children,
  params: paramsPromise,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const params = await paramsPromise;
  const { id } = await params;
  
  // Fetch thread data for structured data
  let threadData = null;
  try {
    const supabase = await createClient();
    const { data: thread } = await supabase
      .from("threads")
      .select(`
        id,
        title,
        content,
        created_at,
        forums!inner(name, slug)
      `)
      .eq("id", id)
      .single();

    if (thread) {
      const forum = Array.isArray(thread.forums) ? thread.forums[0] : thread.forums;
      threadData = {
        id: thread.id,
        title: thread.title,
        content: thread.content,
        created_at: thread.created_at,
        forum: {
          name: forum?.name || "Foro",
          slug: forum?.slug || "",
        },
      };
    }
  } catch (error) {
    console.error("Error fetching thread for structured data:", error);
  }

  return (
    <>
      {threadData && <ThreadStructuredData thread={threadData} />}
      {children}
    </>
  );
}

