/**
 * Gamification Repository
 * Capa de acceso a datos para el sistema de gamificación
 */

import { createClient as createServerClient } from "@/lib/supabase-server";

export interface UserProfile {
  id: string;
  username: string;
  reputation: number;
  avatar_url: string | null;
  bio: string | null;
  is_admin: boolean;
}

export interface ThreadPost {
  id: string;
  title: string;
  content: string;
  user_id: string | null;
  like_count: number; // Legacy
  upvote_count: number;
  downvote_count: number;
  score?: number;
  is_hidden: boolean;
  is_resource: boolean;
  created_at: string;
}

/**
 * Obtiene el perfil de un usuario por su ID
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = await createServerClient();
  
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, reputation, avatar_url, bio, is_admin")
    .eq("id", userId)
    .single();

  if (error || !data) {
    console.error("Error fetching user profile:", error);
    return null;
  }

  return data;
}

/**
 * Obtiene un thread por su ID
 */
export async function getThread(threadId: string): Promise<ThreadPost | null> {
  const supabase = await createServerClient();
  
  const { data, error } = await supabase
    .from("threads")
    .select("id, title, content, user_id, like_count, upvote_count, downvote_count, score, is_hidden, is_resource, created_at")
    .eq("id", threadId)
    .single();

  if (error || !data) {
    console.error("Error fetching thread:", error);
    return null;
  }

  return data;
}

/**
 * Aplica un superlike a un thread (+2 karma al autor)
 */
export async function applySuperlike(threadId: string, userId: string): Promise<boolean> {
  const supabase = await createServerClient();
  
  // Verificar que el thread existe y obtener el autor
  const thread = await getThread(threadId);
  if (!thread || !thread.user_id || thread.user_id === userId) {
    return false; // No se puede dar superlike a propio contenido o thread sin autor
  }

  // Verificar que no existe ya un superlike de este usuario
  const { data: existingSuperlike } = await supabase
    .from("superlikes")
    .select("id")
    .eq("thread_id", threadId)
    .eq("user_id", userId)
    .single();

  if (existingSuperlike) {
    return false; // Ya existe un superlike
  }

  // Crear el superlike
  const { error: insertError } = await supabase
    .from("superlikes")
    .insert({
      thread_id: threadId,
      user_id: userId,
      author_id: thread.user_id,
    });

  if (insertError) {
    console.error("Error creating superlike:", insertError);
    return false;
  }

  // Incrementar reputación del autor (+2)
  const { error: updateError } = await supabase.rpc("increment_reputation", {
    user_id: thread.user_id,
    amount: 2,
  });

  if (updateError) {
    console.error("Error updating reputation:", updateError);
    // Nota: El superlike ya fue creado, pero la reputación no se actualizó
    // Esto debería manejarse con una transacción en producción
  }

  return true;
}

/**
 * Oculta un thread temporalmente (12 horas)
 */
export async function hideThread(threadId: string): Promise<boolean> {
  const supabase = await createServerClient();
  
  const { error } = await supabase
    .from("threads")
    .update({
      is_hidden: true,
      hidden_at: new Date().toISOString(),
      hidden_until: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12 horas
    })
    .eq("id", threadId);

  if (error) {
    console.error("Error hiding thread:", error);
    return false;
  }

  return true;
}

/**
 * Marca un thread como recurso útil
 */
export async function markAsResource(threadId: string): Promise<boolean> {
  const supabase = await createServerClient();
  
  const { error } = await supabase
    .from("threads")
    .update({ is_resource: true })
    .eq("id", threadId);

  if (error) {
    console.error("Error marking as resource:", error);
    return false;
  }

  return true;
}

/**
 * Verifica si un usuario ya dio superlike a un thread
 */
export async function hasSuperliked(threadId: string, userId: string): Promise<boolean> {
  const supabase = await createServerClient();
  
  const { data } = await supabase
    .from("superlikes")
    .select("id")
    .eq("thread_id", threadId)
    .eq("user_id", userId)
    .single();

  return !!data;
}
