import { requireAdmin } from '@/lib/admin';
import { createClient } from '@/lib/supabase-server';
import Link from 'next/link';
import ModeratorManager from './ModeratorManager';

export default async function ModeratorsPage() {
  await requireAdmin();
  const supabase = await createClient();

  // Fetch all forums
  const { data: forums } = await supabase
    .from('forums')
    .select('id, name, slug')
    .order('name');

  // Fetch all moderators with their forum and profile info
  const { data: rawModerators } = await supabase
    .from('forum_moderators')
    .select(`
      id,
      forum_id,
      user_id,
      permissions,
      created_at,
      forum:forums(name, slug),
      profile:profiles!user_id(username, avatar_url),
      appointed_by_profile:profiles!appointed_by(username)
    `)
    .order('created_at', { ascending: false });

  // Transform the data to match expected types (Supabase returns arrays for single relations)
  const moderators = (rawModerators || []).map((mod) => ({
    id: mod.id,
    forum_id: mod.forum_id,
    user_id: mod.user_id,
    permissions: mod.permissions as Record<string, boolean>,
    created_at: mod.created_at,
    forum: Array.isArray(mod.forum) ? mod.forum[0] : mod.forum,
    profile: Array.isArray(mod.profile) ? mod.profile[0] : mod.profile,
    appointed_by_profile: Array.isArray(mod.appointed_by_profile) 
      ? mod.appointed_by_profile[0] 
      : mod.appointed_by_profile,
  }));

  // Fetch all users for adding new moderators
  const { data: users } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, is_admin')
    .order('username');

  return (
    <div className="lg:ml-(--sidebar-width) min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestión de Moderadores</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
              Asigna moderadores a foros específicos
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

        <ModeratorManager
          forums={forums || []}
          moderators={moderators}
          users={users || []}
        />
      </div>
    </div>
  );
}
