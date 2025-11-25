# LoopHub

Plataforma de comunidad enfocada en **Minimalismo Digital** y **Organización Personal**. Construida con Next.js 15, Supabase y Tailwind CSS.

## Características

- 🎨 Diseño minimalista y limpio
- 💬 Foros de discusión con hilos y comentarios
- 🌙 Modo oscuro integrado
- 📝 Soporte completo de Markdown
- 🔄 Paginación con infinite scroll
- 🚀 Next.js 15 App Router
- 📦 Supabase PostgreSQL database
- ✅ Validación con Zod
- 🎯 SEO optimizado
- ☁️ Listo para Vercel

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Validation**: Zod
- **Styling**: Tailwind CSS v4
- **Markdown**: react-markdown con syntax highlighting
- **Deployment**: Vercel

## Temáticas

- **Minimalismo Digital**: Limpieza de vida digital, archivos, hábitos tecnológicos
- **Organización Personal**: Métodos, rutinas, sistemas de organización realistas
- **Productividad Inteligente**: Técnicas aterrizadas, sin fanatismo ni gurús
- **Apps y Herramientas**: Notion, Obsidian, Todoist, Google Workspace, Apple Notes
- **Workflows & Setup**: Rutinas, automatizaciones, dispositivos, ambientes de trabajo

## Quick Start

### 1. Prerequisites

- Node.js 18+
- Una cuenta de Supabase ([supabase.com](https://supabase.com))

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configurar Supabase

1. Crea un nuevo proyecto en [supabase.com](https://supabase.com)
2. Ve a **Project Settings** → **API**
3. Copia tu **Project URL** y **anon public** key
4. Para el seed script, necesitarás el **Service Role Key** (solo para desarrollo)

### 4. Configurar Variables de Entorno

Crea `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"  # Solo para seeds
```

### 5. Crear Tablas de Base de Datos

En tu proyecto de Supabase, ve a **SQL Editor** y ejecuta las migraciones en orden:

1. `supabase/migrations/001_initial_schema.sql` - Schema inicial
2. `supabase/migrations/002_add_authentication.sql` - Autenticación
3. `supabase/migrations/003_add_moderation.sql` - Moderación
4. `supabase/migrations/004_seed_minimalist_forums.sql` - Foros iniciales

### 6. Poblar con Contenido Inicial (Opcional)

Ejecuta el script de seed para crear hilos y comentarios iniciales:

```bash
npx tsx scripts/seed-initial-content.ts
```

**Nota**: Necesitas tener al menos un usuario creado en Supabase antes de ejecutar el seed.

### 7. Ejecutar Servidor de Desarrollo

```bash
npm run dev
```

Visita [http://localhost:3000](http://localhost:3000)

## Estructura de Foros

La plataforma incluye 5 foros predefinidos:

1. **Minimalismo Digital** (`minimalismo-digital`)
2. **Organización Personal** (`organizacion-personal`)
3. **Productividad Inteligente** (`productividad-inteligente`)
4. **Apps y Herramientas** (`apps-herramientas`)
5. **Workflows & Setup** (`workflows-setup`)

## Database Schema

### Forums

```sql
id UUID PRIMARY KEY
name TEXT
slug TEXT UNIQUE
created_at TIMESTAMPTZ
```

### Threads

```sql
id UUID PRIMARY KEY
forum_id UUID → forums(id)
title TEXT
content TEXT
created_at TIMESTAMPTZ
```

### Comments

```sql
id UUID PRIMARY KEY
thread_id UUID → threads(id)
content TEXT
created_at TIMESTAMPTZ
```

## API Endpoints

### Forums

- `GET /api/forums` - List all forums
- `POST /api/forums` - Create forum

### Threads

- `GET /api/forums/[slug]/threads` - Get forum threads
- `POST /api/forums/[slug]/threads` - Create thread

### Comments

- `GET /api/threads/[id]/comments` - Get thread comments
- `POST /api/threads/[id]/comments` - Add comment

### Admin

- `DELETE /api/admin/thread/[id]` - Delete thread
- `DELETE /api/admin/comment/[id]` - Delete comment

## Deploy to Vercel

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push
```

### 2. Deploy on Vercel

1. Import your repo at [vercel.com](https://vercel.com)
2. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy!

## Project Structure

```
loophub/
├── app/
│   ├── api/              # API routes
│   ├── forum/[slug]/     # Forum pages
│   ├── thread/[id]/      # Thread pages
│   ├── globals.css       # Styles
│   ├── layout.tsx        # Layout
│   └── page.tsx          # Home
├── components/           # UI components
├── lib/
│   ├── supabase.ts      # Supabase client
│   └── validations.ts   # Zod schemas
├── supabase/
│   └── migrations/      # SQL migrations
└── vercel.json          # Vercel config
```

## Development

```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run start    # Start production
npm run lint     # Run linter
```

## Customization

### Add Forums

Run in Supabase SQL Editor:

```sql
INSERT INTO forums (name, slug)
VALUES ('My Forum', 'my-forum');
```

### Update Styles

Edit `app/globals.css`:

```css
:root {
  --accent: #3b82f6; /* Primary color */
  --background: #fafafa; /* Background */
}
```

## License

MIT
