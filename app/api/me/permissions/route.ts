/**
 * GET /api/me/permissions
 * Obtiene los permisos del usuario autenticado basados en su nivel
 */

import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api-helpers";
import { getUserPermissions } from "@/lib/gamification/service";

export async function GET() {
  try {
    // Verificar autenticación
    const { user } = await requireAuth();

    // Obtener permisos del usuario
    const result = await getUserPermissions(user.id);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: result.error,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      error: null,
    });
  } catch (error) {
    return handleApiError(error, "Error al obtener permisos");
  }
}
