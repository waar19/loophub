import { Metadata } from "next";
import { createClient } from "@/lib/supabase-server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  try {
    const supabase = await createClient();
    const { data: thread } = await supabase
      .from("threads")
      .select(`
        title,
        content,
        created_at,
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

      return {
        title: `${thread.title} - ${thread.forums.name} | LoopHub`,
        description: preview,
        openGraph: {
          title: thread.title,
          description: preview,
          type: "article",
          publishedTime: thread.created_at,
        },
        twitter: {
          card: "summary",
          title: thread.title,
          description: preview,
        },
      };
    }
  } catch (error) {
    console.error("Error generating thread metadata:", error);
  }

  return {
    title: "Hilo - LoopHub",
    description: "Comunidad de minimalismo digital y organización personal",
  };
}

export default function ThreadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

