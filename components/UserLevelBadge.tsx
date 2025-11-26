/**
 * UserLevelBadge Component
 * Ejemplo de componente para mostrar el nivel del usuario
 */

'use client';

import { useUserPermissions, getLevelColor, formatKarma } from '@/hooks/useGamification';

export default function UserLevelBadge() {
  const { permissions, loading, error } = useUserPermissions();

  if (loading) {
    return (
      <div className="animate-pulse flex items-center gap-2">
        <div className="h-8 w-20 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (error || !permissions) {
    return null;
  }

  const levelColor = getLevelColor(permissions.level);
  const formattedKarma = formatKarma(permissions.karma);

  return (
    <div className="flex flex-col gap-2 p-4 border rounded-lg">
      {/* Badge del nivel */}
      <div className="flex items-center gap-3">
        <div
          className="px-3 py-1 rounded-full text-white font-semibold text-sm"
          style={{ backgroundColor: levelColor }}
        >
          Nivel {permissions.level}
        </div>
        <span className="text-lg font-bold">{permissions.levelName}</span>
      </div>

      {/* Karma */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Karma:</span>
        <span className="text-xl font-bold" style={{ color: levelColor }}>
          {formattedKarma}
        </span>
      </div>

      {/* Barra de progreso */}
      {permissions.level < 5 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-600">
            <span>Progreso al siguiente nivel</span>
            <span>{permissions.karmaToNextLevel} karma restante</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${permissions.progressToNextLevel}%`,
                backgroundColor: levelColor,
              }}
            />
          </div>
          <div className="text-xs text-gray-500 text-right">
            {permissions.progressToNextLevel.toFixed(1)}%
          </div>
        </div>
      )}

      {/* Permisos desbloqueados */}
      <details className="mt-2">
        <summary className="cursor-pointer text-sm font-semibold text-gray-700">
          Permisos desbloqueados ({permissions.permissions.length})
        </summary>
        <ul className="mt-2 space-y-1 text-xs text-gray-600 pl-4">
          {permissions.permissions.map((permission) => (
            <li key={permission} className="list-disc">
              {formatPermissionName(permission)}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

/**
 * Helper para formatear nombres de permisos
 */
function formatPermissionName(permission: string): string {
  const names: Record<string, string> = {
    post_with_daily_limit: 'Publicar con límite diario',
    comment: 'Comentar',
    vote: 'Votar',
    edit_extended: 'Editar por más tiempo',
    upload_images_no_cooldown: 'Subir imágenes sin cooldown',
    create_special_threads: 'Crear hilos especiales',
    propose_tags: 'Proponer tags',
    access_beta_features: 'Acceso a features beta',
    create_polls: 'Crear encuestas',
    superlike: 'Usar superlike',
    shadow_hide: 'Ocultar contenido',
    recommend_to_frontpage: 'Recomendar a portada',
    moderate_niche: 'Moderar nicho',
    create_categories: 'Crear categorías',
  };

  return names[permission] || permission;
}
