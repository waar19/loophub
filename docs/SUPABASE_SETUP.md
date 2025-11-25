# Configuración de Supabase

## Deshabilitar Confirmación de Email (Para Desarrollo)

Si no tienes SMTP configurado y quieres permitir que los usuarios inicien sesión sin confirmar su email, puedes deshabilitar esta función en el dashboard de Supabase:

### Pasos:

1. Ve al [Dashboard de Supabase](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a **Authentication** → **Settings** (o **Configuración**)
4. Busca la sección **"Email Auth"** o **"Email Authentication"**
5. Desactiva la opción **"Enable email confirmations"** o **"Confirm email"**
6. Guarda los cambios

### Alternativa: Usar Supabase CLI

Si prefieres usar la CLI, puedes ejecutar:

```bash
supabase auth settings update --enable-signup=false
```

O modificar directamente en el dashboard bajo **Authentication** → **Policies**.

## Configurar SMTP (Para Producción)

Para producción, es recomendable configurar SMTP para enviar emails de confirmación.

### Opción Recomendada: Resend

**Ver guía completa**: [RESEND_SETUP.md](./RESEND_SETUP.md)

Resumen rápido:
1. Crea cuenta en [resend.com](https://resend.com)
2. Obtén tu API Key
3. Configura SMTP en Supabase con:
   - Host: `smtp.resend.com`
   - Port: `465` (SSL) o `587` (TLS)
   - User: `resend`
   - Password: Tu API Key de Resend

### Otros Proveedores SMTP:

- **SendGrid**
- **Mailgun**
- **Amazon SES**
- **Gmail** (solo para desarrollo, no recomendado para producción)

## Nota

En desarrollo, deshabilitar la confirmación de email es la opción más rápida. Para producción, configura SMTP adecuadamente. **Recomendamos usar Resend** por su facilidad de uso y excelente integración con Next.js.

