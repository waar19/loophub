'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// Types
interface CreateThreadInput {
  title: string;
  content: string;
  forumSlug: string;
  tags?: string[];
}

interface UpdateThreadInput {
  id: string;
  title?: string;
  content?: string;
}

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Validations
function validateThread(data: CreateThreadInput): string | null {
  if (!data.title || data.title.trim().length < 3) {
    return 'El título debe tener al menos 3 caracteres';
  }
  if (data.title.length > 200) {
    return 'El título no puede exceder 200 caracteres';
  }
  if (!data.content || data.content.trim().length < 10) {
    return 'El contenido debe tener al menos 10 caracteres';
  }
  if (data.content.length > 10000) {
    return 'El contenido no puede exceder 10000 caracteres';
  }
  return null;
}

/**
 * Crear un nuevo thread
 */
export async function createThread(
  input: CreateThreadInput
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();

  // Verificar autenticación
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Debes iniciar sesión para crear un hilo' };
  }

  // Validar input
  const validationError = validateThread(input);
  if (validationError) {
    return { success: false, error: validationError };
  }

  // Obtener forum_id
  const { data: forum, error: forumError } = await supabase
    .from('forums')
    .select('id')
    .eq('slug', input.forumSlug)
    .single();

  if (forumError || !forum) {
    return { success: false, error: 'Foro no encontrado' };
  }

  // Verificar permisos del usuario (nivel mínimo para crear threads)
  const { data: profile } = await supabase
    .from('profiles')
    .select('level, is_banned')
    .eq('id', user.id)
    .single();

  if (profile?.is_banned) {
    return { success: false, error: 'Tu cuenta está suspendida' };
  }

  // Crear thread
  const { data: thread, error: insertError } = await supabase
    .from('threads')
    .insert({
      title: input.title.trim(),
      content: input.content.trim(),
      forum_id: forum.id,
      user_id: user.id,
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('Error creating thread:', insertError);
    return { success: false, error: 'Error al crear el hilo' };
  }

  // Añadir tags si se proporcionaron
  if (input.tags && input.tags.length > 0) {
    const threadTags = input.tags.slice(0, 5).map(tagId => ({
      thread_id: thread.id,
      tag_id: tagId,
    }));

    await supabase.from('thread_tags').insert(threadTags);
  }

  // Revalidar cache
  revalidatePath(`/forum/${input.forumSlug}`);
  revalidatePath('/');

  return { success: true, data: { id: thread.id } };
}

/**
 * Actualizar un thread existente
 */
export async function updateThread(
  input: UpdateThreadInput
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Debes iniciar sesión' };
  }

  // Verificar que el thread existe y pertenece al usuario
  const { data: thread, error: threadError } = await supabase
    .from('threads')
    .select('user_id, forum_id, forums(slug)')
    .eq('id', input.id)
    .single();

  if (threadError || !thread) {
    return { success: false, error: 'Hilo no encontrado' };
  }

  if (thread.user_id !== user.id) {
    // Verificar si es admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return { success: false, error: 'No tienes permisos para editar este hilo' };
    }
  }

  // Actualizar thread
  const updates: Record<string, string> = {};
  if (input.title) updates.title = input.title.trim();
  if (input.content) updates.content = input.content.trim();

  if (Object.keys(updates).length === 0) {
    return { success: false, error: 'No hay cambios para guardar' };
  }

  const { error: updateError } = await supabase
    .from('threads')
    .update(updates)
    .eq('id', input.id);

  if (updateError) {
    return { success: false, error: 'Error al actualizar el hilo' };
  }

  // Revalidar cache
  revalidatePath(`/thread/${input.id}`);
  const forums = thread.forums as unknown as { slug: string } | null;
  if (forums?.slug) {
    revalidatePath(`/forum/${forums.slug}`);
  }

  return { success: true };
}

/**
 * Eliminar un thread
 */
export async function deleteThread(threadId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Debes iniciar sesión' };
  }

  // Verificar permisos
  const { data: thread } = await supabase
    .from('threads')
    .select('user_id, forum_id, forums(slug)')
    .eq('id', threadId)
    .single();

  if (!thread) {
    return { success: false, error: 'Hilo no encontrado' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (thread.user_id !== user.id && profile?.role !== 'admin') {
    return { success: false, error: 'No tienes permisos para eliminar este hilo' };
  }

  // Eliminar thread
  const { error: deleteError } = await supabase
    .from('threads')
    .delete()
    .eq('id', threadId);

  if (deleteError) {
    return { success: false, error: 'Error al eliminar el hilo' };
  }

  const forums = thread.forums as unknown as { slug: string } | null;
  
  // Revalidar y redirigir
  if (forums?.slug) {
    revalidatePath(`/forum/${forums.slug}`);
  }
  revalidatePath('/');

  return { success: true };
}

/**
 * Votar en un thread
 */
export async function voteThread(
  threadId: string,
  voteType: 'up' | 'down'
): Promise<ActionResult<{ score: number }>> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Debes iniciar sesión para votar' };
  }

  const voteValue = voteType === 'up' ? 1 : -1;

  // Verificar voto existente
  const { data: existingVote } = await supabase
    .from('votes')
    .select('id, value')
    .eq('thread_id', threadId)
    .eq('user_id', user.id)
    .single();

  if (existingVote) {
    if (existingVote.value === voteValue) {
      // Quitar voto
      await supabase.from('votes').delete().eq('id', existingVote.id);
    } else {
      // Cambiar voto
      await supabase.from('votes').update({ value: voteValue }).eq('id', existingVote.id);
    }
  } else {
    // Nuevo voto
    await supabase.from('votes').insert({
      thread_id: threadId,
      user_id: user.id,
      value: voteValue,
    });
  }

  // Obtener nuevo score
  const { data: votes } = await supabase
    .from('votes')
    .select('value')
    .eq('thread_id', threadId);

  const score = votes?.reduce((acc, v) => acc + v.value, 0) || 0;

  revalidatePath(`/thread/${threadId}`);

  return { success: true, data: { score } };
}
