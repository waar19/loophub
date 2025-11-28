"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, useCallback } from "react";
import SimpleForm from "@/components/SimpleForm";
import Breadcrumbs from "@/components/Breadcrumbs";
import TagSelector from "@/components/TagSelector";
import DraftIndicator, { DraftRestoreBanner } from "@/components/DraftIndicator";
import { useDraft } from "@/hooks/useDraft";
import { createClient } from "@/lib/supabase-browser";
import { useToast } from "@/contexts/ToastContext";
import { useTranslations } from "@/components/TranslationsProvider";
import { createThread } from "@/lib/actions";

interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string;
}

export default function NewThreadPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const [forumName, setForumName] = useState("");
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [isPending, startTransition] = useTransition();
  const { showSuccess, showError } = useToast();
  const { t } = useTranslations();

  // Draft system
  const draftKey = `new-thread-${slug}`;
  const {
    content,
    title: draftTitle,
    setContent,
    setTitle: setDraftTitle,
    hasDraft,
    lastSaved,
    isSaving,
    restore,
    clear,
    discard,
  } = useDraft({ key: draftKey });

  const [showRestoreBanner, setShowRestoreBanner] = useState(hasDraft);
  
  // Calculate draft age on initial render
  const [draftAge] = useState<number | undefined>(() => {
    if (hasDraft) {
      const draft = restore();
      if (draft?.updatedAt) {
        return Date.now() - draft.updatedAt;
      }
    }
    return undefined;
  });

  // Form data derived from draft state
  const formData = { title: draftTitle, content };

  // Auto-save draft when form changes
  const handleFormChange = useCallback((field: string, value: string) => {
    if (field === 'title') {
      setDraftTitle(value);
    } else if (field === 'content') {
      setContent(value);
    }
  }, [setContent, setDraftTitle]);

  // Restore draft
  const handleRestoreDraft = useCallback(() => {
    restore();
    setShowRestoreBanner(false);
  }, [restore]);

  // Discard draft
  const handleDiscardDraft = useCallback(() => {
    discard();
    setShowRestoreBanner(false);
  }, [discard]);

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
    startTransition(async () => {
      const result = await createThread({
        title: data.title,
        content: data.content,
        forumSlug: slug,
        tags: selectedTags.map(tag => tag.id),
      });

      if (result.success && result.data) {
        // Clear draft on successful submit
        clear();
        showSuccess(t("threads.threadCreated") || "¡Hilo creado exitosamente!");
        router.push(`/thread/${result.data.id}`);
      } else {
        showError(result.error || t("threads.errorCreating"));
        throw new Error(result.error);
      }
    });
  };

  return (
    <div className="lg:ml-(--sidebar-width) xl:mr-80">
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

        {/* Draft Restore Banner */}
        <DraftRestoreBanner
          show={showRestoreBanner}
          onRestore={handleRestoreDraft}
          onDiscard={handleDiscardDraft}
          draftAge={draftAge}
        />

        <div
          className="card"
          style={{
            borderLeft: "4px solid var(--brand)",
          }}
        >
          {/* Draft Indicator */}
          <div className="flex justify-end mb-4">
            <DraftIndicator
              hasDraft={hasDraft}
              lastSaved={lastSaved}
              isSaving={isSaving}
            />
          </div>

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
            values={formData}
            onChange={handleFormChange}
            onSubmit={handleSubmit}
            submitText={t("threads.createThread")}
          >
            {/* Tag Selector */}
            <div className="mb-6">
              <label
                className="block text-sm font-semibold mb-2"
                style={{ color: "var(--foreground)" }}
              >
                {t("tags.addTags")}
              </label>
              <TagSelector
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
                maxTags={5}
              />
            </div>
          </SimpleForm>
        </div>
      </div>
    </div>
  );
}
