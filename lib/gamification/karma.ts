/**
 * Karma Service
 * Gestiona el otorgamiento y remoción de karma con historial
 */

import { createClient as createServerClient } from "@/lib/supabase-server";

export interface KarmaChange {
  user_id: string;
  amount: number;
  reason: string;
  source_type?: 'thread' | 'comment' | 'like' | 'superlike' | 'moderation' | 'manual';
  source_id?: string;
}

export interface KarmaHistory {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  source_type: string | null;
  source_id: string | null;
  created_at: string;
}

/**
 * Valores de karma por acción
 */
export const KARMA_VALUES = {
  // Creación de contenido
  CREATE_THREAD: 5,
  CREATE_COMMENT: 2,
  
  // Engagement
  RECEIVE_LIKE: 1,
  RECEIVE_SUPERLIKE: 2,
  
  // Calidad
  THREAD_MARKED_RESOURCE: 10,
  THREAD_TO_FRONTPAGE: 20,
  
  // Milestones
  FIRST_THREAD: 10,
  FIRST_COMMENT: 5,
  TEN_THREADS: 25,
  FIFTY_COMMENTS: 30,
  HUNDRED_LIKES: 50,
  
  // Rachas
  STREAK_7_DAYS: 15,
  STREAK_30_DAYS: 50,
  STREAK_90_DAYS: 100,
  
  // Penalizaciones
  CONTENT_DELETED: -5,
  THREAD_DELETED: -15,
  VALID_REPORT: -10,
  SPAM_DETECTED: -25,
  TEMP_BAN: -50,
} as const;

/**
 * Otorga karma a un usuario con historial
 */
export async function awardKarma(change: KarmaChange): Promise<boolean> {
  const supabase = await createServerClient();
  
  try {
    // Actualizar reputación del usuario
    const { error: updateError } = await supabase
      .rpc('increment_reputation', {
        user_id: change.user_id,
        amount: change.amount,
      });

    if (updateError) {
      console.error('Error updating reputation:', updateError);
      return false;
    }

    // Registrar en historial (si existe tabla karma_history)
    // Nota: Esta tabla debe crearse en una migración futura
    /*
    const { error: historyError } = await supabase
      .from('karma_history')
      .insert({
        user_id: change.user_id,
        amount: change.amount,
        reason: change.reason,
        source_type: change.source_type,
        source_id: change.source_id,
      });

    if (historyError) {
      console.error('Error recording karma history:', historyError);
    }
    */

    return true;
  } catch (error) {
    console.error('Error awarding karma:', error);
    return false;
  }
}

/**
 * Otorga karma por milestone alcanzado
 */
export async function awardMilestone(
  userId: string,
  milestone: keyof typeof KARMA_VALUES,
  description: string
): Promise<boolean> {
  return awardKarma({
    user_id: userId,
    amount: KARMA_VALUES[milestone],
    reason: `Milestone: ${description}`,
    source_type: 'manual',
  });
}

/**
 * Penaliza karma por comportamiento negativo
 */
export async function penalizeKarma(
  userId: string,
  penalty: keyof typeof KARMA_VALUES,
  description: string,
  sourceId?: string
): Promise<boolean> {
  return awardKarma({
    user_id: userId,
    amount: KARMA_VALUES[penalty],
    reason: `Penalty: ${description}`,
    source_type: 'moderation',
    source_id: sourceId,
  });
}

/**
 * Otorga karma manual (para admins)
 */
export async function manualKarmaAdjustment(
  userId: string,
  amount: number,
  reason: string
): Promise<boolean> {
  return awardKarma({
    user_id: userId,
    amount,
    reason: `Manual adjustment: ${reason}`,
    source_type: 'manual',
  });
}

/**
 * Verifica si un usuario ha alcanzado un milestone
 */
export async function checkMilestones(userId: string): Promise<void> {
  const supabase = await createServerClient();

  // Obtener estadísticas del usuario
  const { count: threadCount } = await supabase
    .from('threads')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  const { count: commentCount } = await supabase
    .from('comments')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  const { count: likesCount } = await supabase
    .from('likes')
    .select('id', { count: 'exact', head: true })
    .or(`thread_id.in.(select id from threads where user_id = '${userId}'),comment_id.in.(select id from comments where user_id = '${userId}')`);

  // Verificar milestones
  const threads = threadCount ?? 0;
  const comments = commentCount ?? 0;
  const likes = likesCount ?? 0;

  // Nota: Deberías guardar qué milestones ya fueron otorgados
  // Para evitar darlos múltiples veces
  // Esto requeriría una tabla user_milestones

  if (threads === 1) {
    await awardMilestone(userId, 'FIRST_THREAD', 'Primer thread publicado');
  }
  
  if (threads === 10) {
    await awardMilestone(userId, 'TEN_THREADS', '10 threads publicados');
  }

  if (comments === 1) {
    await awardMilestone(userId, 'FIRST_COMMENT', 'Primer comentario');
  }

  if (comments === 50) {
    await awardMilestone(userId, 'FIFTY_COMMENTS', '50 comentarios publicados');
  }

  if (likes === 100) {
    await awardMilestone(userId, 'HUNDRED_LIKES', '100 likes recibidos');
  }
}

/**
 * Obtiene el historial de karma de un usuario
 * Nota: Requiere tabla karma_history en una migración futura
 */
export async function getKarmaHistory(
  userId: string,
  limit: number = 50
): Promise<KarmaHistory[]> {
  const supabase = await createServerClient();

  // Placeholder - requiere tabla karma_history
  /*
  const { data, error } = await supabase
    .from('karma_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching karma history:', error);
    return [];
  }

  return data || [];
  */

  return [];
}

/**
 * Calcula el karma total que un usuario debería tener
 * Útil para auditar y corregir discrepancias
 */
export async function calculateTotalKarma(userId: string): Promise<number> {
  const supabase = await createServerClient();
  
  let total = 0;

  // Karma por threads creados (5 cada uno)
  const { count: threadCount } = await supabase
    .from('threads')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  total += (threadCount || 0) * KARMA_VALUES.CREATE_THREAD;

  // Karma por comentarios creados (2 cada uno)
  const { count: commentCount } = await supabase
    .from('comments')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  total += (commentCount || 0) * KARMA_VALUES.CREATE_COMMENT;

  // Karma por likes recibidos en threads
  const { data: threads } = await supabase
    .from('threads')
    .select('upvote_count')
    .eq('user_id', userId);
  const threadLikes = threads?.reduce((sum, t) => sum + (t.upvote_count || 0), 0) || 0;
  total += threadLikes * KARMA_VALUES.RECEIVE_LIKE;

  // Karma por likes recibidos en comentarios
  const { data: comments } = await supabase
    .from('comments')
    .select('upvote_count')
    .eq('user_id', userId);
  const commentLikes = comments?.reduce((sum, c) => sum + (c.upvote_count || 0), 0) || 0;
  total += commentLikes * KARMA_VALUES.RECEIVE_LIKE;

  // Karma por threads marcados como recurso
  const { count: resourceCount } = await supabase
    .from('threads')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_resource', true);
  total += (resourceCount || 0) * KARMA_VALUES.THREAD_MARKED_RESOURCE;

  // Karma por superlikes recibidos
  const { count: superlikeCount } = await supabase
    .from('superlikes')
    .select('id', { count: 'exact', head: true })
    .eq('author_id', userId);
  total += (superlikeCount || 0) * KARMA_VALUES.RECEIVE_SUPERLIKE;

  return total;
}

/**
 * Corrige el karma de un usuario si hay discrepancias
 */
export async function auditAndFixKarma(userId: string): Promise<{
  current: number;
  calculated: number;
  difference: number;
  fixed: boolean;
}> {
  const supabase = await createServerClient();

  // Obtener karma actual
  const { data: profile } = await supabase
    .from('profiles')
    .select('reputation')
    .eq('id', userId)
    .single();

  const currentKarma = profile?.reputation || 0;
  const calculatedKarma = await calculateTotalKarma(userId);
  const difference = calculatedKarma - currentKarma;

  // Si hay diferencia, corregir
  if (difference !== 0) {
    const success = await manualKarmaAdjustment(
      userId,
      difference,
      `Karma audit correction: ${difference > 0 ? '+' : ''}${difference}`
    );

    return {
      current: currentKarma,
      calculated: calculatedKarma,
      difference,
      fixed: success,
    };
  }

  return {
    current: currentKarma,
    calculated: calculatedKarma,
    difference: 0,
    fixed: false,
  };
}
