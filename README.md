# LoopHub - Modern Forum Platform

A minimalist forum platform built with Next.js 15, Supabase, and Tailwind CSS.

## Features

- 🎨 Clean, minimalist design
- 💬 Forum discussions with threads and comments
- 🚀 Next.js 15 App Router
- 📦 Supabase PostgreSQL database
- ✅ Zod validation
- 🎯 SEO-optimized
- ☁️ Vercel-ready

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Validation**: Zod
- **Styling**: Tailwind CSS v4
- **Deployment**: Vercel

## Quick Start

### 1. Prerequisites

- Node.js 18+
- A Supabase account ([supabase.com](https://supabase.com))

### 2. Install Dependencies

```bash
cd loophub
npm install
```

### 3. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Project Settings** → **API**
3. Copy your **Project URL** and **anon public** key

### 4. Configure Environment

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
```

### 5. Create Database Tables

In your Supabase project, go to **SQL Editor** and run the migration:

```bash
# Copy the contents of supabase/migrations/001_initial_schema.sql
# Paste and run in Supabase SQL Editor
```

This creates:

- `forums` table
- `threads` table
- `comments` table
- Indexes for performance
- 3 sample forums

### 6. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

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
