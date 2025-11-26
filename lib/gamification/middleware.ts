/**
 * Gamification Middleware
 * Middleware para validar permisos basados en niveles
 */

import { NextResponse } from "next/server";
import { getUserProfile } from "./repository";
import { hasPermission } from "./levels";

export interface MiddlewareContext {
  userId: string;
  karma: number;
}

/**
 * Middleware genérico para verificar permisos
 */
export async function requirePermission(
  userId: string,
  permission: string
): Promise<{ allowed: boolean; context?: MiddlewareContext; error?: string }> {
  try {
    const profile = await getUserProfile(userId);

    if (!profile) {
      return {
        allowed: false,
        error: "Usuario no encontrado",
      };
    }

    const allowed = hasPermission(profile.reputation, permission);

    if (!allowed) {
      return {
        allowed: false,
        error: `No tienes permiso para realizar esta acción. Permiso requerido: ${permission}`,
      };
    }

    return {
      allowed: true,
      context: {
        userId: profile.id,
        karma: profile.reputation,
      },
    };
  } catch (error) {
    console.error("Error in permission middleware:", error);
    return {
      allowed: false,
      error: "Error al verificar permisos",
    };
  }
}

/**
 * Middleware para editar títulos de otros usuarios
 */
export async function canEditOthersTitles(userId: string) {
  return requirePermission(userId, "edit_extended");
}

/**
 * Middleware para crear encuestas
 */
export async function canCreatePolls(userId: string) {
  return requirePermission(userId, "create_polls");
}

/**
 * Middleware para aplicar superlike
 */
export async function canApplySuperlike(userId: string) {
  return requirePermission(userId, "superlike");
}

/**
 * Middleware para ocultar publicaciones
 */
export async function canHidePosts(userId: string) {
  return requirePermission(userId, "shadow_hide");
}

/**
 * Middleware para marcar como recurso
 */
export async function canMarkAsResource(userId: string) {
  return requirePermission(userId, "create_special_threads");
}

/**
 * Helper para responder con error de permiso
 */
export function permissionDeniedResponse(message: string = "Permiso denegado") {
  return NextResponse.json(
    {
      success: false,
      data: null,
      error: message,
    },
    { status: 403 }
  );
}

/**
 * Helper para responder con error de autenticación
 */
export function authRequiredResponse(message: string = "Autenticación requerida") {
  return NextResponse.json(
    {
      success: false,
      data: null,
      error: message,
    },
    { status: 401 }
  );
}
