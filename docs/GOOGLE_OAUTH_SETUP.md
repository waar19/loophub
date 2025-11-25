# Configuración de Login con Google

## Requisitos Previos

1. Una cuenta de Google
2. Acceso al Dashboard de Supabase
3. Acceso a Google Cloud Console

## Paso 1: Crear Proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Ve a **APIs & Services** → **Credentials**
4. Haz clic en **+ CREATE CREDENTIALS** → **OAuth client ID**
5. Si es la primera vez, configura la pantalla de consentimiento OAuth:
   - Tipo de usuario: **External**
   - Nombre de la app: **LoopHub** (o el nombre que prefieras)
   - Email de soporte: Tu email
   - Dominios autorizados: Tu dominio (opcional)
   - Guarda y continúa

## Paso 2: Crear OAuth Client ID

1. Tipo de aplicación: **Web application**
2. Nombre: **LoopHub Web Client** (o el que prefieras)
3. **Authorized JavaScript origins**:
   ```
   https://[tu-proyecto].supabase.co
   http://localhost:3000  (solo para desarrollo)
   ```
4. **Authorized redirect URIs**:
   ```
   https://mpaytwbuhngrdjnfojhq.supabase.co/auth/v1/callback
   http://localhost:3000/auth/callback  (solo para desarrollo)
   https://tu-app.vercel.app/auth/callback  (tu URL de producción en Vercel)
   ```
   ⚠️ **IMPORTANTE**: 
   - Reemplaza `tu-app.vercel.app` con tu URL real de Vercel
   - La URL de Supabase (`mpaytwbuhngrdjnfojhq.supabase.co`) es la que maneja el callback de OAuth

5. Haz clic en **CREATE**
6. **Copia el Client ID y Client Secret** (los necesitarás en el siguiente paso)

## Paso 3: Configurar en Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Ve a **Authentication** → **URL Configuration**
3. Configura las URLs:
   - **Site URL**: `https://tu-app.vercel.app` (tu URL de producción en Vercel)
   - **Redirect URLs**: Agrega estas URLs (una por línea):
     ```
     http://localhost:3000/**
     https://tu-app.vercel.app/**
     ```
4. Ve a **Authentication** → **Providers**
5. Busca **Google** en la lista de proveedores
6. Haz clic en **Google** para expandir la configuración
7. Habilita el toggle **Enable Google provider**
8. Pega el **Client ID** de Google
9. Pega el **Client Secret** de Google
10. Haz clic en **Save**

## Paso 4: Verificar Configuración

1. Ve a tu aplicación en `http://localhost:3000/login`
2. Haz clic en el botón **"Iniciar sesión con Google"**
3. Deberías ser redirigido a Google para autenticarte
4. Después de autenticarte, serás redirigido de vuelta a tu aplicación

## Troubleshooting

### Error: "redirect_uri_mismatch"
- Verifica que las URLs en Google Cloud Console coincidan exactamente con las de Supabase
- Asegúrate de incluir `http://localhost:3000/auth/callback` para desarrollo
- Asegúrate de incluir `https://[tu-proyecto].supabase.co/auth/v1/callback`

### Error: "invalid_client"
- Verifica que el Client ID y Client Secret sean correctos
- Asegúrate de haberlos copiado sin espacios adicionales

### No redirige después del login / Redirige a localhost en producción
- **IMPORTANTE**: Verifica que en Supabase Dashboard → Authentication → URL Configuration:
  - **Site URL** esté configurada con tu URL de producción (ej: `https://tu-app.vercel.app`)
  - **Redirect URLs** incluya `https://tu-app.vercel.app/**`
- Verifica que la ruta `/auth/callback` esté configurada correctamente
- Revisa la consola del navegador para errores
- Asegúrate de que en Google Cloud Console hayas agregado la URL de producción de Vercel

## URLs de Ejemplo

Si tu proyecto de Supabase es `abcdefghijklmnop`, tus URLs serían:

**Google Cloud Console:**
- Authorized redirect URI: `https://abcdefghijklmnop.supabase.co/auth/v1/callback`

**Supabase Dashboard:**
- Site URL: `https://tu-app.vercel.app` (producción)
- Redirect URLs: 
  - `http://localhost:3000/**` (desarrollo)
  - `https://tu-app.vercel.app/**` (producción)

## Notas Importantes

- El código de la aplicación ya está implementado y funcionando
- Solo necesitas configurar las credenciales en Google Cloud Console y Supabase
- Para producción, asegúrate de agregar tu dominio real en las URLs autorizadas
- El callback handler en `/auth/callback` ya está configurado para manejar el flujo OAuth

