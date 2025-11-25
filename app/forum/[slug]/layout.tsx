import { Metadata } from "next";
import { headers } from "next/headers";
import { supabase } from "@/lib/supabase";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  
  // Fetch forum name for metadata directly from database
  try {
    const { data: forum } = await supabase
      .from("forums")
      .select("name")
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
      
      return {
        title: `${forum.name} - LoopHub`,
        description: descriptions[slug] || `Discusiones sobre ${forum.name}`,
      };
    }
  } catch (error) {
    console.error("Error generating metadata:", error);
  }

  return {
    title: "Foro - LoopHub",
    description: "Comunidad de minimalismo digital y organización personal",
  };
}

export default function ForumLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

