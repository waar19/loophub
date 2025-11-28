'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Check if current user is moderator of a forum
 */
export async function checkModeratorStatus(forumId: string): Promise<ActionResult<{
  isModerator: boolean;
  isAdmin: boolean;
  permissions: Record<string, boolean>;
}>> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: true, data: { isModerator: false, isAdmin: false, permissions: {} } };
  }

  // Check if admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (profile?.is_admin) {
    return {
      success: true,
      data: {
        isModerator: true,
        isAdmin: true,
        permissions: {
          can_delete_threads: true,
          can_delete_comments: true,
          can_hide_content: true,
          can_pin_threads: true,
          can_lock_threads: true,
          can_manage_reports: true,
        },
      },
    };
  }

  // Check forum moderator
  const { data: modRecord } = await supabase
    .from('forum_moderators')
    .select('permissions')
    .eq('user_id', user.id)
    .eq('forum_id', forumId)
    .single();

  if (modRecord) {
    return {
      success: true,
      data: {
        isModerator: true,
        isAdmin: false,
        permissions: modRecord.permissions as Record<string, boolean>,
      },
    };
  }

  return { success: true, data: { isModerator: false, isAdmin: false, permissions: {} } };
}

/**
 * Pin or unpin a thread
 */
export async function togglePinThread(
  threadId: string,
  pin: boolean
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Debes iniciar sesión' };
  }

  if (pin) {
    const { error } = await supabase.rpc('pin_thread', {
      p_thread_id: threadId,
    });

    if (error) {
      console.error('Error pinning thread:', error);
      // Check if it's max pinned error
      if (error.message?.includes('Maximum') || error.message?.includes('máximo')) {
        return { success: false, error: 'Máximo de hilos fijados alcanzado (3 por foro)' };
      }
      return { success: false, error: error.message };
    }
  } else {
    const { error } = await supabase.rpc('unpin_thread', {
      p_thread_id: threadId,
    });

    if (error) {
      console.error('Error unpinning thread:', error);
      return { success: false, error: error.message };
    }
  }

  revalidatePath('/forum/[slug]', 'page');
  revalidatePath('/thread/[id]', 'page');

  return { success: true };
}

/**
 * Lock or unlock a thread
 */
export async function toggleLockThread(
  threadId: string,
  lock: boolean,
  reason?: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Debes iniciar sesión' };
  }

  const { error } = await supabase.rpc('toggle_thread_lock', {
    p_thread_id: threadId,
    p_lock: lock,
    p_reason: reason || null,
  });

  if (error) {
    console.error('Error toggling lock:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/thread/[id]', 'page');

  return { success: true };
}

/**
 * Hide or unhide a thread (moderator action)
 */
export async function moderateHideThread(
  threadId: string,
  hide: boolean,
  reason?: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Debes iniciar sesión' };
  }

  const { error } = await supabase.rpc('moderate_hide_thread', {
    p_thread_id: threadId,
    p_hide: hide,
    p_reason: reason || null,
  });

  if (error) {
    console.error('Error hiding thread:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/forum/[slug]', 'page');
  revalidatePath('/thread/[id]', 'page');

  return { success: true };
}

/**
 * Handle a report
 */
export async function handleReport(
  reportId: string,
  status: 'reviewed' | 'dismissed',
  resolutionNote?: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Debes iniciar sesión' };
  }

  const { error } = await supabase.rpc('handle_report', {
    p_report_id: reportId,
    p_status: status,
    p_resolution_note: resolutionNote || null,
  });

  if (error) {
    console.error('Error handling report:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin');

  return { success: true };
}

/**
 * Add a moderator to a forum
 */
export async function addForumModerator(
  forumId: string,
  userId: string,
  permissions?: Record<string, boolean>
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Debes iniciar sesión' };
  }

  // Check if admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return { success: false, error: 'Solo los administradores pueden añadir moderadores' };
  }

  const defaultPermissions = {
    can_delete_threads: true,
    can_delete_comments: true,
    can_hide_content: true,
    can_pin_threads: true,
    can_lock_threads: true,
    can_manage_reports: true,
  };

  const { error } = await supabase.from('forum_moderators').insert({
    forum_id: forumId,
    user_id: userId,
    appointed_by: user.id,
    permissions: permissions || defaultPermissions,
  });

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Este usuario ya es moderador de este foro' };
    }
    console.error('Error adding moderator:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/moderators');

  return { success: true };
}

/**
 * Remove a moderator from a forum
 */
export async function removeForumModerator(
  forumId: string,
  userId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Debes iniciar sesión' };
  }

  // Check if admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return { success: false, error: 'Solo los administradores pueden remover moderadores' };
  }

  const { error } = await supabase
    .from('forum_moderators')
    .delete()
    .eq('forum_id', forumId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error removing moderator:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/moderators');

  return { success: true };
}

/**
 * Get forum moderators
 */
export async function getForumModerators(forumId: string): Promise<ActionResult<Array<{
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  permissions: Record<string, boolean>;
  created_at: string;
}>>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('forum_moderators')
    .select(`
      id,
      user_id,
      permissions,
      created_at,
      profile:profiles!user_id(username, avatar_url)
    `)
    .eq('forum_id', forumId);

  if (error) {
    console.error('Error fetching moderators:', error);
    return { success: false, error: error.message };
  }

  const moderators = data?.map((mod) => ({
    id: mod.id,
    user_id: mod.user_id,
    username: (mod.profile as unknown as { username: string })?.username || 'Unknown',
    avatar_url: (mod.profile as unknown as { avatar_url: string | null })?.avatar_url,
    permissions: mod.permissions as Record<string, boolean>,
    created_at: mod.created_at,
  })) || [];

  return { success: true, data: moderators };
}

/**
 * Get moderation log for a forum
 */
export async function getModerationLog(
  forumId: string,
  limit = 50
): Promise<ActionResult<Array<{
  id: string;
  action_type: string;
  target_type: string;
  target_id: string;
  reason: string | null;
  created_at: string;
  moderator_username: string;
}>>> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Debes iniciar sesión' };
  }

  const { data, error } = await supabase
    .from('moderation_log')
    .select(`
      id,
      action_type,
      target_type,
      target_id,
      reason,
      created_at,
      moderator:profiles!moderator_id(username)
    `)
    .eq('forum_id', forumId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching moderation log:', error);
    return { success: false, error: error.message };
  }

  const logs = data?.map((log) => ({
    id: log.id,
    action_type: log.action_type,
    target_type: log.target_type,
    target_id: log.target_id,
    reason: log.reason,
    created_at: log.created_at,
    moderator_username: (log.moderator as unknown as { username: string })?.username || 'Unknown',
  })) || [];

  return { success: true, data: logs };
}

/**
 * Delete a comment as moderator
 */
export async function moderateDeleteComment(
  commentId: string,
  forumId: string,
  reason?: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Debes iniciar sesión' };
  }

  // Check permission
  const modStatus = await checkModeratorStatus(forumId);
  if (!modStatus.data?.permissions?.can_delete_comments) {
    return { success: false, error: 'No tienes permiso para eliminar comentarios en este foro' };
  }

  // Delete the comment
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    console.error('Error deleting comment:', error);
    return { success: false, error: error.message };
  }

  // Log the action
  await supabase.from('moderation_log').insert({
    moderator_id: user.id,
    forum_id: forumId,
    action_type: 'delete_comment',
    target_type: 'comment',
    target_id: commentId,
    reason,
  });

  revalidatePath('/thread/[id]', 'page');

  return { success: true };
}
