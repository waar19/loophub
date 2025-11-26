# Sistema de Votación (Upvote/Downvote)

## 📋 Resumen

Este documento describe la implementación completa del sistema de votación con upvote/downvote que reemplaza el sistema simple de "me gusta" (likes) original.

## ✅ Estado: LISTO PARA MIGRACIÓN

- ✅ Migración SQL corregida y lista
- ✅ API endpoints implementados
- ✅ Componente VoteButtons completo
- ✅ Integración en UI completada
- ✅ Traducciones añadidas (ES, EN, PT)
- ✅ Build pasando sin errores
- ⏳ **Pendiente:** Ejecutar migración 010 en Supabase Dashboard

## 🗄️ Migración de Base de Datos

**Archivo:** `supabase/migrations/010_voting_system.sql`

### Cambios en la Base de Datos

1. **Tabla `likes` → `votes`**
   - Renombrada de `likes` a `votes`
   - Campo `vote_type`: `SMALLINT` (1 = upvote, -1 = downvote)
   - Constraint: `vote_type IN (1, -1)`

2. **Tabla `threads`**
   - `like_count` → `upvote_count` (renombrado)
   - Nuevo campo: `downvote_count INTEGER DEFAULT 0`
   - Nuevo campo: `score INTEGER GENERATED ALWAYS AS (upvote_count - downvote_count) STORED`

3. **Tabla `comments`**
   - `like_count` → `upvote_count` (renombrado)
   - Nuevo campo: `downvote_count INTEGER DEFAULT 0`
   - Nuevo campo: `score INTEGER GENERATED ALWAYS AS (upvote_count - downvote_count) STORED`

### Triggers Automáticos

**8 Triggers creados** (divididos para compatibilidad PostgreSQL):

#### Actualización de Conteos de Votos
1. `update_thread_vote_counts_trigger_insert_update` - Para INSERT/UPDATE en threads
2. `update_thread_vote_counts_trigger_delete` - Para DELETE en threads
3. `update_comment_vote_counts_trigger_insert_update` - Para INSERT/UPDATE en comments
4. `update_comment_vote_counts_trigger_delete` - Para DELETE en comments

#### Actualización de Karma
5. `update_karma_for_thread_vote_trigger_insert_update` - Karma en INSERT/UPDATE de votos de threads
6. `update_karma_for_thread_vote_trigger_delete` - Karma en DELETE de votos de threads
7. `update_karma_for_comment_vote_trigger_insert_update` - Karma en INSERT/UPDATE de votos de comments
8. `update_karma_for_comment_vote_trigger_delete` - Karma en DELETE de votos de comments

### Sistema de Karma

- **Upvote (+1):** +1 punto de karma al autor
- **Downvote (-1):** -1 punto de karma al autor
- **Cambio de voto:** Ajuste automático (ej: upvote→downvote = -2 karma)
- **Remover voto:** Revertir el karma otorgado

## 🔌 API Endpoints

### `/api/votes`

#### POST - Crear o actualizar voto
```typescript
Body: {
  threadId?: string;
  commentId?: string;
  voteType: 1 | -1; // 1 = upvote, -1 = downvote
}

Response: {
  message: string;
  upvotes: number;
  downvotes: number;
  score: number;
  userVote: 1 | -1;
}
```

**Casos manejados:**
- Nuevo voto: Inserta en tabla votes
- Cambio de voto (upvote→downvote): Actualiza vote_type
- Mismo voto: Retorna estado actual sin cambios

#### DELETE - Remover voto
```typescript
Query params: ?threadId=X o ?commentId=X

Response: {
  message: string;
  upvotes: number;
  downvotes: number;
  score: number;
  userVote: null;
}
```

#### GET - Obtener estado de votación
```typescript
Query params: ?threadId=X o ?commentId=X

Response: {
  upvotes: number;
  downvotes: number;
  score: number;
  userVote: 1 | -1 | null;
}
```

### `/api/likes` (Retrocompatibilidad)

Mantiene el endpoint original actualizando la tabla `votes` con `vote_type = 1` (equivalente a upvote).

## 🎨 Componentes UI

### `VoteButtons.tsx`

**Props:**
```typescript
interface VoteButtonsProps {
  threadId?: string;
  commentId?: string;
  initialUpvotes?: number;
  initialDownvotes?: number;
  initialUserVote?: 1 | -1 | null;
}
```

**Características:**
- ✅ Optimistic UI (actualización inmediata antes de respuesta)
- ✅ Indicadores visuales claros (azul upvote, rojo downvote)
- ✅ Score con color dinámico (verde positivo, rojo negativo)
- ✅ Hover animations (scale 1.2)
- ✅ Estado deshabilitado para usuarios no autenticados
- ✅ Manejo de errores con toast notifications
- ✅ Click en mismo botón remueve el voto

**Lógica de votación:**
```
Ningún voto + Click Upvote = Upvote
Upvote + Click Upvote = Sin voto (remover)
Upvote + Click Downvote = Downvote (cambiar)
Downvote + Click Downvote = Sin voto (remover)
Downvote + Click Upvote = Upvote (cambiar)
```

### Integración en Componentes

#### `ThreadCard.tsx`
```tsx
<VoteButtons
  threadId={thread.id}
  initialUpvotes={thread.upvote_count || 0}
  initialDownvotes={thread.downvote_count || 0}
/>
```

#### `CommentCard.tsx`
```tsx
<VoteButtons
  commentId={comment.id}
  initialUpvotes={comment.upvote_count || 0}
  initialDownvotes={comment.downvote_count || 0}
/>
```

## 🌍 Traducciones

### Español (ES)
```typescript
voting: {
  upvote: "Voto positivo",
  downvote: "Voto negativo",
  score: "Puntuación",
  removeUpvote: "Quitar voto positivo",
  removeDownvote: "Quitar voto negativo",
  votes: "votos",
  errorVoting: "Error al votar. Por favor, intenta de nuevo.",
  mustLogin: "Debes iniciar sesión para votar",
}
```

### English (EN)
```typescript
voting: {
  upvote: "Upvote",
  downvote: "Downvote",
  score: "Score",
  removeUpvote: "Remove upvote",
  removeDownvote: "Remove downvote",
  votes: "votes",
  errorVoting: "Error voting. Please try again.",
  mustLogin: "You must log in to vote",
}
```

### Português (PT)
```typescript
voting: {
  upvote: "Voto positivo",
  downvote: "Voto negativo",
  score: "Pontuação",
  removeUpvote: "Remover voto positivo",
  removeDownvote: "Remover voto negativo",
  votes: "votos",
  errorVoting: "Erro ao votar. Por favor, tente novamente.",
  mustLogin: "Você deve fazer login para votar",
}
```

## 📝 Interfaces TypeScript

### `lib/supabase.ts`
```typescript
export interface Thread {
  id: string;
  forum_id: string;
  title: string;
  content: string;
  like_count: number; // Legacy, se mantiene
  upvote_count: number;
  downvote_count: number;
  score?: number;
  created_at: string;
  user_id?: string;
  profile?: { username: string };
  _count?: { comments: number };
}

export interface Comment {
  id: string;
  thread_id: string;
  content: string;
  like_count: number; // Legacy, se mantiene
  upvote_count: number;
  downvote_count: number;
  score?: number;
  created_at: string;
  user_id?: string;
  profile?: { username: string };
}
```

## 🚀 Pasos para Activar el Sistema

### 1. Ejecutar Migración (Obligatorio)
```sql
-- Abrir Supabase Dashboard → SQL Editor
-- Pegar el contenido completo de:
supabase/migrations/010_voting_system.sql
-- Ejecutar
```

### 2. Verificar Datos Migrados
```sql
-- Verificar que los votos se migraron correctamente
SELECT COUNT(*) FROM votes;

-- Verificar columnas en threads
SELECT id, title, upvote_count, downvote_count, score 
FROM threads 
LIMIT 5;

-- Verificar triggers
SELECT trigger_name 
FROM information_schema.triggers 
WHERE event_object_table = 'votes';
```

### 3. Probar en Local
```bash
# El código ya está integrado, solo ejecutar:
yarn dev

# Probar:
# - Click en upvote en un thread
# - Click en downvote en un comment
# - Cambiar de upvote a downvote
# - Remover voto (click en mismo botón)
# - Verificar que el score se actualiza
# - Verificar que el karma del autor cambia
```

## 🔍 Diferencias con Sistema Anterior

| Característica | Sistema Anterior (Likes) | Nuevo Sistema (Voting) |
|----------------|-------------------------|------------------------|
| Tipos de voto | Solo "me gusta" | Upvote y Downvote |
| Tabla | `likes` | `votes` |
| Campo voto | Implícito (existencia) | `vote_type` (1/-1) |
| Contadores | `like_count` | `upvote_count`, `downvote_count` |
| Score | No existía | `score = upvote - downvote` |
| Karma | Solo positivo (+1) | Positivo y negativo (±1) |
| UI | Corazón simple | Flechas arriba/abajo con colores |
| API | `/api/likes` | `/api/votes` + `/api/likes` (compat) |

## ✨ Mejoras Implementadas

1. **Expresión de opinión completa:** Los usuarios pueden mostrar tanto acuerdo (upvote) como desacuerdo (downvote)
2. **Score visible:** Métrica clara de calidad del contenido (upvotes - downvotes)
3. **Karma mejorado:** Sistema más realista que refleja la recepción del contenido
4. **Optimistic UI:** Feedback instantáneo al usuario antes de confirmación del servidor
5. **Retrocompatibilidad:** Endpoint `/api/likes` sigue funcionando para código legacy
6. **Triggers automáticos:** Conteos y karma se actualizan sin intervención manual

## 🐛 Resolución de Problemas

### Error: "DELETE trigger's WHEN condition cannot reference NEW values"
**Solución:** Los triggers fueron divididos en versiones separadas para INSERT/UPDATE y DELETE.

### Error: TypeScript no reconoce upvote_count/downvote_count
**Solución:** Actualizar interfaces en `lib/supabase.ts`, `app/page.tsx` y `components/HomeContent.tsx`

### Los conteos no se actualizan
**Solución:** Verificar que los 8 triggers se crearon correctamente en Supabase

### El karma no cambia al votar
**Solución:** Verificar los 4 triggers de karma (`update_karma_for_*`)

## 📊 Queries Útiles

```sql
-- Ver todos los votos de un usuario
SELECT v.*, t.title 
FROM votes v 
JOIN threads t ON v.thread_id = t.id 
WHERE v.user_id = 'USER_ID';

-- Threads con mejor score
SELECT title, upvote_count, downvote_count, score 
FROM threads 
ORDER BY score DESC 
LIMIT 10;

-- Karma total de un usuario
SELECT karma FROM profiles WHERE id = 'USER_ID';

-- Audit trail de karma
SELECT * FROM karma_audit 
WHERE user_id = 'USER_ID' 
ORDER BY created_at DESC;
```

## 🎯 Próximos Pasos

Después de activar el sistema de votación, continuar con las siguientes features del TODO.md:

1. ✅ **Sistema de Votación** (COMPLETADO)
2. 🔔 **Sistema de Notificaciones en Tiempo Real**
3. 💬 **Comentarios Anidados (Replies)**
4. 👤 **Sistema de Menciones (@usuario)**
5. 🖼️ **Soporte de Imágenes**
6. 🏆 **Sistema de Insignias/Badges**

---

**Creado:** 2025
**Última actualización:** 2025-01-XX (día de migración)
**Autor:** Sistema de Desarrollo LoopHub
