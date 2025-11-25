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
      return {
        title: `${forum.name} - LoopHub`,
        description: `Discussion threads in ${forum.name} forum`,
      };
    }
  } catch (error) {
    console.error("Error generating metadata:", error);
  }

  return {
    title: "Forum - LoopHub",
    description: "Discussion forum",
  };
}

export default function ForumLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

