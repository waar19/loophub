import { requireAdmin } from '@/lib/admin';
import { createClient } from '@/lib/supabase-server';
import Link from 'next/link';
import ForumManager from './ForumManager';
import { cookies } from 'next/headers';
import { translations, defaultLocale, Locale } from '@/lib/i18n/translations';

export default async function ForumsPage() {
  await requireAdmin();
  const supabase = await createClient();
  
  // Get locale from cookie
  const cookieStore = await cookies();
  const locale = (cookieStore.get('locale')?.value || defaultLocale) as Locale;
  const t = translations[locale];

  // Fetch all forums (only existing columns: id, name, slug, created_at)
  const { data: forums, error } = await supabase
    .from('forums')
    .select('id, name, slug, created_at')
    .order('name');

  if (error) {
    console.error('Error fetching forums:', error);
  }

  // Fetch thread counts separately
  const forumsWithCount = await Promise.all(
    (forums || []).map(async (forum) => {
      const { count } = await supabase
        .from('threads')
        .select('*', { count: 'exact', head: true })
        .eq('forum_id', forum.id);
      
      return {
        ...forum,
        description: null,
        icon: '📁',
        color: '#8B5CF6',
        thread_count: count || 0,
      };
    })
  );

  return (
    <div className="lg:ml-(--sidebar-width) min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t.admin.forumsManagement}</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
              {t.admin.forumsDescription}
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
            ← {t.admin.backToAdmin}
          </Link>
        </div>

        <ForumManager forums={forumsWithCount} />
      </div>
    </div>
  );
}
