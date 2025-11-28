'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

interface UpdateProfileInput {
  bio?: string;
  website?: string;
  location?: string;
  twitter?: string;
  github?: string;
}

interface NotificationSettingsInput {
  email_notifications?: boolean;
  browser_notifications?: boolean;
  sound_enabled?: boolean;
  notify_replies?: boolean;
  notify_mentions?: boolean;
  notify_votes?: boolean;
  notify_followers?: boolean;
}

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Actualizar perfil del usuario
 */
export async function updateProfile(
  input: UpdateProfileInput
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Debes iniciar sesión' };
  }

  // Validar URLs
  if (input.website && !isValidUrl(input.website)) {
    return { success: false, error: 'URL del sitio web inválida' };
  }

  // Limpiar inputs
  const updates: Record<string, string | null> = {};
  if (input.bio !== undefined) updates.bio = input.bio?.trim() || null;
  if (input.website !== undefined) updates.website = input.website?.trim() || null;
  if (input.location !== undefined) updates.location = input.location?.trim() || null;
  if (input.twitter !== undefined) updates.twitter = input.twitter?.replace('@', '').trim() || null;
  if (input.github !== undefined) updates.github = input.github?.trim() || null;

  const { error: updateError } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id);

  if (updateError) {
    console.error('Error updating profile:', updateError);
    return { success: false, error: 'Error al actualizar el perfil' };
  }

  // Obtener username para revalidar
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  if (profile?.username) {
    revalidatePath(`/u/${profile.username}`);
  }
  revalidatePath('/settings');

  return { success: true };
}

/**
 * Actualizar configuración de notificaciones
 */
export async function updateNotificationSettings(
  input: NotificationSettingsInput
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Debes iniciar sesión' };
  }

  // Upsert notification settings
  const { error: upsertError } = await supabase
    .from('notification_settings')
    .upsert({
      user_id: user.id,
      ...input,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    });

  if (upsertError) {
    console.error('Error updating notification settings:', upsertError);
    return { success: false, error: 'Error al actualizar configuración' };
  }

  revalidatePath('/settings');

  return { success: true };
}

/**
 * Cambiar username (una vez gratis, luego requiere pago)
 */
export async function changeUsername(
  newUsername: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Debes iniciar sesión' };
  }

  // Validar username
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  if (!usernameRegex.test(newUsername)) {
    return { 
      success: false, 
      error: 'El nombre de usuario debe tener 3-20 caracteres y solo letras, números y guiones bajos' 
    };
  }

  // Verificar disponibilidad
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', newUsername.toLowerCase())
    .neq('id', user.id)
    .single();

  if (existing) {
    return { success: false, error: 'Este nombre de usuario ya está en uso' };
  }

  // Verificar si ya usó cambio gratuito
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, username_changed_at')
    .eq('id', user.id)
    .single();

  if (profile?.username_changed_at) {
    return { 
      success: false, 
      error: 'Ya has usado tu cambio de nombre de usuario gratuito' 
    };
  }

  const oldUsername = profile?.username;

  // Actualizar username
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      username: newUsername.toLowerCase(),
      username_changed_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (updateError) {
    return { success: false, error: 'Error al cambiar el nombre de usuario' };
  }

  // Revalidar rutas
  if (oldUsername) {
    revalidatePath(`/u/${oldUsername}`);
  }
  revalidatePath(`/u/${newUsername.toLowerCase()}`);
  revalidatePath('/settings');

  return { success: true };
}

/**
 * Toggle bookmark en un thread
 */
export async function toggleBookmark(
  threadId: string
): Promise<ActionResult<{ isBookmarked: boolean }>> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Debes iniciar sesión' };
  }

  // Verificar si ya existe
  const { data: existing } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('user_id', user.id)
    .eq('thread_id', threadId)
    .single();

  if (existing) {
    // Eliminar bookmark
    await supabase
      .from('bookmarks')
      .delete()
      .eq('id', existing.id);

    revalidatePath('/bookmarks');
    return { success: true, data: { isBookmarked: false } };
  } else {
    // Crear bookmark
    const { error: insertError } = await supabase
      .from('bookmarks')
      .insert({
        user_id: user.id,
        thread_id: threadId,
      });

    if (insertError) {
      return { success: false, error: 'Error al guardar el bookmark' };
    }

    revalidatePath('/bookmarks');
    return { success: true, data: { isBookmarked: true } };
  }
}

/**
 * Toggle suscripción a un thread
 */
export async function toggleSubscription(
  threadId: string
): Promise<ActionResult<{ isSubscribed: boolean }>> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Debes iniciar sesión' };
  }

  const { data: existing } = await supabase
    .from('thread_subscriptions')
    .select('id')
    .eq('user_id', user.id)
    .eq('thread_id', threadId)
    .single();

  if (existing) {
    await supabase
      .from('thread_subscriptions')
      .delete()
      .eq('id', existing.id);

    return { success: true, data: { isSubscribed: false } };
  } else {
    const { error: insertError } = await supabase
      .from('thread_subscriptions')
      .insert({
        user_id: user.id,
        thread_id: threadId,
      });

    if (insertError) {
      return { success: false, error: 'Error al suscribirse' };
    }

    return { success: true, data: { isSubscribed: true } };
  }
}

/**
 * Reportar contenido
 */
export async function reportContent(
  contentType: 'thread' | 'comment',
  contentId: string,
  reason: string,
  details?: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Debes iniciar sesión' };
  }

  if (!reason) {
    return { success: false, error: 'Debes seleccionar un motivo' };
  }

  const { error: insertError } = await supabase
    .from('reports')
    .insert({
      reporter_id: user.id,
      content_type: contentType,
      content_id: contentId,
      reason,
      details: details?.trim() || null,
      status: 'pending',
    });

  if (insertError) {
    console.error('Error creating report:', insertError);
    return { success: false, error: 'Error al enviar el reporte' };
  }

  return { success: true };
}

// Helper functions
function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}
