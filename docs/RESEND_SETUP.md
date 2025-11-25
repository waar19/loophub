# Configuración de Resend con Supabase

Esta guía te ayudará a configurar Resend como proveedor SMTP para el envío de correos electrónicos de autenticación en Supabase.

## Paso 1: Crear cuenta en Resend

1. Ve a [resend.com](https://resend.com) y crea una cuenta
2. Verifica tu email
3. Una vez dentro del dashboard, ve a **API Keys**

## Paso 2: Obtener API Key de Resend

1. En el dashboard de Resend, ve a **API Keys**
2. Haz clic en **Create API Key**
3. Dale un nombre (ej: "Supabase Auth")
4. Selecciona los permisos necesarios (al menos `email:send`)
5. Copia el API Key (solo se muestra una vez, guárdalo bien)

## Paso 3: Configurar dominio (Opcional pero Recomendado)

Para producción, es recomendable usar tu propio dominio:

1. En Resend, ve a **Domains**
2. Haz clic en **Add Domain**
3. Ingresa tu dominio (ej: `mail.tudominio.com`)
4. Agrega los registros DNS que Resend te proporciona:
   - Registro SPF
   - Registro DKIM
   - Registro DMARC (opcional)
5. Espera a que Resend verifique el dominio (puede tomar unos minutos)

**Nota**: Para desarrollo/pruebas, puedes usar el dominio de prueba de Resend: `resend.dev`

## Paso 4: Configurar SMTP en Supabase

1. Ve al [Dashboard de Supabase](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a **Authentication** → **Settings** (Configuración)
4. Busca la sección **"SMTP Settings"** o **"Email Provider"**
5. Configura los siguientes valores:

### Configuración SMTP de Resend:

```
SMTP Host: smtp.resend.com
SMTP Port: 465 (SSL) o 587 (TLS)
SMTP User: resend
SMTP Password: [Tu API Key de Resend]
Sender Email: [tu-email@tudominio.com] o [noreply@resend.dev] para pruebas
Sender Name: LoopHub (o el nombre que prefieras)
```

### Detalles de configuración:

- **SMTP Host**: `smtp.resend.com`
- **SMTP Port**: 
  - `465` para SSL (recomendado)
  - `587` para TLS/STARTTLS
- **SMTP User**: `resend`
- **SMTP Password**: Tu API Key de Resend (la que copiaste en el Paso 2)
- **Sender Email**: 
  - Para producción: `noreply@tudominio.com` (usando tu dominio verificado)
  - Para desarrollo: `noreply@resend.dev` (dominio de prueba de Resend)
- **Sender Name**: `LoopHub` (o el nombre que prefieras)

## Paso 5: Habilitar confirmación de email

1. En Supabase, ve a **Authentication** → **Settings**
2. Asegúrate de que **"Enable email confirmations"** esté activado
3. Opcionalmente, personaliza las plantillas de email en **Email Templates**

## Paso 6: Probar la configuración

1. Intenta crear una nueva cuenta en tu aplicación
2. Revisa tu bandeja de entrada (y spam) para el email de confirmación
3. Si usas `resend.dev`, los emails pueden llegar con un pequeño delay

## Variables de entorno (Opcional)

Si quieres usar Resend directamente desde tu aplicación (no solo para Supabase), puedes agregar:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

Pero para autenticación de Supabase, la configuración SMTP es suficiente.

## Troubleshooting

### Los emails no llegan

1. **Revisa la carpeta de spam**: Los emails pueden estar ahí
2. **Verifica la configuración SMTP**: Asegúrate de que los datos sean correctos
3. **Revisa los logs de Resend**: Ve a **Logs** en el dashboard de Resend
4. **Verifica el dominio**: Si usas dominio propio, asegúrate de que esté verificado

### Error "Invalid credentials"

- Verifica que el API Key de Resend sea correcto
- Asegúrate de usar `resend` como usuario SMTP
- Verifica que el API Key tenga permisos de `email:send`

### Emails van a spam

- Configura SPF, DKIM y DMARC correctamente
- Usa un dominio verificado en lugar de `resend.dev`
- Evita palabras spam en el contenido del email

## Límites de Resend

- **Plan gratuito**: 3,000 emails/mes, 100 emails/día
- **Plan Pro**: $20/mes, 50,000 emails/mes

Para más información, visita [resend.com/pricing](https://resend.com/pricing)

## Recursos adicionales

- [Documentación de Resend](https://resend.com/docs)
- [Documentación de Supabase Auth](https://supabase.com/docs/guides/auth)
- [Configuración SMTP de Supabase](https://supabase.com/docs/guides/auth/auth-smtp)

