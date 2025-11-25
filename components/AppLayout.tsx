import { createClient } from "@/lib/supabase-server";
import Header from "./Header";
import Sidebar from "./Sidebar";
import Footer from "./Footer";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: forums, error } = await supabase
    .from("forums")
    .select("id, name, slug")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching forums in AppLayout:", error);
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
      <Header />
      <div 
        className="flex flex-1" 
        style={{ marginTop: "var(--header-height)" }}
      >
        <Sidebar forums={forums || []} />
        <main className="flex-1 min-w-0 w-full">
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
}

