import { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase-server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://loophub.com";

  // Get all forums
  const { data: forums } = await supabase
    .from("forums")
    .select("slug, updated_at");

  // Get all threads
  const { data: threads } = await supabase
    .from("threads")
    .select("id, created_at");

  const sitemap: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  // Add forum pages
  if (forums) {
    forums.forEach((forum) => {
      sitemap.push({
        url: `${baseUrl}/forum/${forum.slug}`,
        lastModified: forum.updated_at ? new Date(forum.updated_at) : new Date(),
        changeFrequency: "daily",
        priority: 0.8,
      });
    });
  }

  // Add thread pages
  if (threads) {
    threads.forEach((thread) => {
      sitemap.push({
        url: `${baseUrl}/thread/${thread.id}`,
        lastModified: thread.created_at ? new Date(thread.created_at) : new Date(),
        changeFrequency: "weekly",
        priority: 0.6,
      });
    });
  }

  return sitemap;
}

