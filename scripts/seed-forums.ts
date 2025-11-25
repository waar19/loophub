/**
 * Script para poblar los foros en Supabase
 * Ejecuta: npx tsx scripts/seed-forums.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Faltan variables de entorno:");
  console.error("   - NEXT_PUBLIC_SUPABASE_URL");
  console.error("   - SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const forums = [
  {
    name: "Minimalismo Digital",
    slug: "minimalismo-digital",
    description: "Limpieza de vida digital, archivos, hábitos tecnológicos.",
  },
  {
    name: "Organización Personal",
    slug: "organizacion-personal",
    description: "Métodos, rutinas, sistemas de organización realistas.",
  },
  {
    name: "Productividad Inteligente",
    slug: "productividad-inteligente",
    description: "Sin fanatismo, sin gurús; técnicas aterrizadas.",
  },
  {
    name: "Apps y Herramientas",
    slug: "apps-herramientas",
    description: "Notion, Obsidian, Todoist, Google Workspace, Apple Notes.",
  },
  {
    name: "Workflows & Setup",
    slug: "workflows-setup",
    description: "Rutinas, automatizaciones, dispositivos, ambientes de trabajo.",
  },
];

async function seedForums() {
  console.log("🌱 Iniciando seed de foros...\n");

  try {
    // Verificar si la columna description existe
    const { error: alterError } = await supabase.rpc("exec_sql", {
      sql: `
        ALTER TABLE forums
        ADD COLUMN IF NOT EXISTS description TEXT;
      `,
    });

    if (alterError && !alterError.message.includes("already exists")) {
      console.warn("⚠️  No se pudo agregar la columna description (puede que ya exista):", alterError.message);
    }

    // Insertar foros
    for (const forum of forums) {
      const { data, error } = await supabase
        .from("forums")
        .upsert(
          {
            name: forum.name,
            slug: forum.slug,
            description: forum.description,
          },
          {
            onConflict: "slug",
          }
        )
        .select()
        .single();

      if (error) {
        console.error(`❌ Error al crear foro "${forum.name}":`, error.message);
      } else {
        console.log(`✅ Foro creado/actualizado: ${forum.name} (${forum.slug})`);
      }
    }

    // Verificar que se crearon correctamente
    const { data: allForums, error: fetchError } = await supabase
      .from("forums")
      .select("id, name, slug, description")
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("❌ Error al verificar foros:", fetchError.message);
      process.exit(1);
    }

    console.log(`\n✅ Seed completado. Total de foros: ${allForums?.length || 0}`);
    console.log("\nForos disponibles:");
    allForums?.forEach((forum) => {
      console.log(`   - ${forum.name} (${forum.slug})`);
    });
  } catch (error) {
    console.error("❌ Error inesperado:", error);
    process.exit(1);
  }
}

seedForums();

