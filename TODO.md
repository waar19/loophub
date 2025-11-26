# 🚀 Plan de Desarrollo LoopHub - Próximas Mejoras

## 📊 Estado Actual
- ✅ Sistema de gamificación completo (karma, niveles, permisos)
- ✅ Cambio de username (una vez gratis)
- ✅ Onboarding de usuarios
- ✅ Sistema de foros, threads y comentarios
- ✅ Autenticación (Email + Google OAuth)
- ✅ Modo oscuro
- ✅ Diseño responsive
- ✅ SEO básico
- ✅ Sistema de reportes
- ✅ Panel de administración básico

---

## 🎯 FASE 1: Funcionalidades Core de Comunidad (PRIORIDAD ALTA)

### 1. ✅ Sistema de Votos (Upvote/Downvote) - COMPLETADO 🎉
**Prioridad**: CRÍTICA  
**Tiempo estimado**: 3-4 días  
**Impacto**: ⭐⭐⭐⭐⭐
**Estado**: ✅ COMPLETADO (Nov 26, 2025)

**Tareas**:
- [x] Migración de base de datos
  - [x] Tabla `votes` (renombrada desde `likes`)
  - [x] Columnas `upvote_count`, `downvote_count`, `score` en threads
  - [x] Columnas `upvote_count`, `downvote_count`, `score` en comments
  - [x] 8 triggers para actualizar contadores (INSERT/UPDATE y DELETE)
  - [x] Triggers para actualizar karma automáticamente
  - [x] RLS policies actualizadas

- [x] API Endpoints
  - [x] POST `/api/votes` - Crear/actualizar voto
  - [x] DELETE `/api/votes` - Eliminar voto
  - [x] GET `/api/votes` - Obtener estado de voto
  - [x] `/api/likes` actualizado para retrocompatibilidad

- [x] Componentes UI
  - [x] `VoteButtons.tsx` - Componente reutilizable con optimistic UI
  - [x] Integrado en `ThreadCard.tsx`
  - [x] Integrado en `CommentCard.tsx`
  - [x] Animaciones hover (scale 1.2)
  - [x] Estados optimistas (UI update instantánea)
  - [x] Colores dinámicos (azul upvote, rojo downvote, verde/rojo score)

- [x] Lógica de Karma
  - [x] Upvote = +1 karma al autor
  - [x] Downvote = -1 karma al autor
  - [x] Triggers automáticos para threads y comments
  - [x] Actualizado sistema de karma existente

- [x] Interfaces TypeScript
  - [x] Actualizadas en `lib/supabase.ts`
  - [x] Actualizadas en `app/page.tsx`
  - [x] Actualizadas en `components/HomeContent.tsx`
  - [x] Actualizadas en `lib/gamification/`

- [x] Traducciones
  - [x] Textos de votos en ES, EN, PT
  - [x] 8 nuevas claves de traducción

- [x] Queries actualizadas
  - [x] Página de perfil de usuario
  - [x] Sistema de gamificación
  - [x] Cálculo de karma

**Archivos creados/modificados**:
- ✅ `supabase/migrations/010_voting_system.sql`
- ✅ `app/api/votes/route.ts`
- ✅ `components/VoteButtons.tsx`
- ✅ `docs/VOTING_SYSTEM.md`
- ✅ Múltiples queries actualizadas
- `app/api/votes/route.ts`
- `components/VoteButtons.tsx`
- `hooks/useVotes.ts`

**Archivos a modificar**:
- `components/ThreadCard.tsx`
- `components/CommentCard.tsx`
- `lib/i18n/translations.ts`

**Estado**: ✅ COMPLETADO

---

### 2. Notificaciones Persistentes con Realtime 🔥
**Prioridad**: CRÍTICA  
**Tiempo estimado**: 4-5 días  
**Impacto**: ⭐⭐⭐⭐⭐

**Tareas**:
- [x] Migración de base de datos
  - [x] Tabla `notifications` completa (extendida desde migration 005)
  - [x] Columna `read` boolean
  - [x] Columna `type` (comment_reply, thread_comment, mention, upvote, downvote, vote_milestone)
  - [x] RLS policies
  - [x] Índices para queries eficientes
  - [x] Habilitar Realtime publication

- [x] Triggers automáticos
  - [x] Notificar cuando alguien comenta en tu thread (ya existía)
  - [x] Notificar cuando te votan (primer upvote + cada 5 votos)
  - [x] Smart notifications (no spam, solo milestones)
  - [x] Funciones `notify_thread_upvote()` y `notify_comment_upvote()`

- [x] API Endpoints (mejorados)
  - [x] GET `/api/notifications` - Listar notificaciones
  - [x] PATCH `/api/notifications/[id]` - Marcar como leída
  - [x] POST `/api/notifications/read-all` - Marcar todas como leídas (optimizado con función RPC)

- [x] Supabase Realtime
  - [x] Hook `useRealtimeNotifications.ts` creado
  - [x] Suscripción a INSERT/UPDATE en tiempo real
  - [x] Actualizar badge automáticamente
  - [x] Soporte para notificaciones del navegador

- [x] Componentes UI
  - [x] `NotificationBell.tsx` completamente rediseñado
  - [x] Dropdown de notificaciones en header
  - [ ] Página `/notifications` completa
  - [ ] Item de notificación con avatar, texto, tiempo
  - [ ] "Ver todas" link al dropdown
  - [ ] Badge con contador de no leídas
  - [ ] Animación al recibir nueva notificación

- [ ] Configuración de usuario
  - [ ] Tabla `notification_settings`
  - [ ] Preferencias (email, push, in-app)
  - [ ] UI en `/settings` para configurar

- [ ] Traducciones
  - [ ] Textos de notificaciones en ES, EN, PT
  - [ ] Templates de mensajes

**Archivos a crear**:
- `supabase/migrations/011_notifications_complete.sql`
- `hooks/useRealtimeNotifications.ts`
- `components/NotificationItem.tsx`
- `components/NotificationDropdown.tsx`
- `app/notifications/page.tsx` (mejorar existente)

**Archivos a modificar**:
- `components/NotificationBell.tsx`
- `components/Header.tsx`
- `app/settings/page.tsx`
- `lib/i18n/translations.ts`

---

### 3. Respuestas Anidadas (Threaded Comments) 🔥
**Prioridad**: ALTA  
**Tiempo estimado**: 3-4 días  
**Impacto**: ⭐⭐⭐⭐

**Tareas**:
- [ ] Migración de base de datos
  - [ ] Columna `parent_id` en tabla comments
  - [ ] Índice en parent_id
  - [ ] Query recursivo para obtener árbol de comentarios

- [ ] API Endpoints
  - [ ] Modificar GET `/api/threads/[id]/comments` para árbol
  - [ ] Soportar respuestas en POST de comentarios

- [ ] Componentes UI
  - [ ] `CommentThread.tsx` - Comentario con respuestas anidadas
  - [ ] Botón "Responder" en cada comentario
  - [ ] Indentación visual (padding-left incremental)
  - [ ] "Ver N respuestas" / Colapsar respuestas
  - [ ] Líneas verticales para indicar nivel
  - [ ] Límite de profundidad (ej: 5 niveles máx)

- [ ] UX
  - [ ] Formulario de respuesta inline
  - [ ] Quote del comentario al que respondes
  - [ ] Navegación entre niveles
  - [ ] "Ir al padre" si estás en respuesta profunda

- [ ] Traducciones
  - [ ] "Responder", "Ver respuestas", etc. en ES, EN, PT

**Archivos a crear**:
- `supabase/migrations/012_nested_comments.sql`
- `components/CommentThread.tsx`
- `components/CommentReplyForm.tsx`

**Archivos a modificar**:
- `components/CommentCard.tsx`
- `app/api/threads/[id]/comments/route.ts`
- `lib/i18n/translations.ts`

---

### 4. Menciones de Usuarios (@username) 🔥
**Prioridad**: ALTA  
**Tiempo estimado**: 2-3 días  
**Impacto**: ⭐⭐⭐⭐

**Tareas**:
- [ ] Detección de menciones
  - [ ] Regex para detectar @username en texto
  - [ ] Tabla `mentions` para tracking
  - [ ] Trigger para extraer menciones al crear thread/comment

- [ ] API Endpoints
  - [ ] GET `/api/users/search?q=` - Buscar usuarios para autocompletar
  - [ ] Endpoint para procesar menciones

- [ ] Componentes UI
  - [ ] Autocompletar en `MarkdownEditor`
  - [ ] Dropdown de usuarios al escribir @
  - [ ] Highlight de @username en texto renderizado
  - [ ] Link a perfil del usuario mencionado

- [ ] Notificaciones
  - [ ] Crear notificación cuando te mencionan
  - [ ] Tipo de notificación: "mention"

- [ ] Markdown Renderer
  - [ ] Parsear @username en `MarkdownRenderer.tsx`
  - [ ] Convertir a links clicables
  - [ ] Estilo especial para menciones

- [ ] Traducciones
  - [ ] Textos de menciones en ES, EN, PT

**Archivos a crear**:
- `supabase/migrations/013_mentions_system.sql`
- `app/api/users/search/route.ts`
- `components/UserMentionAutocomplete.tsx`

**Archivos a modificar**:
- `components/MarkdownEditor.tsx`
- `components/MarkdownRenderer.tsx`
- `lib/i18n/translations.ts`

---

## 🎨 FASE 2: Contenido Rico y Media (PRIORIDAD MEDIA-ALTA)

### 5. Imágenes en Threads y Comentarios 🔥
**Prioridad**: ALTA  
**Tiempo estimado**: 3-4 días  
**Impacto**: ⭐⭐⭐⭐

**Tareas**:
- [ ] Supabase Storage
  - [ ] Bucket `post-images` público
  - [ ] Bucket `comment-images` público
  - [ ] RLS policies para storage
  - [ ] Límites de tamaño (5MB por imagen)

- [ ] API Endpoints
  - [ ] POST `/api/upload/image` - Subir imagen
  - [ ] DELETE `/api/upload/image/[id]` - Eliminar imagen
  - [ ] Validación de tipo de archivo
  - [ ] Resize/optimize con Sharp o similar

- [ ] Tabla de tracking
  - [ ] Tabla `images` (id, user_id, url, thread_id, comment_id)
  - [ ] Relación con threads/comments

- [ ] Componentes UI
  - [ ] `ImageUploader.tsx` - Drag & drop
  - [ ] Preview de imagen antes de subir
  - [ ] Progress bar de upload
  - [ ] Galería de imágenes en thread
  - [ ] Lightbox para ver imágenes en grande
  - [ ] Botón de eliminar imagen

- [ ] Markdown
  - [ ] Soporte de sintaxis ![alt](url)
  - [ ] Insertar imagen desde uploader

- [ ] Optimización
  - [ ] Lazy loading de imágenes
  - [ ] Placeholders mientras carga
  - [ ] Responsive images (srcset)

- [ ] Traducciones
  - [ ] Textos de upload en ES, EN, PT

**Archivos a crear**:
- `supabase/migrations/014_image_storage.sql`
- `app/api/upload/image/route.ts`
- `components/ImageUploader.tsx`
- `components/ImageGallery.tsx`
- `components/Lightbox.tsx`

**Archivos a modificar**:
- `components/MarkdownEditor.tsx`
- `components/MarkdownRenderer.tsx`
- `app/forum/[slug]/new/page.tsx`

---

### 6. Markdown Enriquecido
**Prioridad**: MEDIA  
**Tiempo estimado**: 2 días  
**Impacto**: ⭐⭐⭐

**Tareas**:
- [ ] Syntax Highlighting
  - [ ] Integrar Prism.js o highlight.js
  - [ ] Soporte para múltiples lenguajes
  - [ ] Theme de código acorde al modo oscuro

- [ ] Elementos adicionales
  - [ ] Tablas
  - [ ] Blockquotes mejorados
  - [ ] Listas de tareas (checkboxes)
  - [ ] Spoilers/collapsibles
  - [ ] Embeds (YouTube, Twitter, etc.)

- [ ] Preview mejorado
  - [ ] Live preview side-by-side
  - [ ] Tabs: Write | Preview

- [ ] Toolbar
  - [ ] Botones para formato común
  - [ ] Shortcuts de teclado

**Archivos a modificar**:
- `components/MarkdownEditor.tsx`
- `components/MarkdownRenderer.tsx`

---

## 🔍 FASE 3: Descubrimiento y Organización (PRIORIDAD MEDIA)

### 7. Tags/Etiquetas
**Prioridad**: MEDIA  
**Tiempo estimado**: 2-3 días  
**Impacto**: ⭐⭐⭐

**Tareas**:
- [ ] Base de datos
  - [ ] Tabla `tags` (id, name, slug, color)
  - [ ] Tabla `thread_tags` (thread_id, tag_id)
  - [ ] Índices

- [ ] API
  - [ ] GET `/api/tags` - Listar tags
  - [ ] GET `/api/tags/popular` - Tags más usados
  - [ ] Asociar tags al crear thread

- [ ] UI
  - [ ] Input de tags al crear thread
  - [ ] Sugerencias de tags populares
  - [ ] Badges de tags en ThreadCard
  - [ ] Página de tag: `/tag/[slug]`
  - [ ] Filtrar threads por tag
  - [ ] Tag cloud / Tag sidebar

**Archivos a crear**:
- `supabase/migrations/015_tags_system.sql`
- `app/api/tags/route.ts`
- `app/tag/[slug]/page.tsx`
- `components/TagInput.tsx`
- `components/TagBadge.tsx`

---

### 8. Búsqueda Avanzada
**Prioridad**: MEDIA  
**Tiempo estimado**: 2-3 días  
**Impacto**: ⭐⭐⭐

**Tareas**:
- [ ] Filtros
  - [ ] Por foro
  - [ ] Por fecha (hoy, semana, mes, año, todo)
  - [ ] Por autor
  - [ ] Por tags
  - [ ] Solo threads / Solo comentarios

- [ ] Ordenamiento
  - [ ] Relevancia
  - [ ] Más reciente
  - [ ] Más votado
  - [ ] Más comentado

- [ ] UI
  - [ ] Sidebar de filtros
  - [ ] Chips de filtros activos
  - [ ] Limpiar filtros
  - [ ] Guardar búsqueda

**Archivos a modificar**:
- `app/search/page.tsx`
- `app/api/search/route.ts`
- `components/SearchBar.tsx`

---

### 9. Bookmarks/Favoritos
**Prioridad**: MEDIA  
**Tiempo estimado**: 2 días  
**Impacto**: ⭐⭐⭐

**Tareas**:
- [ ] Base de datos
  - [ ] Tabla `bookmarks` (user_id, thread_id, created_at)
  - [ ] Índices

- [ ] API
  - [ ] POST `/api/bookmarks` - Guardar thread
  - [ ] DELETE `/api/bookmarks/[id]` - Eliminar bookmark
  - [ ] GET `/api/bookmarks` - Listar bookmarks del usuario

- [ ] UI
  - [ ] Botón de bookmark en ThreadCard
  - [ ] Botón de bookmark en página de thread
  - [ ] Página `/bookmarks` con lista
  - [ ] Indicador visual de bookmarked
  - [ ] Contador de bookmarks (opcional)

**Archivos a crear**:
- `supabase/migrations/016_bookmarks.sql`
- `app/api/bookmarks/route.ts`
- `app/bookmarks/page.tsx`
- `components/BookmarkButton.tsx`

---

### 10. Seguir Threads (Watch/Subscribe)
**Prioridad**: MEDIA  
**Tiempo estimado**: 2 días  
**Impacto**: ⭐⭐⭐

**Tareas**:
- [ ] Base de datos
  - [ ] Tabla `thread_subscriptions` (user_id, thread_id)
  - [ ] Auto-suscribir al crear thread
  - [ ] Auto-suscribir al comentar (opcional)

- [ ] Notificaciones
  - [ ] Notificar a suscriptores cuando hay nuevo comentario
  - [ ] Configuración de frecuencia (inmediato, diario, semanal)

- [ ] UI
  - [ ] Botón "Seguir thread" / "Dejar de seguir"
  - [ ] Lista de threads seguidos en perfil
  - [ ] Indicador de thread seguido

**Archivos a crear**:
- `supabase/migrations/017_thread_subscriptions.sql`
- `app/api/subscriptions/route.ts`
- `components/SubscribeButton.tsx`

---

## 🎨 FASE 4: Polish y SEO (PRIORIDAD BAJA-MEDIA)

### 11. Imágenes OG Dinámicas
**Prioridad**: MEDIA  
**Tiempo estimado**: 1-2 días  
**Impacto**: ⭐⭐⭐

**Tareas**:
- [ ] Implementar endpoint `/api/og`
  - [ ] Usar `@vercel/og` o `satori`
  - [ ] Template con título, foro, stats
  - [ ] Cache de imágenes generadas

- [ ] Integrar en páginas
  - [ ] Meta tags dinámicos en thread pages
  - [ ] Meta tags dinámicos en forum pages

**Archivos a modificar**:
- `app/api/og/route.ts` (ya existe parcialmente)
- `app/thread/[id]/page.tsx`
- `app/forum/[slug]/page.tsx`

---

### 12. Perfiles de Usuario Mejorados
**Prioridad**: BAJA  
**Tiempo estimado**: 2-3 días  
**Impacto**: ⭐⭐⭐

**Tareas**:
- [ ] Página de perfil completa
  - [ ] Mejorar `/u/[username]` existente
  - [ ] Tabs: Threads, Comentarios, Guardados
  - [ ] Estadísticas: karma, nivel, badges
  - [ ] Gráfico de actividad
  - [ ] Bio y links sociales

- [ ] Avatar personalizado
  - [ ] Upload de avatar
  - [ ] Crop y resize
  - [ ] Generación de avatares default

**Archivos a modificar**:
- `app/u/[username]/page.tsx`
- `app/settings/page.tsx`

---

### 13. Analytics y Métricas
**Prioridad**: BAJA  
**Tiempo estimado**: 2-3 días  
**Impacto**: ⭐⭐

**Tareas**:
- [ ] Tracking de vistas
  - [ ] Tabla `thread_views`
  - [ ] Contador de vistas en threads
  - [ ] Vistas únicas vs totales

- [ ] Dashboard admin
  - [ ] Total threads/comentarios/usuarios
  - [ ] Threads más populares
  - [ ] Usuarios más activos
  - [ ] Gráficos de crecimiento

**Archivos a crear**:
- `app/admin/analytics/page.tsx`
- `supabase/migrations/018_analytics.sql`

---

### 14. Rate Limiting y Anti-Spam
**Prioridad**: ALTA (para producción)  
**Tiempo estimado**: 2 días  
**Impacto**: ⭐⭐⭐⭐

**Tareas**:
- [ ] Rate limiting
  - [ ] Middleware de rate limit
  - [ ] Límites por endpoint
  - [ ] Por IP y por usuario

- [ ] Anti-spam
  - [ ] Límite de posts por minuto
  - [ ] Detección de contenido duplicado
  - [ ] Lista de palabras prohibidas
  - [ ] Karma mínimo para ciertas acciones

**Archivos a crear**:
- `middleware/rateLimit.ts`
- `lib/spam-detection.ts`

---

## 📱 FASE 5: Mobile y PWA (FUTURO)

### 15. Progressive Web App (PWA)
**Prioridad**: BAJA  
**Tiempo estimado**: 2-3 días  

**Tareas**:
- [ ] Service Worker
- [ ] Manifest.json
- [ ] Offline support
- [ ] Push notifications (web)
- [ ] Instalable en móvil

---

## 🧪 FASE 6: Testing y Calidad (IMPORTANTE A LARGO PLAZO)

### 16. Testing
**Prioridad**: BAJA (pero importante)  
**Tiempo estimado**: Continuo  

**Tareas**:
- [ ] Unit tests (Vitest)
- [ ] Integration tests
- [ ] E2E tests (Playwright)
- [ ] CI/CD pipeline

---

## 📊 Resumen de Prioridades

### 🔴 CRÍTICO (Implementar YA)
1. ✅ Sistema de Votos
2. ✅ Notificaciones Persistentes + Realtime

### 🟠 ALTA PRIORIDAD (Próximas 2-3 semanas)
3. ✅ Respuestas Anidadas
4. ✅ Menciones de Usuarios
5. ✅ Imágenes en Posts
6. ✅ Rate Limiting

### 🟡 MEDIA PRIORIDAD (Próximo mes)
7. ✅ Tags/Etiquetas
8. ✅ Búsqueda Avanzada
9. ✅ Bookmarks
10. ✅ Seguir Threads
11. ✅ Markdown Enriquecido
12. ✅ Imágenes OG Dinámicas

### 🟢 BAJA PRIORIDAD (Futuro)
13. ✅ Perfiles Mejorados
14. ✅ Analytics
15. ✅ PWA
16. ✅ Testing

---

## 🎯 Sprint Sugerido (2 semanas)

**Semana 1**:
- [ ] Sistema de Votos (3-4 días)
- [ ] Notificaciones Persistentes (4-5 días)

**Semana 2**:
- [ ] Respuestas Anidadas (3 días)
- [ ] Menciones de Usuarios (2-3 días)

**Resultado**: Comunidad mucho más interactiva y engaging 🚀

---

## 📝 Notas

- Cada feature debe incluir traducciones en ES, EN, PT
- Cada migración debe tener RLS policies
- Cada componente debe ser responsive
- Seguir el sistema de diseño existente (CSS variables)
- Testing manual en cada feature antes de continuar

---

**Última actualización**: 2025-11-26  
**Estado del proyecto**: Feature/Gamification branch  
**Próximo paso**: Implementar Sistema de Votos
