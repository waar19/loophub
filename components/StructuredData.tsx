import { getFullUrl } from "@/lib/url-helpers";

interface ThreadStructuredDataProps {
  thread: {
    id: string;
    title: string;
    content: string;
    created_at: string;
    forum: {
      name: string;
      slug: string;
    };
  };
  author?: {
    username?: string;
    avatar_url?: string;
  };
}

export function ThreadStructuredData({
  thread,
  author,
}: ThreadStructuredDataProps) {
  const threadUrl = getFullUrl(`/thread/${thread.id}`);
  const forumUrl = getFullUrl(`/forum/${thread.forum.slug}`);
  const baseUrl = getFullUrl("");

  // Clean content for description (remove markdown)
  const description = thread.content
    .replace(/[#*`_~\[\]()]/g, "")
    .replace(/\n/g, " ")
    .substring(0, 200)
    .trim();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    headline: thread.title,
    description: description,
    datePublished: thread.created_at,
    dateModified: thread.created_at,
    author: {
      "@type": "Person",
      name: author?.username || "Usuario de LoopHub",
      ...(author?.avatar_url && { image: author.avatar_url }),
    },
    publisher: {
      "@type": "Organization",
      name: "LoopHub",
      url: baseUrl,
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/logo.png`, // Update with your actual logo URL
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": threadUrl,
    },
    articleSection: thread.forum.name,
    url: threadUrl,
    partOf: {
      "@type": "DiscussionForum",
      name: thread.forum.name,
      url: forumUrl,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

interface ForumStructuredDataProps {
  forum: {
    name: string;
    slug: string;
    description?: string;
  };
}

export function ForumStructuredData({ forum }: ForumStructuredDataProps) {
  const forumUrl = getFullUrl(`/forum/${forum.slug}`);
  const baseUrl = getFullUrl("");

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "DiscussionForum",
    name: forum.name,
    description: forum.description || `Discusiones sobre ${forum.name}`,
    url: forumUrl,
    publisher: {
      "@type": "Organization",
      name: "LoopHub",
      url: baseUrl,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

interface WebsiteStructuredDataProps {
  name?: string;
  description?: string;
  url?: string;
}

export function WebsiteStructuredData({
  name = "LoopHub",
  description = "Comunidad de minimalismo digital y organización personal",
  url,
}: WebsiteStructuredDataProps) {
  const baseUrl = url || getFullUrl("");

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: name,
    description: description,
    url: baseUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${baseUrl}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

