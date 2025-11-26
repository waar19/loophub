/**
 * Gamification System - Levels & Permissions
 * Sistema de niveles basado en karma con permisos progresivos
 */

export interface LevelInfo {
  name: string;
  permissions: string[];
  minKarma: number;
  maxKarma: number | null;
}

/**
 * Calcula el nivel del usuario basado en su karma
 * @param karma - Puntos de reputación del usuario
 * @returns Nivel del usuario (0-5)
 */
export function getUserLevel(karma: number): number {
  if (karma < 20) return 0;
  if (karma < 100) return 1;
  if (karma < 500) return 2;
  if (karma < 2000) return 3;
  if (karma < 10000) return 4;
  return 5;
}

/**
 * Permisos y características por nivel
 * Cada nivel desbloquea nuevas capacidades y privilegios
 */
export const LevelPermissions: Record<number, LevelInfo> = {
  0: {
    name: "Novato",
    minKarma: 0,
    maxKarma: 20,
    permissions: [
      "post_with_daily_limit", // Publicar con límite diario
      "comment", // Comentar en hilos
      "vote", // Votar contenido
    ],
  },
  1: {
    name: "Colaborador",
    minKarma: 20,
    maxKarma: 100,
    permissions: [
      "post_with_daily_limit",
      "comment",
      "vote",
      "edit_extended", // Editar por más tiempo
      "upload_images_no_cooldown", // Subir imágenes sin cooldown
    ],
  },
  2: {
    name: "Contribuidor",
    minKarma: 100,
    maxKarma: 500,
    permissions: [
      "post_with_daily_limit",
      "comment",
      "vote",
      "edit_extended",
      "upload_images_no_cooldown",
      "create_special_threads", // Crear hilos especiales
      "propose_tags", // Proponer tags (requiere aprobación)
    ],
  },
  3: {
    name: "Experto",
    minKarma: 500,
    maxKarma: 2000,
    permissions: [
      "post_with_daily_limit",
      "comment",
      "vote",
      "edit_extended",
      "upload_images_no_cooldown",
      "create_special_threads",
      "propose_tags",
      "access_beta_features", // Acceso a features beta
      "create_polls", // Crear encuestas
      "superlike", // Usar superlike (+2 karma)
    ],
  },
  4: {
    name: "Maestro",
    minKarma: 2000,
    maxKarma: 10000,
    permissions: [
      "post_with_daily_limit",
      "comment",
      "vote",
      "edit_extended",
      "upload_images_no_cooldown",
      "create_special_threads",
      "propose_tags",
      "access_beta_features",
      "create_polls",
      "superlike",
      "shadow_hide", // Ocultar contenido por 12 horas
      "recommend_to_frontpage", // Recomendar posts a portada
    ],
  },
  5: {
    name: "Leyenda",
    minKarma: 10000,
    maxKarma: null,
    permissions: [
      "post_with_daily_limit",
      "comment",
      "vote",
      "edit_extended",
      "upload_images_no_cooldown",
      "create_special_threads",
      "propose_tags",
      "access_beta_features",
      "create_polls",
      "superlike",
      "shadow_hide",
      "recommend_to_frontpage",
      "moderate_niche", // Moderar su nicho
      "create_categories", // Crear categorías nuevas (pendiente aprobación)
    ],
  },
};

/**
 * Obtiene la información completa del nivel del usuario
 * @param karma - Puntos de reputación del usuario
 * @returns Información del nivel incluyendo permisos
 */
export function getLevelInfo(karma: number): LevelInfo {
  const level = getUserLevel(karma);
  return LevelPermissions[level];
}

/**
 * Verifica si un usuario tiene un permiso específico
 * @param karma - Puntos de reputación del usuario
 * @param permission - Permiso a verificar
 * @returns true si el usuario tiene el permiso
 */
export function hasPermission(karma: number, permission: string): boolean {
  const levelInfo = getLevelInfo(karma);
  return levelInfo.permissions.includes(permission);
}

/**
 * Calcula el progreso hacia el siguiente nivel
 * @param karma - Puntos de reputación del usuario
 * @returns Porcentaje de progreso (0-100)
 */
export function getProgressToNextLevel(karma: number): number {
  const currentLevel = getUserLevel(karma);
  
  // Si está en el nivel máximo, retorna 100%
  if (currentLevel === 5) {
    return 100;
  }
  
  const currentLevelInfo = LevelPermissions[currentLevel];
  const nextLevelInfo = LevelPermissions[currentLevel + 1];
  
  const currentMin = currentLevelInfo.minKarma;
  const nextMin = nextLevelInfo.minKarma;
  const range = nextMin - currentMin;
  const progress = karma - currentMin;
  
  return Math.min(100, Math.max(0, (progress / range) * 100));
}

/**
 * Obtiene el karma necesario para alcanzar el siguiente nivel
 * @param karma - Puntos de reputación del usuario
 * @returns Karma necesario para el siguiente nivel (0 si está en nivel máximo)
 */
export function getKarmaToNextLevel(karma: number): number {
  const currentLevel = getUserLevel(karma);
  
  // Si está en el nivel máximo
  if (currentLevel === 5) {
    return 0;
  }
  
  const nextLevelInfo = LevelPermissions[currentLevel + 1];
  return Math.max(0, nextLevelInfo.minKarma - karma);
}
