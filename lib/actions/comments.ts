'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

interface CreateCommentInput {
  threadId: string;
  content: string;
  parentId?: string | null;
}

interface UpdateCommentInput {
  id: string;
  content: string;
}

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Crear un nuevo comentario
 */
export async function createComment(
  input: CreateCommentInput
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Debes iniciar sesión para comentar' };
  }

  // Validar contenido
  if (!input.content || input.content.trim().length < 1) {
    return { success: false, error: 'El comentario no puede estar vacío' };
  }
  if (input.content.length > 5000) {
    return { success: false, error: 'El comentario no puede exceder 5000 caracteres' };
  }

  // Verificar que el thread existe
  const { data: thread, error: threadError } = await supabase
    .from('threads')
    .select('id, is_locked')
    .eq('id', input.threadId)
    .single();

  if (threadError || !thread) {
    return { success: false, error: 'Hilo no encontrado' };
  }

  if (thread.is_locked) {
    return { success: false, error: 'Este hilo está cerrado para nuevos comentarios' };
  }

  // Verificar usuario
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_banned')
    .eq('id', user.id)
    .single();

  if (profile?.is_banned) {
    return { success: false, error: 'Tu cuenta está suspendida' };
  }

  // Si hay parent_id, verificar que existe
  if (input.parentId) {
    const { data: parentComment } = await supabase
      .from('comments')
      .select('id')
      .eq('id', input.parentId)
      .eq('thread_id', input.threadId)
      .single();

    if (!parentComment) {
      return { success: false, error: 'Comentario padre no encontrado' };
    }
  }

  // Crear comentario
  const { data: comment, error: insertError } = await supabase
    .from('comments')
    .insert({
      content: input.content.trim(),
      thread_id: input.threadId,
      user_id: user.id,
      parent_id: input.parentId || null,
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('Error creating comment:', insertError);
    return { success: false, error: 'Error al crear el comentario' };
  }

  // Procesar menciones @username
  const mentionRegex = /@(\w+)/g;
  const mentions = input.content.match(mentionRegex);
  
  if (mentions) {
    const usernames = mentions.map(m => m.slice(1));
    const { data: mentionedUsers } = await supabase
      .from('profiles')
      .select('id, username')
      .in('username', usernames);

    if (mentionedUsers && mentionedUsers.length > 0) {
      // Insertar menciones y notificaciones se manejan por trigger
      const mentionInserts = mentionedUsers
        .filter(u => u.id !== user.id) // No notificar al autor
        .map(u => ({
          user_id: u.id,
          comment_id: comment.id,
          mentioned_by: user.id,
        }));

      if (mentionInserts.length > 0) {
        await supabase.from('mentions').insert(mentionInserts);
      }
    }
  }

  revalidatePath(`/thread/${input.threadId}`);

  return { success: true, data: { id: comment.id } };
}

/**
 * Actualizar un comentario existente
 */
export async function updateComment(
  input: UpdateCommentInput
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Debes iniciar sesión' };
  }

  // Validar contenido
  if (!input.content || input.content.trim().length < 1) {
    return { success: false, error: 'El comentario no puede estar vacío' };
  }

  // Verificar permisos
  const { data: comment } = await supabase
    .from('comments')
    .select('user_id, thread_id')
    .eq('id', input.id)
    .single();

  if (!comment) {
    return { success: false, error: 'Comentario no encontrado' };
  }

  if (comment.user_id !== user.id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return { success: false, error: 'No tienes permisos para editar este comentario' };
    }
  }

  // Actualizar comentario
  const { error: updateError } = await supabase
    .from('comments')
    .update({ 
      content: input.content.trim(),
      edited_at: new Date().toISOString(),
    })
    .eq('id', input.id);

  if (updateError) {
    return { success: false, error: 'Error al actualizar el comentario' };
  }

  revalidatePath(`/thread/${comment.thread_id}`);

  return { success: true };
}

/**
 * Eliminar un comentario
 */
export async function deleteComment(commentId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Debes iniciar sesión' };
  }

  // Verificar permisos
  const { data: comment } = await supabase
    .from('comments')
    .select('user_id, thread_id')
    .eq('id', commentId)
    .single();

  if (!comment) {
    return { success: false, error: 'Comentario no encontrado' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (comment.user_id !== user.id && profile?.role !== 'admin') {
    return { success: false, error: 'No tienes permisos para eliminar este comentario' };
  }

  // Soft delete o eliminación real según preferencia
  const { error: deleteError } = await supabase
    .from('comments')
    .update({ 
      content: '[Comentario eliminado]',
      is_deleted: true,
    })
    .eq('id', commentId);

  if (deleteError) {
    return { success: false, error: 'Error al eliminar el comentario' };
  }

  revalidatePath(`/thread/${comment.thread_id}`);

  return { success: true };
}

/**
 * Votar en un comentario
 */
export async function voteComment(
  commentId: string,
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
    .eq('comment_id', commentId)
    .eq('user_id', user.id)
    .single();

  if (existingVote) {
    if (existingVote.value === voteValue) {
      await supabase.from('votes').delete().eq('id', existingVote.id);
    } else {
      await supabase.from('votes').update({ value: voteValue }).eq('id', existingVote.id);
    }
  } else {
    await supabase.from('votes').insert({
      comment_id: commentId,
      user_id: user.id,
      value: voteValue,
    });
  }

  // Obtener nuevo score
  const { data: votes } = await supabase
    .from('votes')
    .select('value')
    .eq('comment_id', commentId);

  const score = votes?.reduce((acc, v) => acc + v.value, 0) || 0;

  return { success: true, data: { score } };
}
