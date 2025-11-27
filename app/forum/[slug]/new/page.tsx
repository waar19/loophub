"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import SimpleForm from "@/components/SimpleForm";
import Breadcrumbs from "@/components/Breadcrumbs";
import { createClient } from "@/lib/supabase-browser";
import { useToast } from "@/contexts/ToastContext";
import { useTranslations } from "@/components/TranslationsProvider";

export default function NewThreadPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const [forumName, setForumName] = useState("");
  const { showSuccess, showError } = useToast();
  const { t } = useTranslations();

  useEffect(() => {
    async function fetchForum() {
      const supabase = createClient();
      const { data } = await supabase
        .from("forums")
        .select("name")
        .eq("slug", slug)
        .single();
      if (data) setForumName(data.name);
    }
    fetchForum();
  }, [slug]);

  const handleSubmit = async (data: Record<string, string>) => {
    try {
      const res = await fetch(`/api/forums/${slug}/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || t("threads.errorCreating"));
      }

      const thread = await res.json();
      showSuccess(t("threads.threadCreated") || "¡Hilo creado exitosamente!");
      router.push(`/thread/${thread.id}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : t("threads.errorCreating");
      showError(errorMessage);
      throw error;
    }
  };

  return (
    <div className="lg:ml-[var(--sidebar-width)] xl:mr-80">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <Breadcrumbs
          items={[
            { label: t("common.home"), href: "/" },
            { label: forumName || t("forums.forum"), href: `/forum/${slug}` },
            { label: t("threads.newThread") },
          ]}
        />

        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
            style={{
              background: "var(--brand)",
              color: "white",
            }}
          >
            ✍️
          </div>
          <h1
            className="text-4xl font-extrabold"
            style={{
              background:
                "linear-gradient(135deg, var(--foreground) 0%, var(--brand) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {t("threads.createNewThread")}
          </h1>
        </div>

        <div
          className="card"
          style={{
            borderLeft: "4px solid var(--brand)",
          }}
        >
          <SimpleForm
            fields={[
              {
                name: "title",
                label: t("threads.threadTitle"),
                type: "text",
                placeholder: t("threads.threadTitlePlaceholder"),
                required: true,
                maxLength: 200,
              },
              {
                name: "content",
                label: t("threads.threadContent"),
                type: "markdown",
                placeholder: t("threads.threadContentPlaceholder"),
                required: true,
                maxLength: 10000,
              },
            ]}
            onSubmit={handleSubmit}
            submitText={t("threads.createThread")}
          />
        </div>
      </div>
    </div>
  );
}
