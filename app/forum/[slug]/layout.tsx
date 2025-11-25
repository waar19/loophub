import { Metadata } from "next";
import { createClient } from "@/lib/supabase-server";
import { getBaseUrl, getFullUrl } from "@/lib/url-helpers";
import { ForumStructuredData } from "@/components/StructuredData";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const baseUrl = getBaseUrl();
  const forumUrl = getFullUrl(`/forum/${slug}`);
  
  // Fetch forum name for metadata directly from database
  try {
    const supabase = await createClient();
    const { data: forum } = await supabase
      .from("forums")
      .select("name, description")
      .eq("slug", slug)
      .single();
    
    if (forum) {
      const descriptions: Record<string, string> = {
        "minimalismo-digital": "Limpieza de vida digital, archivos, hábitos tecnológicos y minimalismo tecnológico",
        "organizacion-personal": "Métodos, rutinas y sistemas de organización personal realistas",
        "productividad-inteligente": "Técnicas de productividad aterrizadas, sin fanatismo ni gurús",
        "apps-herramientas": "Notion, Obsidian, Todoist, Google Workspace, Apple Notes y más herramientas de organización",
        "workflows-setup": "Rutinas, automatizaciones, dispositivos y ambientes de trabajo optimizados",
      };
      
      const description = forum.description || descriptions[slug] || `Discusiones sobre ${forum.name}`;
      const ogImageUrl = `${baseUrl}/api/og?forum=${encodeURIComponent(forum.name)}`;
      
      return {
        title: `${forum.name} - LoopHub`,
        description: description,
        alternates: {
          canonical: forumUrl,
        },
        openGraph: {
          title: `${forum.name} - LoopHub`,
          description: description,
          url: forumUrl,
          siteName: "LoopHub",
          type: "website",
          images: [
            {
              url: ogImageUrl,
              width: 1200,
              height: 630,
              alt: forum.name,
            },
          ],
        },
        twitter: {
          card: "summary_large_image",
          title: `${forum.name} - LoopHub`,
          description: description,
          images: [
            {
              url: ogImageUrl,
              alt: forum.name,
            },
          ],
        },
      };
    }
  } catch (error) {
    console.error("Error generating metadata:", error);
  }

  return {
    title: "Foro - LoopHub",
    description: "Comunidad de minimalismo digital y organización personal",
    alternates: {
      canonical: forumUrl,
    },
  };
}

export default async function ForumLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  
  // Fetch forum data for structured data
  let forumData = null;
  try {
    const supabase = await createClient();
    const { data: forum } = await supabase
      .from("forums")
      .select("name, slug, description")
      .eq("slug", slug)
      .single();

    if (forum) {
      forumData = {
        name: forum.name,
        slug: forum.slug,
        description: forum.description || undefined,
      };
    }
  } catch (error) {
    console.error("Error fetching forum for structured data:", error);
  }

  return (
    <>
      {forumData && <ForumStructuredData forum={forumData} />}
      {children}
    </>
  );
}

