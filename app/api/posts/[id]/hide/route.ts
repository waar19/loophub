/**
 * POST /api/posts/[id]/hide
 * Oculta temporalmente un thread por 12 horas
 * Requiere nivel 4 o superior (permiso shadow_hide)
 */

import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api-helpers";
import { hidePost } from "@/lib/gamification/service";

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

    // Ocultar el thread
    const result = await hidePost(threadId, user.id);

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
    return handleApiError(error, "Error al ocultar el post");
  }
}
