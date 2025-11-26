# Sistema de Gamificación de LoopHub

Sistema de niveles basado en karma con permisos progresivos que incentiva la participación y mejora la calidad del contenido.

## 📊 Sistema de Niveles

### Niveles y Requisitos de Karma

| Nivel | Nombre | Karma Requerido | Progresión |
|-------|---------|-----------------|------------|
| 0 | Novato | 0 - 20 | Nivel inicial |
| 1 | Colaborador | 20 - 100 | +80 karma |
| 2 | Contribuidor | 100 - 500 | +400 karma |
| 3 | Experto | 500 - 2,000 | +1,500 karma |
| 4 | Maestro | 2,000 - 10,000 | +8,000 karma |
| 5 | Leyenda | 10,000+ | Nivel máximo |

## 🎯 Permisos por Nivel

### Nivel 0: Novato (0-20 karma)
- ✅ Publicar con límite diario
- ✅ Comentar en hilos
- ✅ Votar contenido

### Nivel 1: Colaborador (20-100 karma)
Permisos de Nivel 0 +
- ✅ Editar por más tiempo
- ✅ Subir imágenes sin cooldown

### Nivel 2: Contribuidor (100-500 karma)
Permisos de Nivel 1 +
- ✅ Crear hilos especiales
- ✅ Proponer tags (requiere aprobación)
- ✅ Marcar contenido como recurso útil

### Nivel 3: Experto (500-2,000 karma)
Permisos de Nivel 2 +
- ✅ Acceso a features beta
- ✅ Crear encuestas
- ✅ **Superlike** (otorga +2 karma al autor)

### Nivel 4: Maestro (2,000-10,000 karma)
Permisos de Nivel 3 +
- ✅ Shadow-hide (ocultar contenido por 12 horas)
- ✅ Recomendar posts a portada

### Nivel 5: Leyenda (10,000+ karma)
Permisos de Nivel 4 +
- ✅ Moderar su nicho
- ✅ Crear categorías nuevas (pendiente aprobación)

## 🔧 Arquitectura Técnica

### Estructura de Archivos

```
lib/gamification/
├── levels.ts         # Sistema de niveles y permisos
├── repository.ts     # Capa de acceso a datos
├── service.ts        # Lógica de negocio
└── middleware.ts     # Validación de permisos

app/api/
├── me/permissions/   # GET: Obtener permisos del usuario
└── posts/[id]/
    ├── superlike/    # POST: Aplicar superlike
    ├── hide/         # POST: Ocultar thread
    └── mark-resource/ # POST: Marcar como recurso
```

### Funciones Principales

#### `getUserLevel(karma: number): number`
Calcula el nivel del usuario basado en su karma.

```typescript
const level = getUserLevel(150); // Retorna: 2 (Contribuidor)
```

#### `LevelPermissions: Record<number, LevelInfo>`
Objeto estático que define permisos por nivel.

```typescript
const permissions = LevelPermissions[3].permissions;
// ['post_with_daily_limit', 'comment', 'vote', ..., 'superlike']
```

#### `hasPermission(karma: number, permission: string): boolean`
Verifica si un usuario tiene un permiso específico.

```typescript
const canSuperlike = hasPermission(600, 'superlike'); // true
const canHide = hasPermission(600, 'shadow_hide'); // false
```

## 📡 API Endpoints

### GET `/api/me/permissions`
Obtiene los permisos del usuario autenticado.

**Response:**
```json
{
  "success": true,
  "data": {
    "level": 3,
    "levelName": "Experto",
    "karma": 750,
    "permissions": ["post_with_daily_limit", "comment", "vote", ...],
    "progressToNextLevel": 16.67,
    "karmaToNextLevel": 1250
  },
  "error": null
}
```

### POST `/api/posts/[id]/superlike`
Aplica un superlike a un thread (+2 karma al autor).

**Requisitos:**
- Autenticación requerida
- Nivel 3 o superior
- No haber dado superlike previamente al mismo thread
- No ser el autor del thread

**Response:**
```json
{
  "success": true,
  "data": {
    "karma_awarded": 2
  },
  "error": null
}
```

**Error 403:**
```json
{
  "success": false,
  "data": null,
  "error": "No tienes permiso para usar superlike. Requiere nivel 3 o superior."
}
```

### POST `/api/posts/[id]/hide`
Oculta temporalmente un thread por 12 horas.

**Requisitos:**
- Autenticación requerida
- Nivel 4 o superior (permiso `shadow_hide`)

**Response:**
```json
{
  "success": true,
  "data": {
    "hidden_until": "2025-11-27T14:30:00.000Z"
  },
  "error": null
}
```

### POST `/api/posts/[id]/mark-resource`
Marca un thread como recurso útil.

**Requisitos:**
- Autenticación requerida
- Nivel 2 o superior

**Response:**
```json
{
  "success": true,
  "data": {
    "marked": true
  },
  "error": null
}
```

## 🗄️ Base de Datos

### Nueva Tabla: `superlikes`

```sql
CREATE TABLE superlikes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  thread_id UUID NOT NULL REFERENCES threads(id),
  author_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, thread_id)
);
```

### Nuevos Campos en `threads`

- `is_hidden: boolean` - Indica si el thread está oculto
- `is_resource: boolean` - Marca el thread como recurso útil
- `hidden_at: timestamp` - Cuándo fue ocultado
- `hidden_until: timestamp` - Cuándo será visible nuevamente

### Función SQL: `increment_reputation`

```sql
CREATE FUNCTION increment_reputation(user_id UUID, amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET reputation = reputation + amount
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 🔐 Middlewares de Permisos

### Uso de Middlewares

```typescript
import { requirePermission } from '@/lib/gamification/middleware';

// En un API route
const { allowed, error } = await requirePermission(userId, 'superlike');

if (!allowed) {
  return NextResponse.json({ error }, { status: 403 });
}
```

### Middlewares Específicos

- `canEditOthersTitles(userId)` - Editar títulos ajenos
- `canCreatePolls(userId)` - Crear encuestas
- `canApplySuperlike(userId)` - Aplicar superlike
- `canHidePosts(userId)` - Ocultar publicaciones
- `canMarkAsResource(userId)` - Marcar como recurso

## 📝 Validaciones Zod

Todas las entradas son validadas con Zod:

```typescript
export const superlikeSchema = z.object({
  thread_id: z.string().uuid("ID de thread inválido"),
});

export const hidePostSchema = z.object({
  thread_id: z.string().uuid("ID de thread inválido"),
});

export const markResourceSchema = z.object({
  thread_id: z.string().uuid("ID de thread inválido"),
});
```

## 🚀 Instalación

### 1. Ejecutar Migración

En el panel de Supabase, ejecuta:

```sql
-- Ver archivo: supabase/migrations/007_add_gamification_system.sql
```

### 2. Verificar RLS Policies

Asegúrate de que las políticas de seguridad estén activas:

```sql
SELECT * FROM pg_policies WHERE tablename = 'superlikes';
```

### 3. Probar Endpoints

```bash
# Obtener permisos
curl http://localhost:3000/api/me/permissions

# Aplicar superlike (requiere autenticación)
curl -X POST http://localhost:3000/api/posts/{thread-id}/superlike
```

## 🎮 Ejemplos de Uso

### Verificar Nivel del Usuario

```typescript
import { getUserLevel, getLevelInfo } from '@/lib/gamification/levels';

const karma = 350;
const level = getUserLevel(karma); // 2
const info = getLevelInfo(karma);

console.log(`Nivel: ${info.name}`); // "Contribuidor"
console.log(`Permisos: ${info.permissions.length}`); // 7
```

### Obtener Progreso

```typescript
import { getProgressToNextLevel, getKarmaToNextLevel } from '@/lib/gamification/levels';

const karma = 350;
const progress = getProgressToNextLevel(karma); // 62.5%
const needed = getKarmaToNextLevel(karma); // 150 karma
```

### Aplicar Superlike desde el Cliente

```typescript
const applySuperlike = async (threadId: string) => {
  const response = await fetch(`/api/posts/${threadId}/superlike`, {
    method: 'POST',
  });
  
  const data = await response.json();
  
  if (data.success) {
    console.log(`+${data.data.karma_awarded} karma otorgado`);
  } else {
    console.error(data.error);
  }
};
```

## 🔄 Flujo de Superlike

1. Usuario hace clic en "Superlike"
2. Cliente envía POST a `/api/posts/[id]/superlike`
3. Middleware verifica autenticación
4. Service verifica nivel del usuario (≥3)
5. Repository verifica que no exista superlike previo
6. Se crea registro en tabla `superlikes`
7. Se incrementa reputación del autor (+2)
8. Response exitoso al cliente

## 📊 Formato de Respuesta Estándar

Todos los endpoints siguen el mismo formato:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}
```

**Éxito:**
```json
{ "success": true, "data": {...}, "error": null }
```

**Error:**
```json
{ "success": false, "data": null, "error": "Mensaje de error" }
```

## 🛡️ Seguridad

- ✅ Row Level Security (RLS) habilitado en todas las tablas
- ✅ Validación de permisos en cada endpoint
- ✅ Validación de entrada con Zod
- ✅ Prevención de auto-superlike
- ✅ Unicidad de superlikes por usuario/thread
- ✅ Autenticación requerida en todas las operaciones

## 🎯 Próximas Mejoras

- [ ] Sistema de notificaciones para superlikes recibidos
- [ ] Dashboard de estadísticas por nivel
- [ ] Badges y logros especiales
- [ ] Cooldown configurable para superlikes
- [ ] Auto-unhide automático con pg_cron
- [ ] Historial de acciones de moderación
- [ ] Límites de uso por nivel (ej: 3 superlikes diarios)

## 📚 Referencias

- **Archivo de niveles:** `lib/gamification/levels.ts`
- **Servicios:** `lib/gamification/service.ts`
- **Repositorio:** `lib/gamification/repository.ts`
- **Middleware:** `lib/gamification/middleware.ts`
- **Migración SQL:** `supabase/migrations/007_add_gamification_system.sql`
- **Validaciones:** `lib/validations.ts`

---

**Sistema completamente funcional, tipado, modular y listo para producción.**
