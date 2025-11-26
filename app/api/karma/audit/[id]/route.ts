/**
 * GET /api/karma/audit/[id]
 * Audita el karma de un usuario y muestra discrepancias
 * Solo para administradores
 */

import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api-helpers";
import { auditAndFixKarma } from "@/lib/gamification/karma";
import { getUserProfile } from "@/lib/gamification/repository";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    // Verificar autenticación
    const { user } = await requireAuth();

    // Verificar que el usuario es admin
    const adminProfile = await getUserProfile(user.id);
    if (!adminProfile?.is_admin) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: "Solo administradores pueden auditar karma",
        },
        { status: 403 }
      );
    }

    // Obtener ID del usuario a auditar
    const { id: targetUserId } = await context.params;

    if (!targetUserId) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: "ID de usuario requerido",
        },
        { status: 400 }
      );
    }

    // Realizar auditoría
    const auditResult = await auditAndFixKarma(targetUserId);

    return NextResponse.json({
      success: true,
      data: auditResult,
      error: null,
    });
  } catch (error) {
    return handleApiError(error, "Error al auditar karma");
  }
}
