# 🚀 Plan de Desarrollo LoopHub

**Última actualización**: 2025-01-27  
**Branch actual**: feature/notification  

---

## 📊 Estado Actual del Proyecto

### ✅ Funcionalidades Completadas

| Área | Estado | Notas |
|------|--------|-------|
| Foros, Threads y Comentarios | ✅ | Sistema completo |
| Autenticación (Email + Google OAuth) | ✅ | Funcionando |
| Sistema de Votos (Upvote/Downvote) | ✅ | Con optimistic UI |
| Sistema de Gamificación | ✅ | Karma, niveles 0-5, permisos |
| Comentarios Anidados | ✅ | Migración 012 aplicada |
| Modo Oscuro | ✅ | Automático + toggle |
| Diseño Responsive | ✅ | Mobile-first |
| SEO Básico | ✅ | Meta tags, sitemap |
| Panel de Administración | ✅ | Básico |
| Sistema de Reportes | ✅ | Completo |
| Internacionalización | ✅ | ES, EN, PT |
| Notificaciones Realtime | ✅ | Completo con preferencias |
| Cambio de Username | ✅ | Una vez gratis |
| Onboarding | ✅ | Flujo completo |
| Menciones @username | ✅ | Con autocomplete |
| Rate Limiting | ✅ | En rutas críticas |
| Sistema de Imágenes | ✅ | Upload y preview |
| Bookmarks/Favoritos | ✅ | Guardar threads |
| Sistema de Tags | ✅ | Etiquetas en threads |
| Suscripciones a Threads | ✅ | Seguir threads |

---

## ✅ FASE 1: COMPLETADA

### 1.1 Sistema de Notificaciones ✅
**Completado**: 2025-01-27

**Logros**:
- [x] Hook `useRealtimeNotifications` funcionando
- [x] Componente `NotificationBell` con dropdown
- [x] Página `/notifications` con filtros (leídas/no leídas)
- [x] Tabla `notification_settings` en Supabase (migración 013)
- [x] UI de preferencias en `/settings`
  - [x] Toggle notificaciones browser
  - [x] Toggle sonido
  - [x] Tipos de notificaciones a recibir
- [x] Animación bounce/ping al recibir nueva notificación
- [x] Soporte para sonido (requiere archivo MP3)
- [x] Notificaciones del navegador (Web Push API)

**Archivos creados**:
- `supabase/migrations/013_notification_settings.sql`
- `components/NotificationSettings.tsx`
- `app/api/notifications/settings/route.ts`

**Archivos modificados**:
- `app/settings/page.tsx`
- `app/notifications/page.tsx`
- `components/NotificationBell.tsx`
- `hooks/useRealtimeNotifications.ts`
- `lib/i18n/translations.ts`

---

### 1.2 Menciones (@username) ✅
**Completado**: 2025-01-27

**Logros**:
- [x] Migración de base de datos (014)
  - [x] Tabla `mentions`
  - [x] Función `process_mentions()` para crear notificaciones
  - [x] Función `search_users_for_mention()`
- [x] API Endpoint GET `/api/users/search?q=`
- [x] Parser de menciones
  - [x] Regex para detectar @username
- [x] Componentes UI
  - [x] `MentionAutocomplete` con navegación por teclado
  - [x] Integración en `MarkdownEditor`
  - [x] Highlight de @username en `MarkdownRenderer`
  - [x] Link a perfil del usuario

**Archivos creados**:
- `supabase/migrations/014_mentions_system.sql`
- `app/api/users/search/route.ts`
- `components/MentionAutocomplete.tsx`

**Archivos modificados**:
- `components/MarkdownEditor.tsx`
- `components/MarkdownRenderer.tsx`

---

### 1.3 Rate Limiting ✅
**Completado**: 2025-01-27

**Logros**:
- [x] Sistema de rate limiting mejorado
  - [x] Por IP y por usuario autenticado
  - [x] Límites configurables por endpoint
- [x] Límites específicos configurados
  - [x] Threads: 5/hora
  - [x] Comentarios: 10/minuto
  - [x] Votos: 60/minuto
  - [x] Búsqueda de usuarios: 30/minuto
  - [x] Auth: 5 intentos/15min
  - [x] Uploads: 10/hora
- [x] Funciones helper `withRateLimit()` y `checkRateLimit()`
- [x] Headers de rate limit en responses
- [x] Aplicado a rutas: votes, threads, user search

**Archivos modificados**:
- `lib/rate-limit.ts` (mejorado con helper functions)
- `app/api/votes/route.ts`
- `app/api/threads/[id]/route.ts`
- `app/api/users/search/route.ts`

---

## ✅ FASE 2: COMPLETADA

### 2.1 Sistema de Imágenes ✅
**Completado**: 2025-01-27

**Logros**:
- [x] Supabase Storage
  - [x] Bucket `avatars` (público)
  - [x] Bucket `post-images` (público)
  - [x] RLS policies para storage
- [x] Hook `useImageUpload`
  - [x] Validación de tipo y tamaño
  - [x] Upload con progress
  - [x] Resize automático (max 1920px)
- [x] API Endpoint POST `/api/uploads`
- [x] Componentes UI
  - [x] Upload en MarkdownEditor (botón de imagen)
  - [x] Preview antes de insertar
- [x] Lazy loading de imágenes (next/image)

**Archivos creados**:
- `supabase/migrations/015_image_storage.sql`
- `app/api/uploads/route.ts`
- `hooks/useImageUpload.ts`

---

### 2.2 Bookmarks/Favoritos ✅
**Completado**: 2025-01-27

**Logros**:
- [x] Base de datos
  - [x] Tabla `bookmarks` (user_id, thread_id)
  - [x] Índices y RLS policies
- [x] API Endpoints
  - [x] POST `/api/bookmarks` - Guardar/eliminar toggle
  - [x] GET `/api/bookmarks` - Listar bookmarks del usuario
- [x] Componentes UI
  - [x] `BookmarkButton.tsx` con animación
  - [x] Integrado en `ThreadCard.tsx`
  - [x] Integrado en página de thread
- [x] Página `/bookmarks`
  - [x] Lista de threads guardados
  - [x] Link en Sidebar y MobileMenu (usuarios logueados)
- [x] Traducciones ES, EN, PT

**Archivos creados**:
- `supabase/migrations/016_bookmarks.sql`
- `app/api/bookmarks/route.ts`
- `app/bookmarks/page.tsx`
- `components/BookmarkButton.tsx`

---

### 2.3 Sistema de Tags/Etiquetas ✅
**Completado**: 2025-01-27

**Logros**:
- [x] Base de datos
  - [x] Tabla `tags` (id, name, slug, color, description)
  - [x] Tabla `thread_tags` (thread_id, tag_id)
  - [x] Índices para búsqueda
- [x] API Endpoints
  - [x] GET `/api/tags` - Listar todos
  - [x] POST - Crear tag (admin)
- [x] Componentes UI
  - [x] `TagSelector.tsx` - Selector con sugerencias
  - [x] `TagBadge.tsx` - Badge de tag con colores
  - [x] Tags en `ThreadCard.tsx`
  - [x] Tags al crear thread
- [x] Traducciones

**Archivos creados**:
- `supabase/migrations/017_tags_system.sql`
- `supabase/seeds/001_initial_tags.sql`
- `app/api/tags/route.ts`
- `components/TagSelector.tsx`
- `components/TagBadge.tsx`

---

### 2.4 Seguir Threads (Watch/Subscribe) ✅
**Completado**: 2025-01-27

**Logros**:
- [x] Base de datos
  - [x] Tabla `thread_subscriptions` (user_id, thread_id)
  - [x] Índices y RLS
- [x] API Endpoints
  - [x] POST `/api/subscriptions` - Suscribir/desuscribir
  - [x] GET - Ver suscripciones
- [x] Componentes UI
  - [x] `SubscribeButton.tsx` con animación
  - [x] Integrado en página de thread
  - [x] Integrado en ThreadCard
- [x] Traducciones ES, EN, PT

**Archivos creados**:
- `supabase/migrations/018_thread_subscriptions.sql`
- `app/api/subscriptions/route.ts`
- `components/SubscribeButton.tsx`

---

## 🟠 FASE 3: EN PROGRESO (Mes 2)

### 3.1 Búsqueda Avanzada ✅
**Completado**: 2025-01-27

**Logros**:
- [x] Full-text search en Supabase
  - [x] Columnas `search_vector` tsvector en threads/comments
  - [x] Índices GIN para búsqueda
  - [x] Triggers para actualizar vectors
  - [x] Función `search_threads_advanced()`
- [x] Filtros de búsqueda
  - [x] Por foro
  - [x] Por fecha (hoy, semana, mes, año, todo)
  - [x] Por autor
  - [x] Por tags
  - [x] Solo threads / Solo comentarios / Solo foros
- [x] Ordenamiento
  - [x] Relevancia
  - [x] Más reciente
  - [x] Más antiguo
  - [x] Más votado
- [x] API actualizada `/api/search`
- [x] UI mejorada
  - [x] `SearchFilters.tsx` - Sidebar de filtros
  - [x] Chips de filtros activos
  - [x] Responsive (drawer en móvil)
- [x] Traducciones ES, EN, PT

**Archivos creados**:
- `supabase/migrations/019_advanced_search.sql`
- `components/SearchFilters.tsx`

**Archivos modificados**:
- `app/api/search/route.ts`
- `app/search/page.tsx`
- `lib/i18n/translations.ts`

---

### 3.2 Imágenes OG Dinámicas
**Tiempo estimado**: 1-2 días  
**Impacto**: ⭐⭐⭐

**Tareas**:
- [ ] Mejorar `/api/og` con `@vercel/og`
- [ ] Template con branding LoopHub
  - [ ] Logo
  - [ ] Título del thread
  - [ ] Nombre del foro
  - [ ] Stats (votos, comentarios)
- [ ] Cache de imágenes generadas
- [ ] Integrar en meta tags de páginas
- [ ] Imágenes para foros y perfiles

**Archivos a modificar**:
- `app/api/og/route.tsx`
- `app/thread/[id]/page.tsx`
- `app/forum/[slug]/page.tsx`

---

### 3.3 Perfiles de Usuario Mejorados
**Tiempo estimado**: 3 días  
**Impacto**: ⭐⭐⭐

**Tareas**:
- [ ] Página de perfil mejorada `/u/[username]`
  - [ ] Tabs: Threads, Comentarios, Guardados
  - [ ] Estadísticas: karma, nivel, fecha registro
  - [ ] Gráfico de actividad (tipo GitHub)
  - [ ] Badges/logros
- [ ] Edición de perfil
  - [ ] Bio (máx 500 caracteres)
  - [ ] Website
  - [ ] Ubicación
  - [ ] Links sociales (Twitter, GitHub, etc.)
- [ ] Avatar personalizado
  - [ ] Upload de imagen
  - [ ] Crop circular
  - [ ] Fallback a iniciales

**Archivos a modificar**:
- `app/u/[username]/page.tsx`
- `app/settings/page.tsx`
- `components/UserProfileCard.tsx` (crear)

---

### 3.4 Markdown Enriquecido
**Tiempo estimado**: 2 días  
**Impacto**: ⭐⭐⭐

**Tareas**:
- [ ] Elementos adicionales en Markdown
  - [ ] Tablas
  - [ ] Listas de tareas (checkboxes)
  - [ ] Spoilers/collapsibles
  - [ ] Callouts (info, warning, tip)
- [ ] Embeds
  - [ ] YouTube
  - [ ] Twitter/X
  - [ ] CodePen
  - [ ] Gists
- [ ] Toolbar de formato
  - [ ] Botones: Bold, Italic, Link, Image, Code
  - [ ] Shortcuts de teclado
- [ ] Preview mejorado
  - [ ] Tabs: Write | Preview
  - [ ] Live preview side-by-side (opcional)

**Archivos a modificar**:
- `components/MarkdownEditor.tsx`
- `components/MarkdownRenderer.tsx`

---

## 🟢 FASE 4: PRIORIDAD BAJA (Mes 3+)

### 4.1 Analytics Dashboard (Admin)
**Tiempo estimado**: 3 días

**Tareas**:
- [ ] Tracking de vistas de threads
- [ ] Dashboard en `/admin/analytics`
  - [ ] Total usuarios, threads, comentarios
  - [ ] Threads más populares
  - [ ] Usuarios más activos
  - [ ] Gráficos de crecimiento
  - [ ] Retención de usuarios
- [ ] Exportar datos (CSV)

---

### 4.2 Progressive Web App (PWA)
**Tiempo estimado**: 2-3 días

**Tareas**:
- [ ] Service Worker
- [ ] `manifest.json`
- [ ] Offline support básico
- [ ] Instalable en móvil
- [ ] Push notifications nativas

---

### 4.3 Sistema de Badges/Logros
**Tiempo estimado**: 2-3 días

**Tareas**:
- [ ] Tabla `badges` y `user_badges`
- [ ] Badges automáticos:
  - [ ] Primer post
  - [ ] 10/50/100 comentarios
  - [ ] 100/500/1000 karma
  - [ ] Cuenta verificada
  - [ ] Primer año en la plataforma
- [ ] Mostrar en perfil

---

### 4.4 Testing
**Tiempo estimado**: Continuo

**Tareas**:
- [ ] Configurar Vitest
- [ ] Unit tests para utils
- [ ] Unit tests para hooks
- [ ] Integration tests para API routes
- [ ] E2E tests con Playwright
- [ ] CI/CD pipeline (GitHub Actions)

---

## 🛠️ Mejoras Técnicas Pendientes

| Mejora | Prioridad | Estado |
|--------|-----------|--------|
| Migrar a Server Actions donde aplique | Media | ⬜ Pendiente |
| Implementar React Query para cache | Media | ⬜ Pendiente |
| Error boundaries globales | Alta | ⬜ Pendiente |
| Logging estructurado (Winston/Pino) | Media | ⬜ Pendiente |
| Monitoreo con Sentry | Alta | ⬜ Pendiente |
| Optimizar bundle size | Baja | ⬜ Pendiente |
| Lazy loading de componentes pesados | Media | ⬜ Pendiente |

---

## 💡 Ideas Futuras (Backlog)

- [ ] Encuestas en Threads (nivel 3+)
- [ ] Modo Wiki - Threads editables por comunidad
- [ ] Digest semanal por email
- [ ] API pública para integraciones
- [ ] Dark mode scheduling (por hora)
- [ ] Keyboard shortcuts globales
- [ ] Draft autosave en localStorage
- [ ] Exportar datos personales (GDPR)
- [ ] Modo lectura sin distracciones
- [ ] Hilos destacados (sticky threads)
- [ ] Moderadores por foro
- [ ] Webhooks para eventos

---

## 📝 Notas de Desarrollo

- Cada feature debe incluir traducciones en ES, EN, PT
- Cada migración debe tener RLS policies
- Cada componente debe ser responsive
- Seguir el sistema de diseño existente (CSS variables)
- Testing manual antes de merge
- Commits descriptivos en inglés
- PRs con descripción detallada

---

## 📅 Historial de Cambios

| Fecha | Cambio |
|-------|--------|
| 2025-11-27 | Plan reorganizado y actualizado |
| 2025-11-26 | Sistema de votos completado |
| 2025-11-26 | Notificaciones realtime (parcial) |
| 2025-11-26 | Comentarios anidados (migración) |

---

**Próximo paso sugerido**: Completar sistema de notificaciones (1.1)
