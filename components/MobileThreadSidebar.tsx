"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Thread, Forum } from "@/lib/supabase";
import { useTranslations } from "./TranslationsProvider";

interface MobileThreadSidebarProps {
  thread: Thread & { forum: Forum };
}

export default function MobileThreadSidebar({
  thread,
}: MobileThreadSidebarProps) {
  const { t, locale } = useTranslations();
  const [isOpen, setIsOpen] = useState(false);

  const date = new Date(thread.created_at).toLocaleDateString(
    locale === "es" ? "es-ES" : locale === "pt" ? "pt-BR" : "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  // Close on route change
  useEffect(() => {
    setIsOpen(false);
  }, []);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* Floating Action Button (visible only on mobile) */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 xl:hidden w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white"
        style={{
          background: "var(--brand)",
          boxShadow: "0 4px 12px rgba(88, 101, 242, 0.4)",
        }}
        aria-label="Ver detalles del hilo"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </motion.button>

      {/* Drawer Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 z-50 xl:hidden"
              style={{ backdropFilter: "blur(4px)" }}
            />

            {/* Drawer Panel */}
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-80 z-50 xl:hidden overflow-y-auto shadow-2xl"
              style={{
                background: "var(--card-bg)",
                borderLeft: "1px solid var(--border)",
              }}
            >
              <div className="p-6 space-y-6">
                {/* Header with Close Button */}
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-bold">Detalles del Hilo</h2>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-full hover:bg-[var(--card-hover)] transition-colors"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {/* Thread Info */}
                <div>
                  <h3
                    className="text-xs font-bold mb-4 uppercase tracking-wider"
                    style={{ color: "var(--muted)" }}
                  >
                    {t("threads.threadInfo")}
                  </h3>
                  <div className="space-y-4">
                    {/* Author */}
                    {thread.profile?.username && (
                      <div>
                        <p
                          className="text-xs font-medium mb-1.5"
                          style={{ color: "var(--muted)" }}
                        >
                          {t("profile.author")}
                        </p>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                            style={{
                              background:
                                "linear-gradient(135deg, var(--brand), var(--accent))",
                              color: "white",
                            }}
                          >
                            {thread.profile.username.charAt(0).toUpperCase()}
                          </div>
                          <span
                            className="text-base font-medium"
                            style={{ color: "var(--foreground)" }}
                          >
                            {thread.profile.username}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Forum */}
                    <div>
                      <p
                        className="text-xs font-medium mb-1.5"
                        style={{ color: "var(--muted)" }}
                      >
                        {t("common.forum")}
                      </p>
                      <Link
                        href={`/forum/${thread.forum.slug}`}
                        className="inline-block"
                        onClick={() => setIsOpen(false)}
                      >
                        <span
                          className="badge text-sm font-semibold px-3 py-1.5"
                          style={{
                            background: "var(--brand)",
                            color: "white",
                          }}
                        >
                          {thread.forum.name}
                        </span>
                      </Link>
                    </div>

                    {/* Date */}
                    <div>
                      <p
                        className="text-xs font-medium mb-1.5"
                        style={{ color: "var(--muted)" }}
                      >
                        {t("threads.published")}
                      </p>
                      <p
                        className="text-sm"
                        style={{ color: "var(--foreground)" }}
                      >
                        {date}
                      </p>
                    </div>

                    {/* Comment count */}
                    {thread._count && (
                      <div>
                        <p
                          className="text-xs font-medium mb-1.5"
                          style={{ color: "var(--muted)" }}
                        >
                          {t("threads.comments")}
                        </p>
                        <p
                          className="text-lg font-bold"
                          style={{ color: "var(--brand)" }}
                        >
                          {thread._count.comments || 0}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <hr style={{ borderColor: "var(--border)" }} />

                {/* Related Links */}
                <div>
                  <h3
                    className="text-xs font-bold mb-4 uppercase tracking-wider"
                    style={{ color: "var(--muted)" }}
                  >
                    {t("threads.relatedLinks")}
                  </h3>
                  <div className="space-y-3">
                    <Link
                      href={`/forum/${thread.forum.slug}`}
                      onClick={() => setIsOpen(false)}
                      className="block text-sm transition-colors hover:text-[var(--brand)]"
                      style={{ color: "var(--muted)" }}
                    >
                      → {t("threads.viewAllThreads")} {thread.forum.name}
                    </Link>
                    <Link
                      href={`/forum/${thread.forum.slug}/new`}
                      onClick={() => setIsOpen(false)}
                      className="block text-sm transition-colors hover:text-[var(--brand)]"
                      style={{ color: "var(--muted)" }}
                    >
                      → {t("threads.createNewThread")}
                    </Link>
                  </div>
                </div>

                <hr style={{ borderColor: "var(--border)" }} />

                {/* Forum Rules */}
                <div>
                  <h3
                    className="text-xs font-bold mb-4 uppercase tracking-wider"
                    style={{ color: "var(--muted)" }}
                  >
                    {t("threads.forumRules")}
                  </h3>
                  <ul
                    className="space-y-2 text-sm leading-relaxed"
                    style={{ color: "var(--muted)" }}
                  >
                    <li>• {t("threads.rule1")}</li>
                    <li>• {t("threads.rule2")}</li>
                    <li>• {t("threads.rule3")}</li>
                  </ul>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
