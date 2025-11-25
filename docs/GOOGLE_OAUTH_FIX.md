# Solución: Login con Google redirige a localhost en producción

## Problema
Cuando haces login con Google en producción (`https://loophub.vercel.app`), te redirige a `http://localhost:3000/?code=...` en lugar de quedarte en la URL de producción.

## Causa
Supabase está usando la configuración de Site URL en lugar del `redirectTo` que pasamos en el código, o la URL de producción no está en la lista de Redirect URLs permitidas.

## Solución Paso a Paso

### 1. Google Cloud Console ⚠️ CRÍTICO

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto
3. Ve a **APIs & Services** → **Credentials**
4. Edita tu **OAuth 2.0 Client ID**
5. En **"URIs de redireccionamiento autorizados"**, agrega:
   ```
   https://loophub.vercel.app/auth/callback
   ```
6. Debe quedar así (3 URIs en total):
   - `https://mpaytwbuhngrdjnfojhq.supabase.co/auth/v1/callback`
   - `http://localhost:3000/auth/callback`
   - `https://loophub.vercel.app/auth/callback` ← **NUEVA**
7. Guarda los cambios
8. ⏰ Espera 5-10 minutos para que los cambios se apliquen

### 2. Supabase Dashboard ⚠️ CRÍTICO

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a **Authentication** → **URL Configuration**
4. Configura:
   - **Site URL**: `https://loophub.vercel.app`
   - **Redirect URLs** (una por línea):
     ```
     http://localhost:3000/**
     https://loophub.vercel.app/**
     ```
5. Guarda los cambios

### 3. Verificar Configuración

Después de hacer los cambios:

1. Espera 5-10 minutos (Google puede tardar en aplicar cambios)
2. Prueba hacer login con Google en producción
3. Deberías ser redirigido a `https://loophub.vercel.app` después del login

## ¿Por qué pasa esto?

El flujo OAuth funciona así:

1. Usuario en `https://loophub.vercel.app` hace clic en "Login with Google"
2. Código envía `redirectTo: https://loophub.vercel.app/auth/callback` a Supabase
3. Supabase redirige a Google para autenticación
4. Google autentica y redirige a Supabase (`https://mpaytwbuhngrdjnfojhq.supabase.co/auth/v1/callback`)
5. Supabase procesa y redirige a la URL especificada en `redirectTo`

**El problema**: Si la URL de `redirectTo` no está en la lista de Redirect URLs permitidas de Supabase, Supabase usa la Site URL por defecto (que puede estar configurada como `localhost`).

## Checklist Final

- [ ] Google Cloud Console: Agregada `https://loophub.vercel.app/auth/callback`
- [ ] Supabase: Site URL = `https://loophub.vercel.app`
- [ ] Supabase: Redirect URLs incluye `https://loophub.vercel.app/**`
- [ ] Esperado 5-10 minutos después de los cambios
- [ ] Probado en producción

## Notas

- Los cambios en Google Cloud Console pueden tardar hasta 5 minutos en aplicarse
- Los cambios en Supabase son inmediatos
- El código ya está correcto y usa `window.location.origin` automáticamente
- No necesitas cambiar nada en el código, solo la configuración

