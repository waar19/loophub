# Sistema de Cambio de Username - Una Sola Vez

## 📋 Resumen

Se ha implementado un sistema que permite a los usuarios cambiar su **nombre de usuario una sola vez de forma gratuita** después de la creación de su cuenta. Los cambios futuros podrán requerir karma o pago.

## 🎯 Características

### 1. **Cambio Único Gratuito**
- Los usuarios pueden cambiar su username **solo una vez** sin costo
- Después del cambio, el campo `can_change_username` se establece en `false`
- Se guarda el username anterior en `previous_username`
- Se registra la fecha del cambio en `username_changed_at`

### 2. **Historial de Cambios (Auditoría)**
- Nueva tabla `username_history` que registra todos los cambios
- Incluye: username anterior, nuevo username, fecha, y razón del cambio
- Razones: `initial_setup` (primer username) o `one_time_change` (cambio único)
- Permite auditoría para moderación y seguridad

### 3. **Validación en Tiempo Real**
- Verifica longitud (3-30 caracteres)
- Solo permite letras, números y guiones bajos
- Comprueba disponibilidad en tiempo real con debounce de 500ms
- Feedback visual instantáneo (✓ disponible, ✗ no disponible)

### 4. **Confirmación de Cambio**
- Doble confirmación para evitar cambios accidentales
- Advertencia clara sobre la naturaleza permanente del cambio
- UI con diseño de advertencia (colores y bordes destacados)

## 📁 Archivos Creados/Modificados

### Migración de Base de Datos
**`supabase/migrations/009_username_change_system.sql`**
- Agrega columnas: `username_changed_at`, `can_change_username`, `previous_username`
- Crea tabla `username_history` para auditoría
- Función `change_username()` para manejar lógica de cambio
- Políticas RLS para seguridad
- Usuarios existentes reciben `can_change_username = true`

### API Endpoints
**`app/api/username/change/route.ts`** (NUEVO)
- POST endpoint para cambiar username
- Llama a la función `change_username()` de la DB
- Validaciones y manejo de errores

**`app/api/username/set/route.ts`** (MODIFICADO)
- Actualizado para usar la función `change_username()`
- Mantiene compatibilidad con el onboarding

### Componentes
**`components/UsernameChange.tsx`** (NUEVO)
- Componente principal para cambiar username
- Muestra información diferente según `can_change_username`:
  - **Puede cambiar**: Formulario con validación en tiempo real
  - **No puede cambiar**: Mensaje informativo sobre límite alcanzado
- Validación de formato
- Confirmación de dos pasos
- Integración completa con traducciones

**`app/settings/page.tsx`** (MODIFICADO)
- Integra el componente `UsernameChange` en la sidebar
- Carga `can_change_username` desde la API de perfil
- Actualiza el estado local después del cambio

### Traducciones
**`lib/i18n/translations.ts`** (MODIFICADO)
- Nuevas traducciones en **3 idiomas** (ES, EN, PT):
  - `settings.changeUsername`
  - `settings.currentUsername`
  - `settings.newUsername`
  - `settings.usernameChangeLimit`
  - `settings.usernameChangeFuture`
  - `settings.usernameChangeOnce`
  - `settings.usernameChangeWarning`
  - `settings.confirmChange`
  - `settings.confirmChangeText`
  - `settings.toUsername`
  - `settings.confirmChangeWarning`
  - `settings.confirmButton`
  - `settings.changing`
  - `settings.usernameChanged`
  - `onboarding.usernameTaken`
  - `onboarding.usernameCheckError`

## 🔄 Flujo de Usuario

### Primera Vez (Onboarding)
1. Usuario se registra → redirect a `/onboarding`
2. Elige username por primera vez
3. Se registra en `username_history` con `reason: 'initial_setup'`
4. `can_change_username` se establece en `true`

### Cambio Único
1. Usuario va a `/settings`
2. Ve el componente `UsernameChange` con el formulario
3. Ingresa nuevo username → validación en tiempo real
4. Click "Continuar" → pantalla de confirmación
5. Confirma cambio → llamada a API
6. `change_username()` actualiza:
   - `previous_username` = username actual
   - `username` = nuevo username
   - `username_changed_at` = NOW()
   - `can_change_username` = false ⚠️
7. Se registra en `username_history` con `reason: 'one_time_change'`
8. Toast de éxito y actualización de UI

### Después del Cambio
1. Usuario ya no puede cambiar username gratuitamente
2. Ve mensaje informativo sobre límite alcanzado
3. Mensaje sugiere futura posibilidad con karma/pago

## 🔒 Seguridad

### Row Level Security (RLS)
- **username_history**: Los usuarios solo pueden ver su propio historial
- **Admins**: Pueden ver todo el historial para moderación
- **Función change_username**: Usa `SECURITY DEFINER` para control total

### Validaciones
- **Backend**: Validación en función SQL
- **Frontend**: Validación en tiempo real antes de enviar
- **Unicidad**: Constraint e índice único en la DB
- **Formato**: Expresión regular estricta

### Auditoría
- Todos los cambios quedan registrados
- Timestamp de cada cambio
- Username anterior guardado
- Razón del cambio documentada

## 🚀 Próximos Pasos (Futuro)

### Monetización/Gamificación
Para permitir cambios adicionales, se podría:

1. **Opción 1: Karma**
   - Costo: 500-1000 karma
   - Cooldown: 30-90 días entre cambios
   - Límite: 1 cambio por año

2. **Opción 2: Pago**
   - Costo: $5-10 USD
   - Sin límite de cambios
   - Integrar Stripe/otro procesador

3. **Opción 3: Híbrido**
   - Primer cambio adicional: 1000 karma
   - Siguientes cambios: Pago

### Implementación Futura
Modificar función `change_username()` para:
```sql
-- Verificar si tiene karma suficiente
IF karma_balance < 1000 THEN
  RETURN json_build_object('error', 'Insufficient karma');
END IF;

-- Descontar karma
UPDATE profiles SET karma = karma - 1000 WHERE id = current_user_id;

-- Permitir cambio
UPDATE profiles SET 
  username = new_username,
  can_change_username = true -- Permitir futuros cambios pagados
WHERE id = current_user_id;
```

## 📊 Estructura de Base de Datos

### Columnas en `profiles`
```sql
username_changed_at    TIMESTAMPTZ  -- Fecha del último cambio
can_change_username    BOOLEAN      -- ¿Puede cambiar gratis?
previous_username      TEXT         -- Username anterior
```

### Tabla `username_history`
```sql
id             UUID PRIMARY KEY
user_id        UUID REFERENCES profiles(id)
old_username   TEXT
new_username   TEXT NOT NULL
changed_at     TIMESTAMPTZ DEFAULT NOW()
reason         TEXT  -- 'initial_setup', 'one_time_change', 'karma_purchase', etc.
```

## ✅ Testing

Para probar el sistema:

1. **Ejecutar la migración**:
   ```sql
   -- En Supabase Dashboard → SQL Editor
   -- Copiar y ejecutar: supabase/migrations/009_username_change_system.sql
   ```

2. **Crear usuario nuevo**:
   - Registrarse → debería ver onboarding
   - Elegir username inicial

3. **Verificar cambio único**:
   - Ir a `/settings`
   - Ver componente de cambio de username
   - Intentar cambiar username
   - Verificar que después del cambio, el botón desaparece

4. **Verificar historial** (como admin):
   ```sql
   SELECT * FROM username_history ORDER BY changed_at DESC;
   ```

## 🎨 UI/UX

### Estados Visuales
- **Disponible para cambio**: Formulario con validación en vivo
- **No disponible**: Card informativo con gradiente azul
- **Validando**: Spinner de "Verificando disponibilidad"
- **Disponible**: ✓ verde
- **No disponible**: ✗ rojo
- **Confirmación**: Modal de advertencia con bordes rojos

### Responsive
- Mobile-first design
- Funciona perfectamente en todos los tamaños de pantalla
- Integrado en la sidebar de settings (mobile: orden superior)

## 📝 Notas Importantes

⚠️ **EJECUTAR MIGRACIÓN 009**: Antes de usar esta funcionalidad, debes ejecutar `supabase/migrations/009_username_change_system.sql` en tu base de datos.

✅ **Build exitoso**: El sistema está completamente implementado y el build pasa sin errores.

🌍 **Multiidioma**: Todas las traducciones están completas en español, inglés y portugués.

🔐 **Seguridad**: RLS habilitado, validaciones dobles (frontend + backend).
