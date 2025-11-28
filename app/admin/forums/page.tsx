import { requireAdmin } from '@/lib/admin';
import { createClient } from '@/lib/supabase-server';
import Link from 'next/link';
import ForumManager from './ForumManager';

export default async function ForumsPage() {
  await requireAdmin();
  const supabase = await createClient();

  // Fetch all forums with thread count
  const { data: forums } = await supabase
    .from('forums')
    .select(`
      id,
      name,
      slug,
      description,
      icon,
      color,
      created_at,
      threads:threads(count)
    `)
    .order('name');

  // Transform data to include thread count
  const forumsWithCount = (forums || []).map((forum) => ({
    ...forum,
    thread_count: Array.isArray(forum.threads) 
      ? forum.threads[0]?.count || 0 
      : 0,
  }));

  return (
    <div className="lg:ml-(--sidebar-width) min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestión de Foros</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
              Crea, edita y elimina foros
            </p>
          </div>
          <Link
            href="/admin"
            className="btn"
            style={{
              background: 'var(--card-bg)',
              color: 'var(--foreground)',
              border: '1px solid var(--border)',
            }}
          >
            ← Volver al Admin
          </Link>
        </div>

        <ForumManager forums={forumsWithCount} />
      </div>
    </div>
  );
}
