"use client";

import { useTranslations } from "@/components/TranslationsProvider";
import TrendingPanel from "@/components/TrendingPanel";
import ThreadCard from "@/components/ThreadCard";
import ForumCard from "@/components/ForumCard";
import Breadcrumbs from "@/components/Breadcrumbs";

interface Thread {
  id: string;
  title: string;
  content: string;
  created_at: string;
  forum_id: string;
  user_id?: string;
  profile?: {
    username: string;
  };
  forum?: {
    name: string;
    slug: string;
  };
  _count?: {
    comments: number;
  };
}

interface Forum {
  id: string;
  name: string;
  slug: string;
  description?: string;
  created_at: string;
  _count: {
    threads: number;
  };
}

interface HomeContentProps {
  recentThreads: Thread[];
  featuredThreads: Thread[];
  forums: Forum[];
}

export default function HomeContent({
  recentThreads,
  featuredThreads,
  forums,
}: HomeContentProps) {
  const { t } = useTranslations();

  return (
    <div className="min-h-screen lg:ml-[var(--sidebar-width)] xl:mr-80">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Breadcrumbs items={[{ label: t("nav.home"), href: "/" }]} />

        {/* Hero Section */}
        <div className="mb-16">
          <h1
            className="text-4xl sm:text-5xl font-extrabold mb-4"
            style={{
              color: "var(--foreground)",
              background:
                "linear-gradient(135deg, var(--foreground) 0%, var(--brand) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {t("home.welcome")}
          </h1>
          <p
            className="text-xl leading-relaxed"
            style={{ color: "var(--muted)" }}
          >
            {t("home.welcomeSubtitle")}
          </p>
        </div>

        {/* Forums List */}
        {forums.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                style={{
                  background: "var(--brand)",
                  color: "white",
                }}
              >
                💬
              </div>
              <h2
                className="text-2xl sm:text-3xl font-bold"
                style={{ color: "var(--foreground)" }}
              >
                {t("home.forums")}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {forums.map((forum) => (
                <ForumCard key={forum.id} forum={forum} />
              ))}
            </div>
          </section>
        )}

        {/* Featured Threads */}
        {featuredThreads.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                style={{
                  background:
                    "linear-gradient(135deg, var(--brand) 0%, var(--brand-hover) 100%)",
                  color: "white",
                  boxShadow: "0 4px 12px rgba(88, 101, 242, 0.3)",
                }}
              >
                ⭐
              </div>
              <h2
                className="text-2xl sm:text-3xl font-bold"
                style={{ color: "var(--foreground)" }}
              >
                {t("home.featuredThreads")}
              </h2>
            </div>
            <div className="space-y-4">
              {featuredThreads.map((thread) => (
                <ThreadCard
                  key={thread.id}
                  thread={thread}
                  forumSlug={thread.forum?.slug || ""}
                  featured
                />
              ))}
            </div>
          </section>
        )}

        {/* Recent Threads */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
              style={{
                background: "var(--brand)",
                color: "white",
              }}
            >
              🔥
            </div>
            <h2
              className="text-2xl sm:text-3xl font-bold"
              style={{ color: "var(--foreground)" }}
            >
              {t("home.recentThreads")}
            </h2>
          </div>
          {recentThreads.length === 0 ? (
            <div className="card text-center py-12">
              <p style={{ color: "var(--muted)" }}>{t("home.noThreads")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentThreads.map((thread) => (
                <ThreadCard
                  key={thread.id}
                  thread={thread}
                  forumSlug={thread.forum?.slug || ""}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Trending Panel */}
      <TrendingPanel />
    </div>
  );
}
