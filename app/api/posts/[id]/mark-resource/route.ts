/**
 * POST /api/posts/[id]/mark-resource
 * Marca un thread como recurso útil
 * Requiere nivel 2 o superior (permiso create_special_threads)
 */

import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api-helpers";
import { markAsResource } from "@/lib/gamification/service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    // Verificar autenticación
    const { user } = await requireAuth();

    // Obtener ID del thread
    const { id: threadId } = await context.params;

    if (!threadId) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: "ID de thread requerido",
        },
        { status: 400 }
      );
    }

    // Marcar como recurso
    const result = await markAsResource(threadId, user.id);

    if (!result.success) {
      const status = result.error?.includes("permiso") ? 403 : 400;
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: result.error,
        },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      error: null,
    });
  } catch (error) {
    return handleApiError(error, "Error al marcar como recurso");
  }
}
