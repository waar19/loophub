/**
 * Gamification Service
 * Lógica de negocio para el sistema de gamificación
 */

import { getUserLevel, getLevelInfo, hasPermission } from "./levels";
import * as repository from "./repository";

export interface UserPermissions {
  level: number;
  levelName: string;
  karma: number;
  permissions: string[];
  progressToNextLevel: number;
  karmaToNextLevel: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

/**
 * Obtiene los permisos completos de un usuario
 */
export async function getUserPermissions(userId: string): Promise<ApiResponse<UserPermissions>> {
  try {
    const profile = await repository.getUserProfile(userId);
    
    if (!profile) {
      return {
        success: false,
        data: null,
        error: "Usuario no encontrado",
      };
    }

    const karma = profile.reputation;
    const level = getUserLevel(karma);
    const levelInfo = getLevelInfo(karma);
    
    // Calcular progreso
    const currentLevelInfo = getLevelInfo(karma);
    const nextLevelMinKarma = level < 5 ? getLevelInfo(karma + 1).minKarma : currentLevelInfo.minKarma;
    const currentLevelMinKarma = currentLevelInfo.minKarma;
    const range = nextLevelMinKarma - currentLevelMinKarma;
    const progress = range > 0 ? ((karma - currentLevelMinKarma) / range) * 100 : 100;
    const karmaNeeded = level < 5 ? Math.max(0, nextLevelMinKarma - karma) : 0;

    return {
      success: true,
      data: {
        level,
        levelName: levelInfo.name,
        karma,
        permissions: levelInfo.permissions,
        progressToNextLevel: Math.min(100, Math.max(0, progress)),
        karmaToNextLevel: karmaNeeded,
      },
      error: null,
    };
  } catch (error) {
    console.error("Error getting user permissions:", error);
    return {
      success: false,
      data: null,
      error: "Error al obtener permisos del usuario",
    };
  }
}

/**
 * Aplica un superlike a un thread
 */
export async function applySuperlike(
  threadId: string,
  userId: string
): Promise<ApiResponse<{ karma_awarded: number }>> {
  try {
    // Verificar permisos del usuario
    const profile = await repository.getUserProfile(userId);
    
    if (!profile) {
      return {
        success: false,
        data: null,
        error: "Usuario no encontrado",
      };
    }

    if (!hasPermission(profile.reputation, "superlike")) {
      return {
        success: false,
        data: null,
        error: "No tienes permiso para usar superlike. Requiere nivel 3 o superior.",
      };
    }

    // Verificar que ya no haya dado superlike
    const alreadySuperliked = await repository.hasSuperliked(threadId, userId);
    if (alreadySuperliked) {
      return {
        success: false,
        data: null,
        error: "Ya has dado superlike a este post",
      };
    }

    // Aplicar superlike
    const success = await repository.applySuperlike(threadId, userId);
    
    if (!success) {
      return {
        success: false,
        data: null,
        error: "No se pudo aplicar el superlike. Verifica que el post existe y no es tuyo.",
      };
    }

    return {
      success: true,
      data: { karma_awarded: 2 },
      error: null,
    };
  } catch (error) {
    console.error("Error applying superlike:", error);
    return {
      success: false,
      data: null,
      error: "Error al aplicar superlike",
    };
  }
}

/**
 * Oculta un thread temporalmente
 */
export async function hidePost(
  threadId: string,
  userId: string
): Promise<ApiResponse<{ hidden_until: string }>> {
  try {
    // Verificar permisos del usuario
    const profile = await repository.getUserProfile(userId);
    
    if (!profile) {
      return {
        success: false,
        data: null,
        error: "Usuario no encontrado",
      };
    }

    if (!hasPermission(profile.reputation, "shadow_hide")) {
      return {
        success: false,
        data: null,
        error: "No tienes permiso para ocultar posts. Requiere nivel 4 o superior.",
      };
    }

    // Ocultar el thread
    const success = await repository.hideThread(threadId);
    
    if (!success) {
      return {
        success: false,
        data: null,
        error: "No se pudo ocultar el post",
      };
    }

    const hiddenUntil = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();

    return {
      success: true,
      data: { hidden_until: hiddenUntil },
      error: null,
    };
  } catch (error) {
    console.error("Error hiding post:", error);
    return {
      success: false,
      data: null,
      error: "Error al ocultar el post",
    };
  }
}

/**
 * Marca un thread como recurso útil
 */
export async function markAsResource(
  threadId: string,
  userId: string
): Promise<ApiResponse<{ marked: boolean }>> {
  try {
    // Verificar permisos del usuario
    const profile = await repository.getUserProfile(userId);
    
    if (!profile) {
      return {
        success: false,
        data: null,
        error: "Usuario no encontrado",
      };
    }

    // Para marcar como recurso, se requiere al menos nivel 2
    if (!hasPermission(profile.reputation, "create_special_threads")) {
      return {
        success: false,
        data: null,
        error: "No tienes permiso para marcar recursos. Requiere nivel 2 o superior.",
      };
    }

    // Marcar como recurso
    const success = await repository.markAsResource(threadId);
    
    if (!success) {
      return {
        success: false,
        data: null,
        error: "No se pudo marcar el post como recurso",
      };
    }

    return {
      success: true,
      data: { marked: true },
      error: null,
    };
  } catch (error) {
    console.error("Error marking as resource:", error);
    return {
      success: false,
      data: null,
      error: "Error al marcar como recurso",
    };
  }
}
