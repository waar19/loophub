import Head from "next/head";

interface MetaHeadProps {
  title: string;
  description?: string;
  imageUrl?: string;
  url?: string;
  // OG Image generation params
  ogParams?: {
    type?: "thread" | "forum" | "profile" | "default";
    forum?: string;
    author?: string;
    votes?: number;
    comments?: number;
    tags?: string[];
    karma?: number;
    level?: number;
    threads?: number;
    threadCount?: number;
  };
}

/**
 * Component that injects SEO meta tags into the page head.
 * Uses Next.js <Head> to add standard tags, Open Graph and Twitter Card.
 */
export default function MetaHead({
  title,
  description = "",
  imageUrl = "",
  url = "",
  ogParams,
}: MetaHeadProps) {
  const siteName = "Loophub";
  const fullTitle = title.includes("Loophub") ? title : `${title} | ${siteName}`;
  
  // Generate OG image URL
  let ogImage = imageUrl;
  if (!ogImage && ogParams) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
    const params = new URLSearchParams();
    params.set("title", title.replace(" - Loophub", "").replace(" | Loophub", ""));
    if (description) params.set("description", description.substring(0, 150));
    if (ogParams.type) params.set("type", ogParams.type);
    if (ogParams.forum) params.set("forum", ogParams.forum);
    if (ogParams.author) params.set("author", ogParams.author);
    if (ogParams.votes !== undefined) params.set("votes", String(ogParams.votes));
    if (ogParams.comments !== undefined) params.set("comments", String(ogParams.comments));
    if (ogParams.tags?.length) params.set("tags", ogParams.tags.join(","));
    if (ogParams.karma !== undefined) params.set("karma", String(ogParams.karma));
    if (ogParams.level !== undefined) params.set("level", String(ogParams.level));
    if (ogParams.threads !== undefined) params.set("threads", String(ogParams.threads));
    if (ogParams.threadCount !== undefined) params.set("threadCount", String(ogParams.threadCount));
    
    ogImage = `${baseUrl}/api/og?${params.toString()}`;
  } else if (!ogImage) {
    ogImage = `${process.env.NEXT_PUBLIC_BASE_URL}/og-default.png`;
  }
  
  const pageUrl =
    url ||
    `${process.env.NEXT_PUBLIC_BASE_URL}${
      typeof window !== "undefined" ? window.location.pathname : ""
    }`;

  return (
    <Head>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content={siteName} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={ogImage} />
    </Head>
  );
}
