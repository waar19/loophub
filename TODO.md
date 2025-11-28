# 🚀 Plan de Desarrollo LoopHub

**Última actualización**: 2025-11-28  
**Branch actual**: main  
**Fases Completadas**: 1, 2, 3, 4, 5

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
| Panel de Administración | ✅ | Con Analytics + Gestión Foros |
| Sistema de Reportes | ✅ | Completo |
| Internacionalización | ✅ | ES, EN, PT (cookie sync) |
| Notificaciones Realtime | ✅ | Completo con preferencias |
| Cambio de Username | ✅ | Una vez gratis |
| Onboarding | ✅ | Flujo completo |
| Menciones @username | ✅ | Con autocomplete |
| Rate Limiting | ✅ | En rutas críticas |
| Sistema de Imágenes | ✅ | Upload y preview |
| Bookmarks/Favoritos | ✅ | Guardar threads |
| Sistema de Tags | ✅ | Etiquetas en threads |
| Suscripciones a Threads | ✅ | Seguir threads |
| Búsqueda Avanzada | ✅ | Filtros múltiples |
| OG Images Dinámicas | ✅ | Thread, Forum, Profile |
| Perfiles Mejorados | ✅ | Tabs, activity graph, badges |
| Markdown Enriquecido | ✅ | Toolbar, spoilers, tablas |
| Analytics Dashboard | ✅ | Métricas, gráficos, export |
| PWA | ✅ | Instalable, offline support |
| Sistema de Badges | ✅ | 19 badges automáticos |
| Testing Setup | ✅ | Vitest configurado |
| Error Boundaries | ✅ | Global error handling |
| Gestión de Foros | ✅ | CRUD en admin |
| Moderadores por Foro | ✅ | Permisos granulares |

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

## ✅ FASE 3: COMPLETADA (Mes 2)

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

### 3.2 Imágenes OG Dinámicas ✅
**Completado**: 2025-01-27

**Logros**:
- [x] Mejorar `/api/og` con `@vercel/og`
- [x] 4 Templates dinámicos
  - [x] Thread: título, foro, votos, comentarios
  - [x] Forum: nombre, descripción, cantidad de threads
  - [x] Profile: avatar, username, nivel, karma, stats
  - [x] Default: branding LoopHub
- [x] Cache de imágenes (1 semana)
- [x] Integrar en meta tags
  - [x] Threads con ogParams
  - [x] Foros con ogParams
  - [x] Perfiles con generateMetadata
- [x] Diseño dark mode con gradientes

**Archivos modificados**:
- `app/api/og/route.tsx` - Reescrito completamente
- `components/MetaHead.tsx` - Añadido ogParams prop
- `app/thread/[id]/page.tsx`
- `app/forum/[slug]/page.tsx`
- `app/u/[username]/page.tsx`

---

### 3.3 Perfiles de Usuario Mejorados ✅
**Completado**: 2025-01-27

**Logros**:
- [x] Página de perfil mejorada `/u/[username]`
  - [x] Tabs: Threads, Comentarios, Guardados (solo propio)
  - [x] Estadísticas: karma, nivel, fecha registro
  - [x] Gráfico de actividad estilo GitHub (52 semanas)
  - [x] Sección de badges/logros
  - [x] Stats cards con iconos
- [x] Información del perfil
  - [x] Bio con estilo
  - [x] Website link
  - [x] Ubicación
  - [x] Links sociales (Twitter, GitHub)
- [x] Avatar con gradiente según nivel
- [x] OG Image dinámico para compartir perfil
- [x] Componente ProfileContent como client component

**Archivos creados**:
- `app/u/[username]/ProfileContent.tsx`

**Archivos modificados**:
- `app/u/[username]/page.tsx` - Refactorizado completamente

---

### 3.4 Markdown Enriquecido ✅
**Completado**: 2025-01-27

**Logros**:
- [x] Barra de herramientas de formato completa
  - [x] Negrita, Cursiva, Tachado
  - [x] Encabezados H1, H2, H3
  - [x] Listas: viñetas, numeradas, tareas
  - [x] Enlace, Imagen
  - [x] Código inline y bloque
  - [x] Cita, Tabla, Spoiler
  - [x] Línea horizontal
  - [x] Mención @
- [x] Shortcuts de teclado
  - [x] Ctrl+B: Negrita
  - [x] Ctrl+I: Cursiva
  - [x] Ctrl+K: Enlace
  - [x] Ctrl+Shift+X: Tachado
- [x] Elementos adicionales en MarkdownRenderer
  - [x] Tablas con estilos
  - [x] Task lists (checkboxes)
  - [x] Spoilers/collapsibles (details/summary)
  - [x] Blockquotes mejorados
  - [x] Code blocks con badge de lenguaje
  - [x] Imágenes con lazy loading

**Archivos modificados**:
- `components/MarkdownEditor.tsx` - Toolbar completo
- `components/MarkdownRenderer.tsx` - Nuevos elementos

---

## ✅ FASE 4: COMPLETADA

### 4.1 Analytics Dashboard (Admin) ✅
**Completado**: 2025-11-27

**Logros**:
- [x] Tracking de vistas de threads (tabla thread_views)
- [x] Dashboard en `/admin/analytics`
  - [x] Total usuarios, threads, comentarios
  - [x] Threads más populares
  - [x] Usuarios más activos
  - [x] Gráficos de crecimiento
  - [x] Actividad reciente
- [x] Exportar datos (CSV)
- [x] Métricas diarias agregadas

**Archivos creados**:
- `supabase/migrations/020_analytics_system.sql`
- `app/admin/analytics/page.tsx`
- `app/admin/analytics/AnalyticsContent.tsx`
- `app/api/views/route.ts`
- `hooks/useViewTracking.ts`

---

### 4.2 Progressive Web App (PWA) ✅
**Completado**: 2025-11-27

**Logros**:
- [x] Service Worker (`public/sw.js`)
- [x] `manifest.json`
- [x] Offline support básico
- [x] Instalable en móvil
- [x] Push notifications nativas
- [x] Página offline (`/offline`)

**Archivos creados**:
- `public/manifest.json`
- `public/sw.js`
- `app/offline/page.tsx`
- `hooks/usePWA.ts`
- `components/PWAInstallPrompt.tsx`

---

### 4.3 Sistema de Badges/Logros ✅
**Completado**: 2025-11-27

**Logros**:
- [x] Tabla `badges` y `user_badges`
- [x] 19 badges automáticos:
  - [x] Primer post, Storyteller, Prolific Writer, Content Creator
  - [x] First Comment, Conversationalist, Discussion Master, Community Pillar
  - [x] Rising Star, Popular, Influential, Legend (karma)
  - [x] Newcomer, Regular, Veteran (tiempo)
  - [x] Verified, Early Adopter, Bug Hunter, Supporter (especiales)
- [x] Función `check_and_award_badges` en DB
- [x] API `/api/badges`
- [x] Componente `BadgeDisplay`

**Archivos creados**:
- `app/api/badges/route.ts`
- `hooks/useBadges.ts`
- `components/BadgeDisplay.tsx`

---

### 4.4 Testing ✅
**Completado**: 2025-11-27

**Logros**:
- [x] Configurar Vitest
- [x] Setup file con mocks
- [x] Unit tests para validations
- [x] Unit tests para url-helpers
- [x] Scripts de test en package.json

**Archivos creados**:
- `vitest.config.ts`
- `test/setup.ts`
- `test/lib/validations.test.ts`
- `test/lib/url-helpers.test.ts`

---

### 4.5 Error Boundaries ✅
**Completado**: 2025-11-27

**Logros**:
- [x] ErrorBoundary component
- [x] Global error page (`app/error.tsx`)
- [x] Not found page (`app/not-found.tsx`)
- [x] AsyncBoundary para loading states

**Archivos creados**:
- `components/ErrorBoundary.tsx`
- `app/error.tsx`
- `app/not-found.tsx`

---

## ✅ Mejoras Técnicas Completadas

### React Query para Cache ✅
**Completado**: 2025-11-27

**Logros**:
- [x] Instalar @tanstack/react-query
- [x] QueryProvider integrado en layout
- [x] Query client con configuración optimizada
- [x] Query keys centralizados
- [x] Hooks implementados:
  - [x] `useThreadsQuery` - CRUD threads con cache
  - [x] `useNotificationsQuery` - Notificaciones con invalidación
  - [x] `useBookmarksQuery` - Bookmarks con optimistic updates
  - [x] `useSearchQuery` - Búsqueda con debounce e infinite scroll
- [x] React Query DevTools (solo dev)

**Archivos creados**:
- `lib/query-provider.tsx`
- `lib/query-client.ts`
- `hooks/useThreadsQuery.ts`
- `hooks/useNotificationsQuery.ts`
- `hooks/useBookmarksQuery.ts`
- `hooks/useSearchQuery.ts`

---

### Lazy Loading de Componentes ✅
**Completado**: 2025-11-27

**Logros**:
- [x] Componentes lazy exportados centralizados
  - [x] MarkdownEditor (SSR disabled)
  - [x] MarkdownRenderer
  - [x] CommentThread
  - [x] LinkPreview
  - [x] TrendingPanel
  - [x] BadgeDisplay
  - [x] ShareButtons
  - [x] KarmaProgress
  - [x] InfiniteScroll
  - [x] SearchBar
  - [x] ThreadSortFilter
  - [x] MobileMenu/MobileThreadSidebar
  - [x] PWAInstallPrompt
  - [x] NotificationBell
  - [x] ToastContainer
- [x] Loading fallbacks con skeleton
- [x] Hook `usePrefetch` para prefetch inteligente
  - [x] Prefetch en hover con delay
  - [x] Prefetch on visible (Intersection Observer)
  - [x] Prefetch de rutas críticas
  - [x] Prefetch de threads relacionados
- [x] Componente `OptimizedImage`
  - [x] Lazy loading nativo
  - [x] Blur placeholder
  - [x] Fallback en error
  - [x] Avatar optimizado con iniciales

**Archivos creados**:
- `lib/lazy-components.ts`
- `hooks/usePrefetch.ts`
- `components/OptimizedImage.tsx`

---

## ✅ FASE 5: MODERACIÓN Y UX - COMPLETADA

### 5.1 Gestión de Foros ✅
**Completado**: 2025-11-28

**Logros**:
- [x] Página `/admin/forums` para gestionar foros
- [x] CRUD completo de foros (crear, editar, eliminar)
- [x] Validación: no eliminar foros con threads
- [x] Auto-generación de slug desde nombre
- [x] Contador de threads por foro
- [x] API endpoints:
  - [x] GET/POST `/api/admin/forums`
  - [x] GET/PUT/DELETE `/api/admin/forums/[id]`

**Archivos creados**:
- `app/admin/forums/page.tsx`
- `app/admin/forums/ForumManager.tsx`
- `app/api/admin/forums/route.ts`
- `app/api/admin/forums/[id]/route.ts`

---

### 5.2 Moderadores por Foro ✅
**Completado**: 2025-11-28

**Logros**:
- [x] Página `/admin/moderators` para gestionar moderadores
- [x] Asignar/remover moderadores por foro
- [x] Permisos granulares por moderador:
  - [x] Eliminar threads
  - [x] Eliminar comentarios
  - [x] Ocultar contenido
  - [x] Anclar threads
  - [x] Bloquear threads
  - [x] Gestionar reportes
- [x] Vista agrupada por foro
- [x] Server Actions para operaciones

**Archivos creados**:
- `app/admin/moderators/page.tsx`
- `app/admin/moderators/ModeratorManager.tsx`
- `lib/actions/moderation.ts`

---

### 5.3 Mejoras de UX ✅
**Completado**: 2025-11-28

**Logros**:
- [x] Menciones en CommentCard (respuestas inline)
- [x] Padding corregido en formularios (new thread, signup, onboarding)
- [x] Layout de admin corregido (sidebar overlap)
- [x] Padding en cards de admin (reportes, analytics, moderators)
- [x] Loading state de Analytics con skeleton apropiado
- [x] Botón "Volver al Admin" en todas las subpáginas

---

### 5.4 Traducciones Admin ✅
**Completado**: 2025-11-28

**Logros**:
- [x] Traducciones ES, EN, PT para gestión de foros
- [x] Traducciones ES, EN, PT para moderadores
- [x] Sincronización de idioma con cookie para SSR
- [x] Metadata del sitio en inglés (título, descripción, SEO)

**Archivos modificados**:
- `lib/i18n/translations.ts` - Añadidas 40+ claves de admin
- `components/TranslationsProvider.tsx` - Cookie sync
- `app/layout.tsx` - Metadata en inglés

---

## 🚀 FASE 6: INFRAESTRUCTURA Y CALIDAD

### 6.1 CI/CD Pipeline
**Prioridad**: Alta | **Estimación**: 4-6 horas

**Tareas**:
- [ ] GitHub Actions workflow para:
  - [ ] Lint y type check en PRs
  - [ ] Tests unitarios automáticos
  - [ ] Build de verificación
  - [ ] Deploy automático a Vercel (preview y production)
- [ ] Branch protection rules
- [ ] Notificaciones de fallos

**Archivos a crear**:
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`

---

### 6.2 Monitoreo con Sentry
**Prioridad**: Alta | **Estimación**: 2-3 horas

**Tareas**:
- [ ] Instalar @sentry/nextjs
- [ ] Configurar Sentry DSN
- [ ] Error tracking en cliente y servidor
- [ ] Source maps para debugging
- [ ] Performance monitoring
- [ ] Alertas configuradas

**Archivos a crear**:
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`

---

### 6.3 E2E Tests con Playwright
**Prioridad**: Media | **Estimación**: 6-8 horas

**Tareas**:
- [ ] Configurar Playwright
- [ ] Tests críticos:
  - [ ] Login/Signup flow
  - [ ] Crear thread
  - [ ] Comentar
  - [ ] Votar
  - [ ] Buscar
- [ ] CI integration
- [ ] Visual regression tests (opcional)

**Archivos a crear**:
- `playwright.config.ts`
- `e2e/auth.spec.ts`
- `e2e/threads.spec.ts`
- `e2e/comments.spec.ts`

---

## 🎯 FASE 7: FUNCIONALIDADES AVANZADAS

### 7.1 Hilos Destacados (Sticky Threads)
**Prioridad**: Media | **Estimación**: 3-4 horas

**Tareas**:
- [ ] Campo `is_pinned` en threads
- [ ] UI para admins/mods para anclar
- [ ] Mostrar primero en listados
- [ ] Límite de pins por foro (ej: 3)
- [ ] Traducciones

---

### 7.2 Digest Semanal por Email
**Prioridad**: Media | **Estimación**: 4-6 horas

**Tareas**:
- [ ] Template de email con Resend
- [ ] Cron job semanal (Vercel)
- [ ] Preferencia de usuario para recibir
- [ ] Contenido: top threads, actividad, badges ganados
- [ ] Botón de unsuscribe

---

### 7.3 Encuestas en Threads
**Prioridad**: Baja | **Estimación**: 6-8 horas

**Tareas**:
- [ ] Tabla `polls` y `poll_votes`
- [ ] UI para crear encuesta al hacer thread (nivel 3+)
- [ ] Máximo 4 opciones
- [ ] Mostrar resultados en tiempo real
- [ ] Un voto por usuario

---

### 7.4 Keyboard Shortcuts Globales
**Prioridad**: Baja | **Estimación**: 2-3 horas

**Tareas**:
- [ ] Hook `useKeyboardShortcuts`
- [ ] Shortcuts:
  - [ ] `g h` - Go Home
  - [ ] `g n` - Go Notifications
  - [ ] `g b` - Go Bookmarks
  - [ ] `n` - New Thread (si está en foro)
  - [ ] `/` - Focus search
  - [ ] `?` - Mostrar ayuda
- [ ] Modal de ayuda con lista de shortcuts

---

### 7.5 Draft Autosave
**Prioridad**: Media | **Estimación**: 2-3 horas

**Tareas**:
- [ ] Guardar borrador en localStorage cada 30s
- [ ] Key por foro/thread
- [ ] Restaurar al cargar página
- [ ] UI para descartar borrador
- [ ] Limpiar al publicar exitosamente

---

## 🛠️ Mejoras Técnicas Pendientes

| Mejora | Prioridad | Estado |
|--------|-----------|--------|
| Migrar a Server Actions donde aplique | Media | ⬜ Pendiente |
| Logging estructurado (Winston/Pino) | Baja | ⬜ Pendiente |
| Optimizar bundle size | Baja | ⬜ Pendiente |

---

## 💡 Ideas Futuras (Backlog)

- [ ] Modo Wiki - Threads editables por comunidad
- [ ] API pública para integraciones
- [ ] Dark mode scheduling (por hora)
- [ ] Exportar datos personales (GDPR)
- [ ] Modo lectura sin distracciones
- [ ] Webhooks para eventos
- [ ] Sistema de recompensas (achievements avanzados)
- [ ] Threads programados (scheduled posts)
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
| 2025-11-28 | Fase 5 completada: Gestión foros, moderadores, UX, traducciones |
| 2025-11-28 | Plan reorganizado con Fases 6 y 7 |
| 2025-11-27 | Plan reorganizado y actualizado |
| 2025-11-26 | Sistema de votos completado |
| 2025-11-26 | Notificaciones realtime (parcial) |
| 2025-11-26 | Comentarios anidados (migración) |

---

**Próximo paso sugerido**: Fase 6.1 - CI/CD Pipeline con GitHub Actions
