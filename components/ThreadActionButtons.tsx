/**
 * ThreadActionButtons Component
 * Ejemplo de botones de acción con validación de permisos
 */

'use client';

import { useState } from 'react';
import { useSuperlike, useHidePost, useMarkAsResource, useUserPermissions, hasPermission } from '@/hooks/useGamification';

interface ThreadActionButtonsProps {
  threadId: string;
  authorId: string;
  currentUserId: string | null;
}

export default function ThreadActionButtons({ threadId, authorId, currentUserId }: ThreadActionButtonsProps) {
  const { permissions } = useUserPermissions();
  const { applySuperlike, loading: superlikeLoading, hasSuperliked } = useSuperlike(threadId);
  const { hidePost, loading: hideLoading } = useHidePost(threadId);
  const { markAsResource, loading: resourceLoading, isResource } = useMarkAsResource(threadId);
  
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const isOwnPost = currentUserId === authorId;

  const handleSuperlike = async () => {
    if (!hasPermission(permissions, 'superlike')) {
      setMessage({ text: 'Requiere nivel 3 o superior', type: 'error' });
      return;
    }

    if (isOwnPost) {
      setMessage({ text: 'No puedes dar superlike a tu propio post', type: 'error' });
      return;
    }

    const result = await applySuperlike();
    if (result.success) {
      setMessage({ text: `¡Superlike aplicado! +${result.karmaAwarded} karma al autor`, type: 'success' });
    } else {
      setMessage({ text: result.error || 'Error al aplicar superlike', type: 'error' });
    }

    setTimeout(() => setMessage(null), 3000);
  };

  const handleHide = async () => {
    if (!hasPermission(permissions, 'shadow_hide')) {
      setMessage({ text: 'Requiere nivel 4 o superior', type: 'error' });
      return;
    }

    const result = await hidePost();
    if (result.success) {
      setMessage({ text: 'Post ocultado por 12 horas', type: 'success' });
    } else {
      setMessage({ text: result.error || 'Error al ocultar post', type: 'error' });
    }

    setTimeout(() => setMessage(null), 3000);
  };

  const handleMarkResource = async () => {
    if (!hasPermission(permissions, 'create_special_threads')) {
      setMessage({ text: 'Requiere nivel 2 o superior', type: 'error' });
      return;
    }

    const result = await markAsResource();
    if (result.success) {
      setMessage({ text: 'Marcado como recurso útil', type: 'success' });
    } else {
      setMessage({ text: result.error || 'Error al marcar como recurso', type: 'error' });
    }

    setTimeout(() => setMessage(null), 3000);
  };

  if (!currentUserId) {
    return null; // No mostrar botones si no está autenticado
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Mensaje de feedback */}
      {message && (
        <div
          className={`px-4 py-2 rounded text-sm ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800 border border-green-300'
              : 'bg-red-100 text-red-800 border border-red-300'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex gap-2 flex-wrap">
        {/* Superlike */}
        {!isOwnPost && (
          <button
            onClick={handleSuperlike}
            disabled={superlikeLoading || hasSuperliked || !hasPermission(permissions, 'superlike')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              hasSuperliked
                ? 'bg-purple-200 text-purple-800 cursor-not-allowed'
                : hasPermission(permissions, 'superlike')
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-gray-300 text-gray-600 cursor-not-allowed'
            }`}
            title={!hasPermission(permissions, 'superlike') ? 'Requiere nivel 3' : ''}
          >
            {superlikeLoading ? '...' : hasSuperliked ? '⭐ Superliked' : '⭐ Superlike (+2)'}
          </button>
        )}

        {/* Marcar como recurso */}
        <button
          onClick={handleMarkResource}
          disabled={resourceLoading || isResource || !hasPermission(permissions, 'create_special_threads')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
            isResource
              ? 'bg-green-200 text-green-800 cursor-not-allowed'
              : hasPermission(permissions, 'create_special_threads')
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-300 text-gray-600 cursor-not-allowed'
          }`}
          title={!hasPermission(permissions, 'create_special_threads') ? 'Requiere nivel 2' : ''}
        >
          {resourceLoading ? '...' : isResource ? '📚 Recurso' : '📚 Marcar Recurso'}
        </button>

        {/* Ocultar (shadow-hide) */}
        <button
          onClick={handleHide}
          disabled={hideLoading || !hasPermission(permissions, 'shadow_hide')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
            hasPermission(permissions, 'shadow_hide')
              ? 'bg-orange-600 text-white hover:bg-orange-700'
              : 'bg-gray-300 text-gray-600 cursor-not-allowed'
          }`}
          title={!hasPermission(permissions, 'shadow_hide') ? 'Requiere nivel 4' : ''}
        >
          {hideLoading ? '...' : '👁️ Ocultar (12h)'}
        </button>
      </div>

      {/* Indicador de nivel requerido */}
      <div className="text-xs text-gray-500">
        {permissions && (
          <div>
            Tu nivel: <span className="font-semibold">{permissions.levelName}</span> (Nivel {permissions.level})
          </div>
        )}
      </div>
    </div>
  );
}
