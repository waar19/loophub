/**
 * Gamification Hooks - Client-side utilities
 * Ejemplo de cómo integrar el sistema de gamificación en componentes React
 */

'use client';

import { useState, useEffect } from 'react';

// Tipos
interface UserPermissions {
  level: number;
  levelName: string;
  karma: number;
  permissions: string[];
  progressToNextLevel: number;
  karmaToNextLevel: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

/**
 * Hook para obtener los permisos del usuario autenticado
 */
export function useUserPermissions() {
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const response = await fetch('/api/me/permissions');
        const data: ApiResponse<UserPermissions> = await response.json();

        if (data.success && data.data) {
          setPermissions(data.data);
        } else {
          setError(data.error || 'Error al cargar permisos');
        }
      } catch (err) {
        setError('Error de conexión');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, []);

  return { permissions, loading, error };
}

/**
 * Hook para gestionar superlikes
 */
export function useSuperlike(threadId: string) {
  const [loading, setLoading] = useState(false);
  const [hasSuperliked, setHasSuperliked] = useState(false);

  const applySuperlike = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/posts/${threadId}/superlike`, {
        method: 'POST',
      });

      const data: ApiResponse<{ karma_awarded: number }> = await response.json();

      if (data.success) {
        setHasSuperliked(true);
        return { success: true, karmaAwarded: data.data?.karma_awarded || 0 };
      } else {
        return { success: false, error: data.error || 'Error desconocido' };
      }
    } catch (err) {
      console.error('Error applying superlike:', err);
      return { success: false, error: 'Error de conexión' };
    } finally {
      setLoading(false);
    }
  };

  return { applySuperlike, loading, hasSuperliked };
}

/**
 * Hook para ocultar posts
 */
export function useHidePost(threadId: string) {
  const [loading, setLoading] = useState(false);

  const hidePost = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/posts/${threadId}/hide`, {
        method: 'POST',
      });

      const data: ApiResponse<{ hidden_until: string }> = await response.json();

      if (data.success) {
        return { success: true, hiddenUntil: data.data?.hidden_until };
      } else {
        return { success: false, error: data.error || 'Error desconocido' };
      }
    } catch (err) {
      console.error('Error hiding post:', err);
      return { success: false, error: 'Error de conexión' };
    } finally {
      setLoading(false);
    }
  };

  return { hidePost, loading };
}

/**
 * Hook para marcar como recurso
 */
export function useMarkAsResource(threadId: string) {
  const [loading, setLoading] = useState(false);
  const [isResource, setIsResource] = useState(false);

  const markAsResource = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/posts/${threadId}/mark-resource`, {
        method: 'POST',
      });

      const data: ApiResponse<{ marked: boolean }> = await response.json();

      if (data.success) {
        setIsResource(true);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Error desconocido' };
      }
    } catch (err) {
      console.error('Error marking as resource:', err);
      return { success: false, error: 'Error de conexión' };
    } finally {
      setLoading(false);
    }
  };

  return { markAsResource, loading, isResource };
}

/**
 * Utilidad para verificar si el usuario tiene un permiso específico
 */
export function hasPermission(permissions: UserPermissions | null, permission: string): boolean {
  if (!permissions) return false;
  return permissions.permissions.includes(permission);
}

/**
 * Utilidad para obtener el color del nivel
 */
export function getLevelColor(level: number): string {
  const colors: Record<number, string> = {
    0: '#9CA3AF', // Gray - Novato
    1: '#60A5FA', // Blue - Colaborador
    2: '#34D399', // Green - Contribuidor
    3: '#A78BFA', // Purple - Experto
    4: '#FBBF24', // Yellow - Maestro
    5: '#F59E0B', // Orange - Leyenda
  };
  return colors[level] || colors[0];
}

/**
 * Utilidad para formatear karma con sufijos
 */
export function formatKarma(karma: number): string {
  if (karma >= 1000000) {
    return `${(karma / 1000000).toFixed(1)}M`;
  }
  if (karma >= 1000) {
    return `${(karma / 1000).toFixed(1)}K`;
  }
  return karma.toString();
}
