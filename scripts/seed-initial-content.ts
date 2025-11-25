/**
 * Seed script for initial threads and comments
 * Run this script to populate the database with initial content
 * 
 * Usage: npx tsx scripts/seed-initial-content.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Faltan variables de entorno:");
  console.error("   NEXT_PUBLIC_SUPABASE_URL:", !!supabaseUrl);
  console.error("   SUPABASE_SERVICE_ROLE_KEY:", !!supabaseServiceKey);
  console.error("\n💡 Agrega estas variables a tu archivo .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ThreadData {
  forumSlug: string;
  title: string;
  content: string;
  comments: string[];
}

const initialContent: ThreadData[] = [
  {
    forumSlug: "minimalismo-digital",
    title: "Cómo limpiar el almacenamiento del celular sin sufrimiento",
    content: `¿Alguien más tiene el problema de que su celular siempre está lleno?

He encontrado una rutina simple que funciona:

1. **Fotos y videos**: Cada domingo reviso y borro lo que no necesito
2. **Apps**: Uso la función de "Apps no usadas" de iOS/Android
3. **Caché**: Limpio WhatsApp y otras apps pesadas cada mes
4. **Archivos descargados**: Carpeta de descargas → vaciar cada semana

La clave es hacerlo **rutinario**, no esperar a que esté lleno.

¿Qué estrategias usan ustedes?`,
    comments: [
      "Totalmente de acuerdo. La rutina es clave. Yo hago lo mismo pero los lunes.",
      "Pro tip: activa el backup automático de fotos y luego borra las que ya están en la nube.",
      "WhatsApp es el peor. Siempre termina ocupando 10GB+ si no lo limpias.",
    ],
  },
  {
    forumSlug: "organizacion-personal",
    title: "Mi sistema PARA simplificado",
    content: `Después de leer sobre PARA (Projects, Areas, Resources, Archives) de Tiago Forte, lo adapté a algo más simple:

**Mi versión:**
- **Activo**: Lo que estoy haciendo ahora (máx 3 proyectos)
- **Próximo**: Lo que sigue (máx 5 cosas)
- **Referencia**: Info útil pero no urgente
- **Archivo**: Todo lo demás

Uso Notion para esto. Simple, sin complicaciones.

¿Alguien más usa PARA? ¿Cómo lo adaptaron?`,
    comments: [
      "Me encanta la simplificación. El PARA original es demasiado complejo para mi vida.",
      "Yo uso algo similar pero con tags en Obsidian. Funciona genial.",
      "¿Podrías compartir tu template de Notion? Me interesa ver cómo lo estructuraste.",
    ],
  },
  {
    forumSlug: "organizacion-personal",
    title: "La rutina de organización semanal que sí funciona",
    content: `Después de probar mil sistemas, encontré uno que realmente funciona:

**Domingos a las 9am** (30 minutos):
1. Revisar la semana pasada (10 min)
2. Planificar la semana nueva (15 min)
3. Limpiar inbox y tareas completadas (5 min)

Eso es todo. Sin complicaciones, sin apps complejas, solo un cuaderno y 30 minutos.

Lo importante es la **consistencia**, no la herramienta.

¿Cuál es su rutina?`,
    comments: [
      "30 minutos es perfecto. No es tan poco que no sirva, ni tanto que lo abandones.",
      "Yo hago algo similar pero los viernes por la tarde. Me ayuda a cerrar la semana.",
      "El cuaderno físico es clave. Menos distracciones que las apps.",
    ],
  },
  {
    forumSlug: "productividad-inteligente",
    title: "GTD sin la complejidad: mi versión práctica",
    content: `Getting Things Done es genial, pero demasiado complejo para la mayoría.

**Mi versión simplificada:**

1. **Captura**: Todo va a una lista (inbox)
2. **Procesa**: Cada día reviso y decido: hacer, delegar, diferir o eliminar
3. **Organiza**: Máximo 3 listas: Hoy, Esta semana, Algún día
4. **Revisa**: Cada viernes reviso las listas

Sin contextos, sin proyectos complejos, sin complicaciones.

Funciona porque es **simple de mantener**.

¿Alguien más simplificó GTD?`,
    comments: [
      "GTD original es imposible de mantener. Tu versión tiene sentido.",
      "Yo uso algo parecido pero con 2 listas: Urgente y No urgente. Funciona.",
      "La clave es la revisión semanal. Sin eso, todo se desmorona.",
    ],
  },
  {
    forumSlug: "apps-herramientas",
    title: "¿Vale la pena pagar Notion AI?",
    content: `He estado usando Notion gratis por años y ahora están presionando mucho con Notion AI.

**Mi pregunta:** ¿Realmente vale la pena pagar $10/mes solo por AI?

He probado el trial y:
- ✅ Es útil para resumir páginas largas
- ✅ Ayuda a generar contenido rápido
- ❌ No es tan inteligente como ChatGPT
- ❌ A veces da respuestas genéricas

¿Alguien lo usa regularmente? ¿Vale la pena o mejor uso ChatGPT cuando lo necesito?`,
    comments: [
      "No vale la pena. ChatGPT hace lo mismo y mejor, y es más barato.",
      "Depende de tu uso. Si escribes mucho en Notion, puede ser útil. Si no, no.",
      "Yo lo cancelé después del trial. No justifica el precio para mi caso.",
    ],
  },
  {
    forumSlug: "apps-herramientas",
    title: "Obsidian vs Notion: ¿Cuál para organización personal?",
    content: `Estoy entre Obsidian y Notion para mi sistema personal.

**Obsidian:**
- ✅ Archivos locales (privacidad)
- ✅ Potente con plugins
- ✅ Gratis
- ❌ Más complejo de aprender

**Notion:**
- ✅ Más fácil de usar
- ✅ Colaboración mejor
- ✅ Templates geniales
- ❌ Todo en la nube (privacidad)
- ❌ Puede ser lento

¿Qué usan y por qué? ¿Se puede usar ambos?`,
    comments: [
      "Uso Obsidian para notas personales y Notion para proyectos colaborativos. Lo mejor de ambos.",
      "Obsidian si quieres control total. Notion si quieres simplicidad.",
      "Depende de tu flujo. Yo empecé con Notion pero migré a Obsidian por privacidad.",
    ],
  },
  {
    forumSlug: "minimalismo-digital",
    title: "Backups sin drama: guía de 10 minutos",
    content: `Los backups son importantes pero nadie los hace porque parecen complicados.

**Sistema simple de 3 capas:**

1. **Automático**: iCloud/Google Photos para fotos (ya lo tienes)
2. **Semanal**: Time Machine (Mac) o File History (Windows) - configura una vez y olvídate
3. **Mensual**: Disco externo para cosas importantes (10 min al mes)

Eso es todo. No necesitas servicios caros ni sistemas complejos.

**La regla 3-2-1 simplificada:**
- 3 copias (original + 2 backups)
- 2 medios diferentes (nube + disco)
- 1 fuera de casa (opcional pero recomendado)

¿Cómo hacen sus backups?`,
    comments: [
      "Time Machine es genial. Lo configuré hace años y nunca más pensé en backups.",
      "Yo uso Google Drive + disco externo. Simple y funciona.",
      "La clave es automatizar. Si tienes que recordar hacerlo, no lo harás.",
    ],
  },
  {
    forumSlug: "workflows-setup",
    title: "Mi setup minimalista: MacBook + iPhone + iPad",
    content: `Después de años probando diferentes dispositivos, encontré mi combo perfecto:

**Hardware:**
- MacBook Air M2 (trabajo y proyectos)
- iPhone 15 (comunicación y captura rápida)
- iPad Air (lectura y notas)

**Apps clave:**
- Notion (todo)
- Apple Notes (notas rápidas)
- Things 3 (tareas)
- iCloud (sincronización)

Todo sincronizado, sin complicaciones.

**Por qué funciona:**
- Ecosistema integrado
- Menos apps = menos fricción
- Todo en la nube automáticamente

¿Cuál es su setup? ¿Alguien más minimalista?`,
    comments: [
      "Similar pero con Android + Windows. Funciona bien con Google Workspace.",
      "Menos es más. Tengo solo MacBook + iPhone y es suficiente.",
      "El iPad es el dispositivo más infravalorado. Perfecto para leer y tomar notas.",
    ],
  },
  {
    forumSlug: "productividad-inteligente",
    title: "La técnica Pomodoro funciona, pero no como piensas",
    content: `Todos hablan de Pomodoro (25 min trabajo, 5 min descanso), pero la mayoría lo hace mal.

**Lo que funciona:**
- ✅ Usar temporizador físico (no app del celular)
- ✅ 25 min es perfecto para tareas enfocadas
- ✅ Los descansos son obligatorios, no opcionales

**Lo que NO funciona:**
- ❌ Usar el celular en los descansos (derrota el propósito)
- ❌ Pomodoros de más de 25 min (la atención se va)
- ❌ Saltarse los descansos

**Mi ajuste:** 25 min trabajo, 5 min descanso REAL (caminar, estirar, mirar por la ventana).

¿Usan Pomodoro? ¿Qué ajustes han hecho?`,
    comments: [
      "El temporizador físico es clave. Las apps te distraen.",
      "Yo uso 45 min trabajo, 15 min descanso. Funciona mejor para mi.",
      "Los descansos son lo más importante. Sin ellos, Pomodoro no funciona.",
    ],
  },
  {
    forumSlug: "organizacion-personal",
    title: "Zettelkasten para principiantes: mi método simple",
    content: `Zettelkasten suena complicado pero es solo: **tomar notas que se conectan**.

**Mi versión simplificada:**

1. **Notas permanentes**: Ideas importantes (una idea = una nota)
2. **Enlaces**: Conecta notas relacionadas con [[enlaces]]
3. **Índice**: Un índice con las notas principales

Eso es todo. Sin tags complejos, sin sistemas elaborados.

**Herramientas:**
- Obsidian (gratis, perfecto para esto)
- Notion (si prefieres algo más visual)
- Papel (si eres old school)

La clave es **empezar simple** y dejar que crezca orgánicamente.

¿Alguien más usa Zettelkasten?`,
    comments: [
      "Empecé hace 3 meses y ya tengo 200+ notas conectadas. Es adictivo.",
      "La clave es no complicarlo al inicio. Empieza simple y crece.",
      "Obsidian es perfecto para esto. Los enlaces bidireccionales son mágicos.",
    ],
  },
  {
    forumSlug: "apps-herramientas",
    title: "Google Workspace vs iCloud: ¿Cuál elegir?",
    content: `Estoy decidiendo entre Google Workspace y iCloud para mi ecosistema.

**Google Workspace:**
- ✅ Mejor colaboración
- ✅ Más espacio (15GB gratis vs 5GB)
- ✅ Funciona en todos los dispositivos
- ❌ Menos integrado con Apple

**iCloud:**
- ✅ Integración perfecta con Apple
- ✅ Más privado
- ✅ Sincronización instantánea
- ❌ Menos espacio gratis
- ❌ Colaboración limitada

Uso Mac + iPhone principalmente. ¿Qué recomiendan?`,
    comments: [
      "Si solo usas Apple, iCloud es mejor. Si colaboras mucho, Google.",
      "Yo uso ambos: iCloud para personal, Google para trabajo.",
      "Google Workspace es más potente pero iCloud es más simple.",
    ],
  },
  {
    forumSlug: "minimalismo-digital",
    title: "Cómo reducir notificaciones sin perder lo importante",
    content: `Las notificaciones son el enemigo de la productividad, pero algunas son necesarias.

**Mi sistema:**

1. **Solo sonidos/vibración para:**
   - Mensajes de familia/amigos cercanos
   - Llamadas importantes
   - Recordatorios críticos

2. **Solo badge (sin sonido) para:**
   - Email
   - Redes sociales
   - Apps de productividad

3. **Sin notificaciones para:**
   - Juegos
   - News apps
   - Marketing/promociones

**Resultado:** Reduje notificaciones en 80% sin perder nada importante.

¿Cómo manejan las notificaciones?`,
    comments: [
      "Modo No Molestar programado es clave. Lo tengo de 9pm a 8am.",
      "Yo desactivé todas y reviso manualmente 3 veces al día. Funciona mejor.",
      "Las notificaciones de email son las peores. Las desactivé completamente.",
    ],
  },
  {
    forumSlug: "workflows-setup",
    title: "Automatizaciones simples que realmente uso",
    content: `He probado mil automatizaciones complejas, pero solo estas realmente las uso:

**iOS Shortcuts:**
- "Buenos días": Enciende luces, lee el clima, reproduce música
- "Llegar a casa": Ajusta temperatura, enciende luces
- "Modo trabajo": Silencia notificaciones, activa Focus

**IFTTT/Zapier:**
- Backup automático de fotos a Google Photos
- Guardar tweets favoritos a Notion

**Eso es todo.** Simple, útil, sin complicaciones.

Las automatizaciones complejas nunca las uso porque son difíciles de mantener.

¿Qué automatizaciones realmente usan?`,
    comments: [
      "Menos es más. Tengo solo 2 automatizaciones y funcionan perfecto.",
      "Las automatizaciones complejas siempre fallan cuando menos las necesitas.",
      "Shortcuts de iOS es genial. Simple pero potente.",
    ],
  },
  {
    forumSlug: "productividad-inteligente",
    title: "Time blocking sin obsesionarse: mi método",
    content: `Time blocking es genial pero puede volverse obsesivo si lo haces mal.

**Mi método simple:**

1. **Bloqueo solo para:**
   - Trabajo profundo (mañanas)
   - Tareas importantes (máx 3 por día)
   - Reuniones

2. **NO bloqueo:**
   - Tareas pequeñas
   - Email
   - Tareas flexibles

3. **Flexibilidad:** Si algo urgente aparece, muevo bloques. No es rígido.

**Resultado:** Mejora la productividad sin volverse esclavo del calendario.

¿Usan time blocking? ¿Cómo lo adaptaron?`,
    comments: [
      "La flexibilidad es clave. Time blocking rígido es imposible de mantener.",
      "Yo bloqueo solo las mañanas para trabajo profundo. Las tardes son flexibles.",
      "Time blocking funciona mejor si bloqueas menos, no más.",
    ],
  },
  {
    forumSlug: "apps-herramientas",
    title: "Todoist vs Things 3: ¿Cuál es mejor?",
    content: `Estoy entre Todoist y Things 3 para gestionar tareas.

**Todoist:**
- ✅ Multiplataforma (Android, iOS, Web)
- ✅ Más barato
- ✅ Potente con filtros y etiquetas
- ❌ UI menos bonita
- ❌ Puede ser complejo

**Things 3:**
- ✅ UI hermosa y minimalista
- ✅ Simple de usar
- ✅ Integración perfecta con Apple
- ❌ Solo Apple (Mac, iPhone, iPad)
- ❌ Más caro
- ❌ Sin web app

Uso Mac + iPhone. ¿Qué recomiendan?`,
    comments: [
      "Things 3 si solo usas Apple. Todoist si necesitas multiplataforma.",
      "Things 3 es más caro pero vale cada peso. La UI es perfecta.",
      "Depende de tu flujo. Things es más simple, Todoist es más potente.",
    ],
  },
];

async function seedContent() {
  console.log("🌱 Starting seed process...");

  try {
    // Get all forums
    const { data: forums, error: forumsError } = await supabase
      .from("forums")
      .select("id, slug");

    if (forumsError) throw forumsError;

    if (!forums || forums.length === 0) {
      console.error("❌ No forums found. Please run migration 004 first.");
      process.exit(1);
    }

    const forumMap = new Map(forums.map((f) => [f.slug, f.id]));

    // Create a test user for seeding (or use existing)
    // Note: In production, you'd want to use an actual user ID
    let testUserId: string | null = null;

    // Try to get an existing user or create one
    const { data: users } = await supabase.auth.admin.listUsers();
    if (users && users.users.length > 0) {
      testUserId = users.users[0].id;
      console.log(`✅ Using existing user: ${testUserId}`);
    } else {
      console.log("⚠️  No users found. Threads will be created without user_id.");
      console.log("   Create a user account first, then re-run this script.");
    }

    let threadsCreated = 0;
    let commentsCreated = 0;

    for (const content of initialContent) {
      const forumId = forumMap.get(content.forumSlug);
      if (!forumId) {
        console.warn(`⚠️  Forum not found: ${content.forumSlug}`);
        continue;
      }

      // Create thread
      const { data: thread, error: threadError } = await supabase
        .from("threads")
        .insert({
          forum_id: forumId,
          title: content.title,
          content: content.content,
          user_id: testUserId,
          created_at: new Date(
            Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
          ).toISOString(), // Random date in last 7 days
        })
        .select()
        .single();

      if (threadError) {
        console.error(`❌ Error creating thread "${content.title}":`, threadError);
        continue;
      }

      threadsCreated++;
      console.log(`✅ Created thread: ${content.title}`);

      // Create comments for this thread
      for (const commentText of content.comments) {
        const { error: commentError } = await supabase.from("comments").insert({
          thread_id: thread.id,
          content: commentText,
          user_id: testUserId,
          created_at: new Date(
            Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000
          ).toISOString(), // Random date in last 5 days
        });

        if (commentError) {
          console.error(`❌ Error creating comment:`, commentError);
        } else {
          commentsCreated++;
        }
      }
    }

    console.log("\n✅ Seed completed!");
    console.log(`📊 Statistics:`);
    console.log(`   - Threads created: ${threadsCreated}`);
    console.log(`   - Comments created: ${commentsCreated}`);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

seedContent();

