# Instrucciones para Poblar la Base de Datos

Esta guía te ayudará a poblar la base de datos con los foros, hilos y comentarios iniciales de Minimalist Hub.

## Paso 1: Ejecutar Migraciones

En el SQL Editor de Supabase, ejecuta las migraciones en orden:

1. `001_initial_schema.sql` - Crea las tablas base
2. `002_add_authentication.sql` - Agrega autenticación y perfiles
3. `003_add_moderation.sql` - Agrega sistema de reportes
4. `004_seed_minimalist_forums.sql` - Crea los 5 foros iniciales

## Paso 2: Crear un Usuario de Prueba

Antes de ejecutar el seed script, necesitas tener al menos un usuario en Supabase:

1. Ve a tu aplicación y crea una cuenta
2. O usa el dashboard de Supabase para crear un usuario manualmente

## Paso 3: Configurar Service Role Key

El script de seed necesita el Service Role Key de Supabase:

1. Ve a **Project Settings** → **API**
2. Copia el **service_role** key (⚠️ Mantén esto secreto, nunca lo expongas en el cliente)
3. Agrégalo a tu `.env.local`:

```env
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

## Paso 4: Ejecutar el Seed Script

```bash
npx tsx scripts/seed-initial-content.ts
```

El script creará:
- ✅ 15 hilos iniciales distribuidos entre los foros
- ✅ Comentarios para cada hilo (2-3 comentarios por hilo)
- ✅ Fechas realistas (últimos 7 días)

## Contenido del Seed

### Hilos Incluidos:

**Minimalismo Digital:**
- Cómo limpiar el almacenamiento del celular sin sufrimiento
- Backups sin drama: guía de 10 minutos
- Cómo reducir notificaciones sin perder lo importante

**Organización Personal:**
- Mi sistema PARA simplificado
- La rutina de organización semanal que sí funciona
- Zettelkasten para principiantes: mi método simple

**Productividad Inteligente:**
- GTD sin la complejidad: mi versión práctica
- La técnica Pomodoro funciona, pero no como piensas
- Time blocking sin obsesionarse: mi método

**Apps y Herramientas:**
- ¿Vale la pena pagar Notion AI?
- Obsidian vs Notion: ¿Cuál para organización personal?
- Google Workspace vs iCloud: ¿Cuál elegir?
- Todoist vs Things 3: ¿Cuál es mejor?

**Workflows & Setup:**
- Mi setup minimalista: MacBook + iPhone + iPad
- Automatizaciones simples que realmente uso

## Verificar el Seed

Después de ejecutar el script, deberías ver:

```
✅ Seed completed!
📊 Statistics:
   - Threads created: 15
   - Comments created: ~40
```

## Troubleshooting

### Error: "No users found"
- Crea al menos un usuario antes de ejecutar el seed
- El script necesita un `user_id` para asociar los hilos y comentarios

### Error: "Missing environment variables"
- Verifica que `.env.local` tenga `SUPABASE_SERVICE_ROLE_KEY`
- Asegúrate de usar el Service Role Key, no el Anon Key

### Error: "Forum not found"
- Ejecuta primero la migración `004_seed_minimalist_forums.sql`
- Verifica que los slugs de los foros coincidan

## Notas

- El script es idempotente: puedes ejecutarlo múltiples veces
- Los hilos se crearán con fechas aleatorias en los últimos 7 días
- Los comentarios se asociarán al primer usuario encontrado en Supabase
- En producción, considera crear usuarios específicos para contenido inicial

