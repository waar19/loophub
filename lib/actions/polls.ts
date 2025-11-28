'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

interface CreatePollInput {
  threadId: string;
  question: string;
  options: string[];
  pollType?: 'single' | 'multiple';
  maxChoices?: number;
  closesAt?: string;
  minLevelToVote?: number;
  showResultsBeforeVote?: boolean;
}

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

interface PollOption {
  id: string;
  option_text: string;
  vote_count: number;
  percentage: number;
}

interface PollResult {
  id: string;
  question: string;
  pollType: 'single' | 'multiple';
  maxChoices: number;
  isClosed: boolean;
  closesAt: string | null;
  totalVotes: number;
  options: PollOption[];
  userVotes: string[];
  hasVoted: boolean;
  showResultsBeforeVote: boolean;
}

/**
 * Crear una encuesta en un thread
 * Requiere nivel 3+
 */
export async function createPoll(
  input: CreatePollInput
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Debes iniciar sesión para crear encuestas' };
  }

  // Verificar nivel del usuario
  const { data: profile } = await supabase
    .from('profiles')
    .select('level')
    .eq('id', user.id)
    .single();

  if (!profile || profile.level < 3) {
    return { success: false, error: 'Necesitas nivel 3 para crear encuestas' };
  }

  // Validaciones
  if (!input.question || input.question.trim().length < 5) {
    return { success: false, error: 'La pregunta debe tener al menos 5 caracteres' };
  }

  if (!input.options || input.options.length < 2) {
    return { success: false, error: 'Debes proporcionar al menos 2 opciones' };
  }

  if (input.options.length > 10) {
    return { success: false, error: 'Máximo 10 opciones permitidas' };
  }

  // Verificar que el thread existe y no tiene ya una encuesta
  const { data: thread } = await supabase
    .from('threads')
    .select('id, user_id')
    .eq('id', input.threadId)
    .single();

  if (!thread) {
    return { success: false, error: 'Hilo no encontrado' };
  }

  // Verificar si ya existe una encuesta en este thread
  const { data: existingPoll } = await supabase
    .from('polls')
    .select('id')
    .eq('thread_id', input.threadId)
    .single();

  if (existingPoll) {
    return { success: false, error: 'Este hilo ya tiene una encuesta' };
  }

  // Crear la encuesta
  const { data: poll, error: pollError } = await supabase
    .from('polls')
    .insert({
      thread_id: input.threadId,
      question: input.question.trim(),
      poll_type: input.pollType || 'single',
      max_choices: input.maxChoices || 1,
      closes_at: input.closesAt || null,
      min_level_to_vote: input.minLevelToVote || 0,
      show_results_before_vote: input.showResultsBeforeVote || false,
      created_by: user.id,
    })
    .select('id')
    .single();

  if (pollError || !poll) {
    console.error('Error creating poll:', pollError);
    return { success: false, error: 'Error al crear la encuesta' };
  }

  // Crear las opciones
  const optionsToInsert = input.options
    .filter(opt => opt.trim().length > 0)
    .map((opt, index) => ({
      poll_id: poll.id,
      option_text: opt.trim(),
      option_order: index,
    }));

  const { error: optionsError } = await supabase
    .from('poll_options')
    .insert(optionsToInsert);

  if (optionsError) {
    // Rollback: eliminar poll si fallan las opciones
    await supabase.from('polls').delete().eq('id', poll.id);
    return { success: false, error: 'Error al crear las opciones' };
  }

  revalidatePath(`/thread/${input.threadId}`);

  return { success: true, data: { id: poll.id } };
}

/**
 * Votar en una encuesta
 */
export async function votePoll(
  pollId: string,
  optionIds: string[]
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Debes iniciar sesión para votar' };
  }

  if (!optionIds || optionIds.length === 0) {
    return { success: false, error: 'Debes seleccionar al menos una opción' };
  }

  // Obtener la encuesta y verificar estado
  const { data: poll, error: pollError } = await supabase
    .from('polls')
    .select('id, thread_id, is_closed, closes_at, poll_type, max_choices, min_level_to_vote')
    .eq('id', pollId)
    .single();

  if (pollError || !poll) {
    return { success: false, error: 'Encuesta no encontrada' };
  }

  if (poll.is_closed) {
    return { success: false, error: 'Esta encuesta está cerrada' };
  }

  if (poll.closes_at && new Date(poll.closes_at) <= new Date()) {
    return { success: false, error: 'Esta encuesta ha expirado' };
  }

  // Verificar nivel del usuario
  const { data: profile } = await supabase
    .from('profiles')
    .select('level')
    .eq('id', user.id)
    .single();

  if (!profile || profile.level < poll.min_level_to_vote) {
    return { success: false, error: `Necesitas nivel ${poll.min_level_to_vote} para votar` };
  }

  // Verificar tipo de encuesta y cantidad de opciones
  if (poll.poll_type === 'single' && optionIds.length > 1) {
    return { success: false, error: 'Solo puedes elegir una opción' };
  }

  if (poll.poll_type === 'multiple' && optionIds.length > poll.max_choices) {
    return { success: false, error: `Máximo ${poll.max_choices} opciones` };
  }

  // Verificar si ya votó (para single choice)
  const { data: existingVotes } = await supabase
    .from('poll_votes')
    .select('id')
    .eq('poll_id', pollId)
    .eq('user_id', user.id);

  if (existingVotes && existingVotes.length > 0) {
    // Eliminar votos anteriores
    await supabase
      .from('poll_votes')
      .delete()
      .eq('poll_id', pollId)
      .eq('user_id', user.id);
  }

  // Insertar nuevos votos
  const votesToInsert = optionIds.map(optionId => ({
    poll_id: pollId,
    option_id: optionId,
    user_id: user.id,
  }));

  const { error: voteError } = await supabase
    .from('poll_votes')
    .insert(votesToInsert);

  if (voteError) {
    console.error('Error voting:', voteError);
    return { success: false, error: 'Error al registrar tu voto' };
  }

  revalidatePath(`/thread/${poll.thread_id}`);

  return { success: true };
}

/**
 * Obtener resultados de una encuesta
 */
export async function getPollResults(
  pollId: string
): Promise<ActionResult<PollResult>> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Obtener encuesta
  const { data: poll, error: pollError } = await supabase
    .from('polls')
    .select(`
      id,
      question,
      poll_type,
      max_choices,
      is_closed,
      closes_at,
      show_results_before_vote
    `)
    .eq('id', pollId)
    .single();

  if (pollError || !poll) {
    return { success: false, error: 'Encuesta no encontrada' };
  }

  // Obtener opciones con conteo de votos
  const { data: options } = await supabase
    .from('poll_options')
    .select(`
      id,
      option_text,
      option_order
    `)
    .eq('poll_id', pollId)
    .order('option_order');

  // Obtener conteo de votos por opción
  const { data: votes } = await supabase
    .from('poll_votes')
    .select('option_id')
    .eq('poll_id', pollId);

  // Calcular totales
  const voteCounts: Record<string, number> = {};
  const uniqueVoters = new Set<string>();
  
  votes?.forEach(vote => {
    voteCounts[vote.option_id] = (voteCounts[vote.option_id] || 0) + 1;
  });

  // Contar votantes únicos
  const { data: uniqueVotesData } = await supabase
    .from('poll_votes')
    .select('user_id')
    .eq('poll_id', pollId);

  uniqueVotesData?.forEach(v => uniqueVoters.add(v.user_id));
  const totalVotes = uniqueVoters.size;

  // Verificar si el usuario actual votó
  let userVotes: string[] = [];
  let hasVoted = false;

  if (user) {
    const { data: userVotesData } = await supabase
      .from('poll_votes')
      .select('option_id')
      .eq('poll_id', pollId)
      .eq('user_id', user.id);

    if (userVotesData && userVotesData.length > 0) {
      hasVoted = true;
      userVotes = userVotesData.map(v => v.option_id);
    }
  }

  // Construir opciones con resultados
  const optionsWithResults: PollOption[] = (options || []).map(opt => ({
    id: opt.id,
    option_text: opt.option_text,
    vote_count: voteCounts[opt.id] || 0,
    percentage: totalVotes > 0 
      ? Math.round(((voteCounts[opt.id] || 0) / totalVotes) * 100 * 10) / 10
      : 0,
  }));

  return {
    success: true,
    data: {
      id: poll.id,
      question: poll.question,
      pollType: poll.poll_type as 'single' | 'multiple',
      maxChoices: poll.max_choices,
      isClosed: poll.is_closed,
      closesAt: poll.closes_at,
      totalVotes,
      options: optionsWithResults,
      userVotes,
      hasVoted,
      showResultsBeforeVote: poll.show_results_before_vote,
    },
  };
}

/**
 * Cerrar una encuesta
 */
export async function closePoll(pollId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Debes iniciar sesión' };
  }

  // Verificar permisos
  const { data: poll } = await supabase
    .from('polls')
    .select('created_by, thread_id')
    .eq('id', pollId)
    .single();

  if (!poll) {
    return { success: false, error: 'Encuesta no encontrada' };
  }

  // Verificar si es creador o admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (poll.created_by !== user.id && profile?.role !== 'admin') {
    return { success: false, error: 'No tienes permisos para cerrar esta encuesta' };
  }

  const { error: updateError } = await supabase
    .from('polls')
    .update({ 
      is_closed: true,
      closed_at: new Date().toISOString(),
    })
    .eq('id', pollId);

  if (updateError) {
    return { success: false, error: 'Error al cerrar la encuesta' };
  }

  revalidatePath(`/thread/${poll.thread_id}`);

  return { success: true };
}

/**
 * Eliminar una encuesta
 */
export async function deletePoll(pollId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Debes iniciar sesión' };
  }

  const { data: poll } = await supabase
    .from('polls')
    .select('created_by, thread_id')
    .eq('id', pollId)
    .single();

  if (!poll) {
    return { success: false, error: 'Encuesta no encontrada' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (poll.created_by !== user.id && profile?.role !== 'admin') {
    return { success: false, error: 'No tienes permisos para eliminar esta encuesta' };
  }

  const { error: deleteError } = await supabase
    .from('polls')
    .delete()
    .eq('id', pollId);

  if (deleteError) {
    return { success: false, error: 'Error al eliminar la encuesta' };
  }

  revalidatePath(`/thread/${poll.thread_id}`);

  return { success: true };
}
