"use client";

import { useTranslations } from "@/components/TranslationsProvider";
import TrendingPanel from "@/components/TrendingPanel";
import ThreadCard from "@/components/ThreadCard";
import ForumCard from "@/components/ForumCard";
import Breadcrumbs from "@/components/Breadcrumbs";

import { motion } from "framer-motion";

interface Thread {
  id: string;
  title: string;
  content: string;
  like_count: number;
  upvote_count: number;
  downvote_count: number;
  score?: number;
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

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function HomeContent({
  recentThreads,
  featuredThreads,
  forums,
}: HomeContentProps) {
  const { t } = useTranslations();

  return (
    <div className="min-h-screen lg:ml-[var(--sidebar-width)] xl:mr-80">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <Breadcrumbs items={[{ label: t("nav.home"), href: "/" }]} />

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <h1
            className="text-2xl sm:text-3xl font-extrabold mb-2"
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
            className="text-base leading-relaxed"
            style={{ color: "var(--muted)" }}
          >
            {t("home.welcomeSubtitle")}
          </p>
        </motion.div>

        {/* Forums List */}
        {forums.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-6 h-6 rounded flex items-center justify-center text-sm"
                style={{
                  background: "var(--brand)",
                  color: "white",
                }}
              >
                💬
              </div>
              <h2
                className="text-xl sm:text-2xl font-bold"
                style={{ color: "var(--foreground)" }}
              >
                {t("home.forums")}
              </h2>
            </div>
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 gap-3"
            >
              {forums.map((forum) => (
                <motion.div key={forum.id} variants={item}>
                  <ForumCard forum={forum} />
                </motion.div>
              ))}
            </motion.div>
          </section>
        )}

        {/* Featured Threads */}
        {featuredThreads.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-6 h-6 rounded flex items-center justify-center text-sm"
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
                className="text-xl sm:text-2xl font-bold"
                style={{ color: "var(--foreground)" }}
              >
                {t("home.featuredThreads")}
              </h2>
            </div>
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="space-y-4"
            >
              {featuredThreads.map((thread) => (
                <motion.div key={thread.id} variants={item}>
                  <ThreadCard
                    thread={thread}
                    forumSlug={thread.forum?.slug || ""}
                    featured
                  />
                </motion.div>
              ))}
            </motion.div>
          </section>
        )}

        {/* Recent Threads */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-6 h-6 rounded flex items-center justify-center text-sm"
              style={{
                background: "var(--brand)",
                color: "white",
              }}
            >
              🔥
            </div>
            <h2
              className="text-xl sm:text-2xl font-bold"
              style={{ color: "var(--foreground)" }}
            >
              {t("home.recentThreads")}
            </h2>
          </div>
          {recentThreads.length === 0 ? (
            <div className="card text-center py-6">
              <p style={{ color: "var(--muted)" }}>{t("home.noThreads")}</p>
            </div>
          ) : (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="space-y-4"
            >
              {recentThreads.map((thread) => (
                <motion.div key={thread.id} variants={item}>
                  <ThreadCard
                    thread={thread}
                    forumSlug={thread.forum?.slug || ""}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>
      </div>

      {/* Trending Panel */}
      <TrendingPanel />
    </div>
  );
}
